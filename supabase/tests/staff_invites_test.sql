-- =====================================================================
-- Care Africa — tests for 0007 (staff invites, roles, clinical access)
-- =====================================================================
--   psql "$DATABASE_URL" -f supabase/tests/staff_invites_test.sql
-- Seeds data, asserts, then rolls back.
-- =====================================================================

begin;

grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;

create or replace function _assert(label text, actual text, expected text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL  %  got[%] want[%]', label, actual, expected;
  end if;
  raise notice 'pass  %', label;
end $$;

-- Run a statement as a user ('anon' when actor is null); 'ok' or the error.
create or replace function _try_as(actor uuid, q text)
returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(actor::text, ''), true);
  -- Signed in with two-step sign-in completed (migration 0008).
  perform set_config('request.jwt.claims', json_build_object('sub', coalesce(actor::text, ''), 'aal', 'aal2')::text, true);
  perform set_config('role', case when actor is null then 'anon' else 'authenticated' end, true);
  execute q;
  perform set_config('role', 'postgres', true);
  return 'ok';
exception when others then
  perform set_config('role', 'postgres', true);
  return sqlerrm;
end $$;

-- Read one value as a user.
create or replace function _read_as(actor uuid, q text)
returns text language plpgsql as $$
declare out text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(actor::text, ''), true);
  -- Signed in with two-step sign-in completed (migration 0008).
  perform set_config('request.jwt.claims', json_build_object('sub', coalesce(actor::text, ''), 'aal', 'aal2')::text, true);
  perform set_config('role', case when actor is null then 'anon' else 'authenticated' end, true);
  execute q into out;
  perform set_config('role', 'postgres', true);
  return coalesce(out, '');
exception when others then
  perform set_config('role', 'postgres', true);
  return 'ERROR: ' || sqlerrm;
end $$;

-- People:
--   a1  owner of Seaview (practice admin)
--   f1  will be invited as front desk
--   d1  will be invited as practitioner
--   x1  stranger with their own practice
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@seaview.test',  '{"practice_name":"Seaview"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'desk@seaview.test',   '{"full_name":"Fikile Desk"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'doc@seaview.test',    '{"full_name":"Dr Dube"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'other@elsewhere.test','{"practice_name":"Elsewhere"}');

select set_config('t.p', (select practice_id::text from practice_members
                           where profile_id = '00000000-0000-0000-0000-0000000000a1'), false);

select _assert('invite signup does not create a practice',
  (select count(*)::text from practice_members where profile_id = '00000000-0000-0000-0000-0000000000f1'), '0');

-- ---------- creating invitations ----------
select _assert('front desk cannot be invited by a stranger',
  _try_as('00000000-0000-0000-0000-0000000000e1',
    format('select create_invitation(%L, %L, %L)', current_setting('t.p'), 'desk@seaview.test', 'staff')),
  'Only a practice admin can invite staff');

create temp table tok (who text, token text);
grant all on tok to authenticated, anon;

select _try_as('00000000-0000-0000-0000-0000000000a1',
  format('insert into tok select %L, token from create_invitation(%L, %L, %L)', 'desk', current_setting('t.p'), 'Desk@Seaview.test ', 'staff'));
select _try_as('00000000-0000-0000-0000-0000000000a1',
  format('insert into tok select %L, token from create_invitation(%L, %L, %L)', 'doc', current_setting('t.p'), 'doc@seaview.test', 'doctor'));
select _assert('admin can invite (two invitations made)', (select count(*)::text from tok), '2');
select _assert('only a hash of the token is stored',
  (select count(*)::text from practice_invitations i join tok on i.token_hash = tok.token), '0');
select _assert('admin can see the practice''s invitations',
  _read_as('00000000-0000-0000-0000-0000000000a1', 'select count(*)::text from practice_invitations'), '2');
select _assert('stranger cannot see them',
  _read_as('00000000-0000-0000-0000-0000000000e1', 'select count(*)::text from practice_invitations'), '0');
select _assert('bad email is refused',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('select create_invitation(%L, %L, %L)', current_setting('t.p'), 'not-an-email', 'staff')),
  'Enter a valid email address');
select _assert('existing member cannot be invited again',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('select create_invitation(%L, %L, %L)', current_setting('t.p'), 'owner@seaview.test', 'staff')),
  'owner@seaview.test is already on your team');

-- ---------- preview and accepting ----------
select _assert('anyone with the link sees practice and role',
  _read_as(null, format('select ((get_invitation(%L))->>%L) || %L || ((get_invitation(%L))->>%L)',
    (select token from tok where who = 'desk'), 'practice_name', '/', (select token from tok where who = 'desk'), 'role')),
  'Seaview/staff');
select _assert('a made-up link is invalid',
  _read_as(null, format('select (get_invitation(%L))->>%L', 'nope', 'status')), 'invalid');

select _assert('the wrong account cannot accept',
  _try_as('00000000-0000-0000-0000-0000000000d1',
    format('select accept_invitation(%L)', (select token from tok where who = 'desk'))),
  'This invitation was sent to desk@seaview.test. Sign in with that email address.');
select _assert('signed-out people cannot accept',
  _try_as(null, format('select accept_invitation(%L)', (select token from tok where who = 'desk'))),
  'permission denied for function accept_invitation');

select _assert('front desk accepts their invitation',
  _try_as('00000000-0000-0000-0000-0000000000f1',
    format('select accept_invitation(%L)', (select token from tok where who = 'desk'))), 'ok');
select _assert('front desk is now a member with role staff',
  (select role::text from practice_members where profile_id = '00000000-0000-0000-0000-0000000000f1'
     and practice_id = current_setting('t.p')::uuid), 'staff');
select _assert('accepting twice is harmless',
  _try_as('00000000-0000-0000-0000-0000000000f1',
    format('select accept_invitation(%L)', (select token from tok where who = 'desk'))), 'ok');
select _assert('a used link shows as accepted',
  _read_as(null, format('select (get_invitation(%L))->>%L', (select token from tok where who = 'desk'), 'status')), 'accepted');

select _assert('practitioner accepts',
  _try_as('00000000-0000-0000-0000-0000000000d1',
    format('select accept_invitation(%L)', (select token from tok where who = 'doc'))), 'ok');

-- ---------- expired and cancelled ----------
select _try_as('00000000-0000-0000-0000-0000000000a1',
  format('insert into tok select %L, token from create_invitation(%L, %L, %L)', 'late', current_setting('t.p'), 'late@seaview.test', 'staff'));
update practice_invitations set expires_at = now() - interval '1 minute' where email = 'late@seaview.test';
select _assert('expired links are refused',
  _read_as(null, format('select (get_invitation(%L))->>%L', (select token from tok where who = 'late'), 'status')), 'expired');

select _try_as('00000000-0000-0000-0000-0000000000a1',
  format('insert into tok select %L, token from create_invitation(%L, %L, %L)', 'again', current_setting('t.p'), 'late@seaview.test', 'staff'));
select _assert('a new invite replaces the old one',
  (select count(*)::text from practice_invitations where email = 'late@seaview.test' and revoked_at is null and accepted_at is null), '1');
select _try_as('00000000-0000-0000-0000-0000000000a1',
  format('select revoke_invitation(%L)', (select id from practice_invitations where email = 'late@seaview.test' and revoked_at is null)));
select _assert('admin can cancel an invitation',
  _read_as(null, format('select (get_invitation(%L))->>%L', (select token from tok where who = 'again'), 'status')), 'revoked');

-- ---------- clinical access by role ----------
insert into patients (id, practice_id, first_name) values
  ('00000000-0000-0000-0000-00000000aaaa', current_setting('t.p')::uuid, 'Thandi');
insert into patient_conditions (practice_id, patient_id, name)
  values (current_setting('t.p')::uuid, '00000000-0000-0000-0000-00000000aaaa', 'Asthma');

select _assert('front desk can see members',
  _read_as('00000000-0000-0000-0000-0000000000f1', 'select count(*)::text from patients'), '1');
select _assert('front desk cannot see clinical records',
  _read_as('00000000-0000-0000-0000-0000000000f1', 'select count(*)::text from patient_conditions'), '0');
select _assert('front desk cannot write clinical records',
  (_try_as('00000000-0000-0000-0000-0000000000f1',
    format('insert into patient_conditions (practice_id, patient_id, name) values (%L, %L, %L)',
      current_setting('t.p'), '00000000-0000-0000-0000-00000000aaaa', 'Flu')) like '%row-level security%')::text, 'true');
select _assert('practitioner can see clinical records',
  _read_as('00000000-0000-0000-0000-0000000000d1', 'select count(*)::text from patient_conditions'), '1');
select _assert('admin can see clinical records',
  _read_as('00000000-0000-0000-0000-0000000000a1', 'select count(*)::text from patient_conditions'), '1');

-- ---------- managing the team ----------
select _assert('front desk cannot change roles',
  _try_as('00000000-0000-0000-0000-0000000000f1',
    format('select update_team_member(%L, %L, true)',
      (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000f1'), 'practice_admin')),
  'Only a practice admin can change the team');

select _assert('the only admin cannot step down',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('select update_team_member(%L, %L, true)',
      (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000a1'), 'doctor')),
  'A practice needs at least one active admin');
select _assert('the only admin cannot be removed directly either',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('update practice_members set is_active = false where profile_id = %L', '00000000-0000-0000-0000-0000000000a1')),
  'A practice needs at least one active admin');

select _assert('admin can promote the practitioner to admin',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('select update_team_member(%L, %L, true)',
      (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000d1'), 'practice_admin')), 'ok');
select _assert('with two admins, the owner can step down',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('select update_team_member(%L, %L, true)',
      (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000a1'), 'doctor')), 'ok');

select _assert('new admin removes front desk',
  _try_as('00000000-0000-0000-0000-0000000000d1',
    format('select update_team_member(%L, %L, false)',
      (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000f1'), 'staff')), 'ok');
select _assert('removed staff lose access to members',
  _read_as('00000000-0000-0000-0000-0000000000f1', 'select count(*)::text from patients'), '0');

-- Care Africa (SQL editor) can still delete a whole practice.
delete from practices where id = current_setting('t.p')::uuid;
select _assert('deleting a practice is not blocked by the admin rule',
  (select count(*)::text from practices where id = current_setting('t.p')::uuid), '0');

rollback;
