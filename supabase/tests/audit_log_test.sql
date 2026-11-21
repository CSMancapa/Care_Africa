-- =====================================================================
-- Care Africa — tests for 0009 (audit log)
-- =====================================================================
--   psql "$DATABASE_URL" -f supabase/tests/audit_log_test.sql
-- Seeds data, asserts, then rolls back.
-- =====================================================================

begin;

grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
-- (Supabase grants table rights broadly too; the log is protected by its
-- own revokes, policies and triggers, re-applied here after the grant.)
revoke insert, update, delete, truncate on audit_log from authenticated;

create or replace function _assert(label text, actual text, expected text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL  %  got[%] want[%]', label, actual, expected;
  end if;
  raise notice 'pass  %', label;
end $$;

create or replace function _as(actor uuid, aal text default 'aal2') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', actor::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', actor, 'aal', aal)::text, true);
  perform set_config('request.headers', '{"x-forwarded-for":"196.25.1.10, 10.0.0.1","user-agent":"TestBrowser/1.0"}', true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function _done() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

create or replace function _try(actor uuid, q text, aal text default 'aal2')
returns text language plpgsql as $$
begin
  perform _as(actor, aal);
  execute q;
  perform _done();
  return 'ok';
exception when others then
  perform _done();
  return sqlerrm;
end $$;

create or replace function _read(actor uuid, q text, aal text default 'aal2')
returns text language plpgsql as $$
declare out text;
begin
  perform _as(actor, aal);
  execute q into out;
  perform _done();
  return coalesce(out, '');
exception when others then
  perform _done();
  return 'ERROR: ' || sqlerrm;
end $$;

-- a1 owner (admin), s1 front desk, o1 owner of another practice
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@seaview.test', '{"practice_name":"Seaview","full_name":"Olwethu Owner"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'desk@seaview.test',  '{"full_name":"Fikile Desk"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'owner@other.test',   '{"practice_name":"Other"}');
select set_config('t.p', (select practice_id::text from practice_members where profile_id = '00000000-0000-0000-0000-0000000000a1'), false);
select set_config('t.o', (select practice_id::text from practice_members where profile_id = '00000000-0000-0000-0000-0000000000c1'), false);
insert into practice_members (practice_id, profile_id, role)
  values (current_setting('t.p')::uuid, '00000000-0000-0000-0000-0000000000b1', 'staff');

select _assert('signing up is recorded (practice created)',
  (select count(*)::text from audit_log where practice_id = current_setting('t.p')::uuid and action = 'practices.insert'), '1');

-- ---------- changes are recorded by the database ----------
select _try('00000000-0000-0000-0000-0000000000b1',
  format('insert into patients (id, practice_id, first_name, last_name, phone) values (%L, %L, %L, %L, %L)',
    '00000000-0000-0000-0000-00000000aaaa', current_setting('t.p'), 'Thandi', 'Mokoena', '0820000000'));
select _assert('front desk adding a member is recorded, with who did it',
  (select actor_email || ' / ' || actor_role || ' / ' || description from audit_log where action = 'patients.insert'),
  'desk@seaview.test / staff / Added member details');
select _assert('the IP address and browser are kept',
  (select ip || ' / ' || user_agent from audit_log where action = 'patients.insert'), '196.25.1.10 / TestBrowser/1.0');

select _try('00000000-0000-0000-0000-0000000000b1',
  format('update patients set phone = %L, email = %L, points = 50 where id = %L', '0831111111', 't@example.com', '00000000-0000-0000-0000-00000000aaaa'));
select _assert('editing a member lists the fields changed',
  (select description from audit_log where action = 'patients.update' order by id desc limit 1),
  'Changed member details: email, phone');
select _assert('personal details themselves are not copied into the log',
  (select (details::text like '%0831111111%')::text from audit_log where action = 'patients.update' order by id desc limit 1), 'false');

select _try('00000000-0000-0000-0000-0000000000b1',
  format('update patients set points = 120 where id = %L', '00000000-0000-0000-0000-00000000aaaa'));
select _assert('points-only changes are not logged here (the points ledger has them)',
  (select count(*)::text from audit_log where action = 'patients.update'), '1');

-- Clinical: practitioner/admin only, and no clinical content in the log
select _try('00000000-0000-0000-0000-0000000000a1',
  format('insert into patient_conditions (id, practice_id, patient_id, name, notes) values (%L, %L, %L, %L, %L)',
    '00000000-0000-0000-0000-00000000c0c0', current_setting('t.p'), '00000000-0000-0000-0000-00000000aaaa', 'Asthma', 'Uses inhaler'));
select _try('00000000-0000-0000-0000-0000000000a1',
  format('update patient_conditions set notes = %L where id = %L', 'Severe, uses inhaler daily', '00000000-0000-0000-0000-00000000c0c0'));
select _assert('clinical changes are recorded against the member',
  (select string_agg(description, ' | ' order by id) from audit_log where category = 'clinical' and patient_id = '00000000-0000-0000-0000-00000000aaaa'),
  'Recorded condition | Changed condition: notes');
select _assert('clinical content never enters the log',
  (select (string_agg(details::text || description, '') ~* 'asthma|inhaler')::text from audit_log where category = 'clinical'), 'false');

-- Settings with values
select _try('00000000-0000-0000-0000-0000000000a1',
  format('insert into services (id, practice_id, name, price) values (%L, %L, %L, 650)', '00000000-0000-0000-0000-00000000e001', current_setting('t.p'), 'Check-up'));
select _try('00000000-0000-0000-0000-0000000000a1',
  format('update services set price = 700 where id = %L', '00000000-0000-0000-0000-00000000e001'));
select _assert('a price change shows old and new values',
  (select description from audit_log where action = 'services.update'), 'Changed service: price 650.00 → 700.00');

select _try('00000000-0000-0000-0000-0000000000a1',
  format('update practices set clinical_records = %L where id = %L', 'full', current_setting('t.p')));
select _assert('a module change shows old and new values',
  (select description from audit_log where action = 'practices.update' order by id desc limit 1),
  'Changed practice settings: clinical records off → full clinical notes');

-- Appointments: status changes are logged; timestamps alone are not
select _try('00000000-0000-0000-0000-0000000000b1',
  format('insert into appointments (id, practice_id, patient_id, scheduled_for, status) values (%L, %L, %L, now(), %L)',
    '00000000-0000-0000-0000-0000000a0001', current_setting('t.p'), '00000000-0000-0000-0000-00000000aaaa', 'scheduled'));
select _try('00000000-0000-0000-0000-0000000000b1',
  format('update appointments set status = %L, arrived_at = now() where id = %L', 'arrived', '00000000-0000-0000-0000-0000000a0001'));
select _assert('appointment check-in is recorded with the status change',
  (select description from audit_log where action = 'appointments.update'), 'Changed appointment: status scheduled → arrived');

-- Team
select _try('00000000-0000-0000-0000-0000000000a1',
  format('select update_team_member(%L, %L, true)', (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000b1'), 'doctor'));
select _assert('a role change is recorded against the team member',
  (select description || ' / ' || target_profile_id from audit_log where action = 'practice_members.update'),
  'Changed team member: role front desk → practitioner / 00000000-0000-0000-0000-0000000000b1');
select _try('00000000-0000-0000-0000-0000000000a1',
  format('select create_invitation(%L, %L, %L)', current_setting('t.p'), 'new@seaview.test', 'staff'));
select _assert('an invitation is recorded in plain words',
  (select description from audit_log where action = 'invitation.created'), 'Invited new@seaview.test as front desk');
insert into auth.mfa_factors (user_id, factor_type, status) values ('00000000-0000-0000-0000-0000000000b1', 'totp', 'verified');
select _try('00000000-0000-0000-0000-0000000000a1',
  format('select reset_member_two_step(%L)', (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000b1')));
select _assert('a 2FA reset is recorded',
  (select count(*)::text from audit_log where action = 'two_step.reset' and target_profile_id = '00000000-0000-0000-0000-0000000000b1'), '1');

-- ---------- what the app reports ----------
select _assert('a wrong two-step code can be logged before the second step',
  _try('00000000-0000-0000-0000-0000000000b1', 'select log_auth_event(''two_step_failed'')', 'aal1'), 'ok');
select _assert('it is recorded as reported by the app',
  (select description || ' / ' || source from audit_log where action = 'auth.two_step_failed'), 'Entered a wrong two-step code / app');
select _assert('made-up events are refused',
  _try('00000000-0000-0000-0000-0000000000b1', 'select log_auth_event(''hacked_the_planet'')'), 'Unknown event');

select _try('00000000-0000-0000-0000-0000000000b1', format('select log_record_view(%L)', '00000000-0000-0000-0000-00000000aaaa'));
select _try('00000000-0000-0000-0000-0000000000b1', format('select log_record_view(%L)', '00000000-0000-0000-0000-00000000aaaa'));
select _assert('opening a profile is recorded once per 10 minutes',
  (select count(*)::text from audit_log where action = 'viewed.member_profile'), '1');
select _assert('another practice cannot log views of our members',
  _try('00000000-0000-0000-0000-0000000000c1', format('select log_record_view(%L)', '00000000-0000-0000-0000-00000000aaaa')), 'Not allowed');

-- ---------- reading ----------
select _assert('the admin can read the log',
  (_read('00000000-0000-0000-0000-0000000000a1', 'select count(*)::text from audit_log')::int > 0)::text, 'true');
select _assert('a practitioner (not admin) cannot read the log',
  _read('00000000-0000-0000-0000-0000000000b1', 'select count(*)::text from audit_log'), '0');
select _assert('practitioners cannot use the activity view either',
  _try('00000000-0000-0000-0000-0000000000b1', format('select get_activity(%L)', current_setting('t.p'))),
  'Only a practice admin can see the activity log');
select _assert('another practice''s admin sees none of it',
  _read('00000000-0000-0000-0000-0000000000c1', format('select count(*)::text from audit_log where practice_id = %L', current_setting('t.p'))), '0');
select _assert('the admin sees names filled in',
  _read('00000000-0000-0000-0000-0000000000a1',
    format('select actor_name || '' → '' || patient_name from get_activity(%L, %L) where action = %L', current_setting('t.p'), 'members', 'patients.insert')),
  'Fikile Desk → Thandi Mokoena');
select _assert('filtering by member name works',
  _read('00000000-0000-0000-0000-0000000000a1',
    format('select (count(*) > 3)::text from get_activity(%L, null, null, %L)', current_setting('t.p'), 'mokoena')), 'true');
select _assert('the admin needs the second step to read it',
  _try('00000000-0000-0000-0000-0000000000a1', format('select get_activity(%L)', current_setting('t.p')), 'aal1'),
  'Only a practice admin can see the activity log');

-- ---------- nobody can change history ----------
select _assert('an admin cannot add fake entries',
  (_try('00000000-0000-0000-0000-0000000000a1',
    format('insert into audit_log (practice_id, category, action, description) values (%L, %L, %L, %L)', current_setting('t.p'), 'team', 'x', 'fake'))
   like 'permission denied%')::text, 'true');
select _assert('an admin cannot delete entries',
  (_try('00000000-0000-0000-0000-0000000000a1', 'delete from audit_log') like 'permission denied%')::text, 'true');
do $$ begin
  update audit_log set description = 'rewritten';
  raise exception 'should not reach';
exception when others then perform set_config('t.err', sqlerrm, true);
end $$;
select _assert('not even Care Africa can rewrite it', current_setting('t.err'), 'The activity log can''t be changed or deleted');

-- Deleting a member keeps the history, shown as "Deleted member"
delete from appointments where patient_id = '00000000-0000-0000-0000-00000000aaaa';
delete from patient_conditions where patient_id = '00000000-0000-0000-0000-00000000aaaa';
select _try('00000000-0000-0000-0000-0000000000a1', format('delete from patients where id = %L', '00000000-0000-0000-0000-00000000aaaa'));
select _assert('deleting a member is recorded and earlier history stays',
  _read('00000000-0000-0000-0000-0000000000a1',
    format('select count(*)::text || '' / '' || min(patient_name) from get_activity(%L) where patient_id = %L',
      current_setting('t.p'), '00000000-0000-0000-0000-00000000aaaa')),
  '10 / Deleted member');

rollback;
