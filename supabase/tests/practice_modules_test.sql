-- =====================================================================
-- Care Africa — tests for 0006 (practice modules and plan limits)
-- =====================================================================
-- Same style as the other tests: seeds data, asserts, then rolls back.
--
--   psql "$DATABASE_URL" -f supabase/tests/practice_modules_test.sql
-- =====================================================================

begin;

create or replace function _assert(label text, actual text, expected text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL  %  got[%] want[%]', label, actual, expected;
  end if;
  raise notice 'pass  %', label;
end $$;

-- Runs a statement as an app user; returns 'ok' or the error message.
create or replace function _try_as(actor uuid, q text)
returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', actor::text, true);
  -- Signed in with two-step sign-in completed (migration 0008).
  perform set_config('request.jwt.claims', json_build_object('sub', actor::text, 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
  execute q;
  perform set_config('role', 'postgres', true);
  return 'ok';
exception when others then
  perform set_config('role', 'postgres', true);
  return sqlerrm;
end $$;

-- Reads one value as an app user.
create or replace function _read_as(actor uuid, q text)
returns text language plpgsql as $$
declare out text;
begin
  perform set_config('request.jwt.claim.sub', actor::text, true);
  -- Signed in with two-step sign-in completed (migration 0008).
  perform set_config('request.jwt.claims', json_build_object('sub', actor::text, 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
  execute q into out;
  perform set_config('role', 'postgres', true);
  return coalesce(out, '');
end $$;

-- Supabase grants these by default; a bare Postgres needs them spelt out.
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;

-- Two users sign up; each gets a practice. Make B a staff member at A.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@spa.test',    '{"practice_name":"Calm Spa"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'staff@spa.test',    '{"practice_name":"Staff Own Practice"}');

do $$
declare v_a uuid; v_staff uuid := '00000000-0000-0000-0000-0000000000b1';
begin
  select practice_id into v_a from practice_members
   where profile_id = '00000000-0000-0000-0000-0000000000a1';
  insert into practice_members (practice_id, profile_id, role) values (v_a, v_staff, 'staff');
  perform set_config('test.practice_a', v_a::text, true);
end $$;

-- New practices: Practice plan, modules off until onboarding sets them.
select _assert('new practice starts on the Practice plan',
  (select plan from practices where id = current_setting('test.practice_a')::uuid), 'practice');
select _assert('new practice starts with clinical records off',
  (select clinical_records from practices where id = current_setting('test.practice_a')::uuid), 'off');
select _assert('new practice starts with claims off',
  (select claims_enabled::text from practices where id = current_setting('test.practice_a')::uuid), 'false');

-- Admin may set modules within the plan.
select _assert('admin can switch on full clinical notes',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('update practices set clinical_records = %L where id = %L', 'full', current_setting('test.practice_a'))), 'ok');
select _assert('admin can switch on claims on the Practice plan',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('update practices set claims_enabled = true where id = %L', current_setting('test.practice_a'))), 'ok');
select _assert('admin sees the saved level',
  _read_as('00000000-0000-0000-0000-0000000000a1',
    format('select clinical_records from practices where id = %L', current_setting('test.practice_a'))), 'full');

-- Admin may not change the plan.
select _assert('admin cannot change the plan',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('update practices set plan = %L where id = %L', 'network', current_setting('test.practice_a'))),
  'Only Care Africa can change a practice''s plan');

-- Staff (not admin) cannot change modules: RLS filters the row, nothing changes.
select _try_as('00000000-0000-0000-0000-0000000000b1',
  format('update practices set clinical_records = %L where id = %L', 'off', current_setting('test.practice_a')));
select _assert('staff cannot change modules',
  (select clinical_records from practices where id = current_setting('test.practice_a')::uuid), 'full');

-- Invalid level is refused by the check constraint.
select _assert('unknown clinical level is refused',
  (_try_as('00000000-0000-0000-0000-0000000000a1',
    format('update practices set clinical_records = %L where id = %L', 'some', current_setting('test.practice_a'))) like '%check constraint%')::text,
  'true');

-- Care Africa moves the practice to Starter: must first bring modules within limits.
do $$ begin
  update practices set plan = 'starter' where id = current_setting('test.practice_a')::uuid;
  raise exception 'should not reach';
exception when others then
  perform set_config('test.err', sqlerrm, true);
end $$;
select _assert('plan cannot drop to Starter while full notes are on',
  current_setting('test.err'), 'Full clinical notes are not included in the Starter plan');

update practices set plan = 'starter', clinical_records = 'intake', claims_enabled = false
 where id = current_setting('test.practice_a')::uuid;
select _assert('Care Africa can change the plan',
  (select plan from practices where id = current_setting('test.practice_a')::uuid), 'starter');

-- On Starter, the admin can use intake forms but not full notes or claims.
select _assert('Starter admin can switch clinical records off',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('update practices set clinical_records = %L where id = %L', 'off', current_setting('test.practice_a'))), 'ok');
select _assert('Starter admin cannot switch on full notes',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('update practices set clinical_records = %L where id = %L', 'full', current_setting('test.practice_a'))),
  'Full clinical notes are not included in the Starter plan');
select _assert('Starter admin cannot switch on claims',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('update practices set claims_enabled = true where id = %L', current_setting('test.practice_a'))),
  'Medical-aid claims are not included in the Starter plan');

-- Other practice settings still save normally for an admin.
select _assert('admin can still rename the practice',
  _try_as('00000000-0000-0000-0000-0000000000a1',
    format('update practices set name = %L where id = %L', 'Calm Spa & Wellness', current_setting('test.practice_a'))), 'ok');

rollback;
