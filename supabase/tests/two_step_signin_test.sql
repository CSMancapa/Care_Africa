-- =====================================================================
-- Care Africa — tests for 0008 (two-step sign-in)
-- =====================================================================
--   psql "$DATABASE_URL" -f supabase/tests/two_step_signin_test.sql
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

-- Act as a user at a given assurance level: 'aal1' = password only,
-- 'aal2' = password + authenticator code.
create or replace function _as(actor uuid, aal text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', actor::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', actor, 'aal', aal)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function _read(actor uuid, aal text, q text)
returns text language plpgsql as $$
declare out text;
begin
  perform _as(actor, aal);
  execute q into out;
  perform set_config('role', 'postgres', true);
  return coalesce(out, '');
exception when others then
  perform set_config('role', 'postgres', true);
  return 'ERROR: ' || sqlerrm;
end $$;

create or replace function _try(actor uuid, aal text, q text)
returns text language plpgsql as $$
begin
  perform _as(actor, aal);
  execute q;
  perform set_config('role', 'postgres', true);
  return 'ok';
exception when others then
  perform set_config('role', 'postgres', true);
  return sqlerrm;
end $$;

-- a1 owns Seaview; s1 is front desk there. d1 owns the demo practice.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@seaview.test', '{"practice_name":"Seaview"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'desk@seaview.test',  '{"full_name":"Desk"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'demo@demo.test',     '{"practice_name":"Demo Practice"}');

select set_config('t.p',    (select practice_id::text from practice_members where profile_id = '00000000-0000-0000-0000-0000000000a1'), false);
select set_config('t.demo', (select practice_id::text from practice_members where profile_id = '00000000-0000-0000-0000-0000000000c1'), false);
insert into practice_members (practice_id, profile_id, role)
  values (current_setting('t.p')::uuid, '00000000-0000-0000-0000-0000000000b1', 'staff');
insert into patients (practice_id, first_name) values (current_setting('t.p')::uuid, 'Thandi');
insert into patients (practice_id, first_name) values (current_setting('t.demo')::uuid, 'Demo Patient');

-- Care Africa switches 2FA off for the demo practice.
update practices set mfa_required = false where id = current_setting('t.demo')::uuid;

-- ---------- the second step is required ----------
select _assert('new practices require two-step sign-in',
  (select mfa_required::text from practices where id = current_setting('t.p')::uuid), 'true');
select _assert('password only: no members visible',
  _read('00000000-0000-0000-0000-0000000000a1', 'aal1', 'select count(*)::text from patients'), '0');
select _assert('password only: practice details hidden',
  _read('00000000-0000-0000-0000-0000000000a1', 'aal1', format('select count(*)::text from practices where id = %L', current_setting('t.p'))), '0');
select _assert('password only: cannot add a member',
  (_try('00000000-0000-0000-0000-0000000000a1', 'aal1',
    format('insert into patients (practice_id, first_name) values (%L, %L)', current_setting('t.p'), 'Sneaky')) like '%row-level security%')::text, 'true');
select _assert('password only: cannot invite staff',
  _try('00000000-0000-0000-0000-0000000000a1', 'aal1',
    format('select create_invitation(%L, %L, %L)', current_setting('t.p'), 'x@seaview.test', 'staff')),
  'Only a practice admin can invite staff');
select _assert('password only: can still see own membership (to know where to go next)',
  _read('00000000-0000-0000-0000-0000000000a1', 'aal1', 'select count(*)::text from practice_members where profile_id = auth.uid()'), '1');
select _assert('app is told 2FA is required',
  _read('00000000-0000-0000-0000-0000000000a1', 'aal1', 'select my_mfa_requirement()::text'), 'true');

select _assert('with the code: members visible',
  _read('00000000-0000-0000-0000-0000000000a1', 'aal2', 'select count(*)::text from patients'), '1');
select _assert('with the code: front desk sees members too',
  _read('00000000-0000-0000-0000-0000000000b1', 'aal2', 'select count(*)::text from patients'), '1');

-- ---------- demo practice exemption ----------
select _assert('demo practice: works with password only',
  _read('00000000-0000-0000-0000-0000000000c1', 'aal1', 'select count(*)::text from patients'), '1');
select _assert('demo login is told 2FA is not required',
  _read('00000000-0000-0000-0000-0000000000c1', 'aal1', 'select my_mfa_requirement()::text'), 'false');
select _assert('a practice admin cannot switch 2FA off',
  _try('00000000-0000-0000-0000-0000000000a1', 'aal2',
    format('update practices set mfa_required = false where id = %L', current_setting('t.p'))),
  'Only Care Africa can change whether two-step sign-in is required');

-- ---------- admin-assisted reset ----------
insert into auth.mfa_factors (user_id, factor_type, status) values
  ('00000000-0000-0000-0000-0000000000b1', 'totp', 'verified'),
  ('00000000-0000-0000-0000-0000000000b1', 'recovery_code', 'verified'),
  ('00000000-0000-0000-0000-0000000000a1', 'totp', 'verified');
insert into auth.sessions (user_id, aal) values
  ('00000000-0000-0000-0000-0000000000b1', 'aal2'),
  ('00000000-0000-0000-0000-0000000000b1', 'aal1');

select _assert('front desk cannot reset anyone',
  _try('00000000-0000-0000-0000-0000000000b1', 'aal2',
    format('select reset_member_two_step(%L)', (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000a1'))),
  'Only a practice admin can reset two-step sign-in');
select _assert('admin without the second step cannot reset',
  _try('00000000-0000-0000-0000-0000000000a1', 'aal1',
    format('select reset_member_two_step(%L)', (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000b1'))),
  'Only a practice admin can reset two-step sign-in');
select _assert('admin cannot reset their own',
  _try('00000000-0000-0000-0000-0000000000a1', 'aal2',
    format('select reset_member_two_step(%L)', (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000a1'))),
  'You can''t reset your own two-step sign-in. Use a recovery code, or ask another admin.');
select _assert('an admin at another practice cannot reset',
  _try('00000000-0000-0000-0000-0000000000c1', 'aal2',
    format('select reset_member_two_step(%L)', (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000b1'))),
  'Only a practice admin can reset two-step sign-in');

select _assert('admin resets front desk',
  _try('00000000-0000-0000-0000-0000000000a1', 'aal2',
    format('select reset_member_two_step(%L)', (select id from practice_members where profile_id = '00000000-0000-0000-0000-0000000000b1'))), 'ok');
select _assert('their authenticator and recovery codes are gone',
  (select count(*)::text from auth.mfa_factors where user_id = '00000000-0000-0000-0000-0000000000b1'), '0');
select _assert('they are signed out everywhere',
  (select count(*)::text from auth.sessions where user_id = '00000000-0000-0000-0000-0000000000b1'), '0');
select _assert('the admin''s own 2FA is untouched',
  (select count(*)::text from auth.mfa_factors where user_id = '00000000-0000-0000-0000-0000000000a1'), '1');

rollback;
