-- =====================================================================
-- Care Africa — RLS test suite
-- =====================================================================
-- Seeds two practices, asserts isolation, then rolls everything back.
-- Leaves no data behind, but run it against a local or staging database
-- rather than production regardless.
--
--   psql "$DATABASE_URL" -f tests/rls_test.sql
--
-- Any failure raises an exception and aborts. Silence at the end after
-- the summary notice means everything passed.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Harness
-- ---------------------------------------------------------------------

create or replace function _assert(label text, actual text, expected text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL  %  got[%] want[%]', label, actual, expected;
  end if;
  raise notice 'pass  %', label;
end $$;

-- Run a query as a given user and return the first column of the first
-- row as text. Empty result becomes ''.
create or replace function _as(actor uuid, q text)
returns text language plpgsql as $$
declare out text;
begin
  perform set_config('request.jwt.claim.sub', actor::text, true);
  perform set_config('role', 'authenticated', true);
  execute q into out;
  perform set_config('role', 'postgres', true);
  return coalesce(out::text, '');
exception when others then
  perform set_config('role', 'postgres', true);
  return 'ERROR:' || sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------

insert into practices (id, name, slug) values
 ('11111111-1111-1111-1111-111111111111','Test Practice A','test-a'),
 ('22222222-2222-2222-2222-222222222222','Test Practice B','test-b');

insert into auth.users (id, email) values
 ('a1111111-0000-0000-0000-000000000001','staff.a@test'),
 ('b1111111-0000-0000-0000-000000000001','p.one@test'),
 ('b1111111-0000-0000-0000-000000000002','p.two@test'),
 ('b1111111-0000-0000-0000-000000000003','p.three@test');

update profiles set role='practice_admin'
 where id='a1111111-0000-0000-0000-000000000001';

-- signup bootstrap: one owner registering a practice, one user claiming a role
insert into auth.users (id, email, raw_user_meta_data) values
 ('d1111111-0000-0000-0000-000000000001','new.owner@test','{"practice_name":"New Owner Clinic"}'),
 ('d1111111-0000-0000-0000-000000000002','sneaky@test','{"role":"practice_admin"}');

insert into practice_members (practice_id, profile_id, role) values
 ('11111111-1111-1111-1111-111111111111','a1111111-0000-0000-0000-000000000001','practice_admin');

insert into patients (id, practice_id, profile_id, first_name, last_name, email) values
 ('c1111111-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','b1111111-0000-0000-0000-000000000001','Patient','One','p.one@test'),
 ('c1111111-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','b1111111-0000-0000-0000-000000000002','Patient','Two','p.two@test'),
 ('c1111111-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','b1111111-0000-0000-0000-000000000003','Patient','Three','p.three@test');

insert into consultations (practice_id, patient_id, scheduled_at, diagnosis) values
 ('11111111-1111-1111-1111-111111111111','c1111111-0000-0000-0000-000000000001',now(),'ONE_DX'),
 ('11111111-1111-1111-1111-111111111111','c1111111-0000-0000-0000-000000000002',now(),'TWO_DX');

insert into appointments (practice_id, patient_id, scheduled_for, status) values
 ('11111111-1111-1111-1111-111111111111','c1111111-0000-0000-0000-000000000001',now(),'scheduled'),
 ('11111111-1111-1111-1111-111111111111','c1111111-0000-0000-0000-000000000002',now(),'scheduled');

insert into appointments (practice_id, walk_in_name, scheduled_for) values
 ('11111111-1111-1111-1111-111111111111','Walk In', now());

insert into points_ledger (practice_id, patient_id, delta, reason) values
 ('11111111-1111-1111-1111-111111111111','c1111111-0000-0000-0000-000000000001',150,'visit');

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;


-- ---------------------------------------------------------------------
-- Assertions
-- ---------------------------------------------------------------------

do $$
declare
  s   uuid := 'a1111111-0000-0000-0000-000000000001';
  p1  uuid := 'b1111111-0000-0000-0000-000000000001';
  p2  uuid := 'b1111111-0000-0000-0000-000000000002';
  p3  uuid := 'b1111111-0000-0000-0000-000000000003';
  pr_a text := '11111111-1111-1111-1111-111111111111';
  pat1 text := 'c1111111-0000-0000-0000-000000000001';
  pat2 text := 'c1111111-0000-0000-0000-000000000002';
begin
  -- ledger cache
  perform _assert('points cache follows ledger',
    (select points::text from patients where id = pat1::uuid), '150');

  -- cross-patient isolation
  perform _assert('patient sees own record only',       _as(p1,'select count(*) from patients'), '1');
  perform _assert('patient sees own consultation only', _as(p1,'select diagnosis from consultations'), 'ONE_DX');
  perform _assert('second patient isolated',            _as(p2,'select diagnosis from consultations'), 'TWO_DX');
  perform _assert('other practice sees nothing',        _as(p3,'select count(*) from consultations'), '0');
  perform _assert('patient sees own appointment only',  _as(p1,'select count(*) from appointments'), '1');
  perform _assert('walk-ins hidden from patients',      _as(p1,'select count(*) from appointments where walk_in_name is not null'), '0');
  perform _assert('patient sees own ledger only',       _as(p1,'select count(*) from points_ledger'), '1');
  perform _assert('no foreign ledger rows',             _as(p2,'select count(*) from points_ledger'), '0');
  perform _assert('no foreign medications',             _as(p1,'select count(*) from patient_medications'), '0');

  -- staff scoping
  perform _assert('staff sees own-practice roster',     _as(s,'select count(*) from patients'), '2');
  perform _assert('staff cannot see other practice',    _as(s,'select count(*) from patients where practice_id = ''22222222-2222-2222-2222-222222222222'''), '0');
  perform _assert('staff sees all appointments',        _as(s,'select count(*) from appointments'), '3');
  perform _assert('staff sees exactly one practice',    _as(s,'select count(*) from practices'), '1');
  perform _assert('patient sees own practice',          _as(p1,'select count(*) from practices'), '1');

  -- patient write restrictions
  perform _assert('patient cannot create consultation',
    left(_as(p1, format('insert into consultations (practice_id,patient_id,scheduled_at) values (%L,%L,now()) returning 1', pr_a, pat1)), 5), 'ERROR');
  perform _assert('patient cannot self-award points',
    left(_as(p1, format('insert into points_ledger (practice_id,patient_id,delta,reason) values (%L,%L,9999,''hack'') returning 1', pr_a, pat1)), 5), 'ERROR');
  perform _assert('patient cannot edit points field',
    left(_as(p1,'update patients set points = 9999 where profile_id = auth.uid() returning 1'), 5), 'ERROR');
  perform _assert('patient cannot change practice',
    left(_as(p1,'update patients set practice_id = ''22222222-2222-2222-2222-222222222222'' where profile_id = auth.uid() returning 1'), 5), 'ERROR');
  perform _assert('patient can edit own phone',
    _as(p1,'update patients set phone = ''0821234567'' where profile_id = auth.uid() returning phone'), '0821234567');

  -- booking rules
  perform _assert('patient booking must be requested',
    left(_as(p1, format('insert into appointments (practice_id,patient_id,scheduled_for,status) values (%L,%L,now(),''scheduled'') returning 1', pr_a, pat1)), 5), 'ERROR');
  perform _assert('patient may request an appointment',
    _as(p1, format('insert into appointments (practice_id,patient_id,scheduled_for,status) values (%L,%L,now(),''requested'') returning 1', pr_a, pat1)), '1');
  perform _assert('patient cannot book for another',
    left(_as(p1, format('insert into appointments (practice_id,patient_id,scheduled_for,status) values (%L,%L,now(),''requested'') returning 1', pr_a, pat2)), 5), 'ERROR');

  -- signup bootstrap
  perform _assert('practice_name signup creates a practice',
    (select count(*)::text from practices where name = 'New Owner Clinic'), '1');
  perform _assert('registering owner becomes practice admin',
    (select count(*)::text from practice_members
      where profile_id = 'd1111111-0000-0000-0000-000000000001' and role = 'practice_admin'), '1');
  perform _assert('owner profile role is practice_admin',
    (select role::text from profiles where id = 'd1111111-0000-0000-0000-000000000001'), 'practice_admin');
  perform _assert('owner sees only their own practice',
    _as('d1111111-0000-0000-0000-000000000001','select count(*) from practices'), '1');
  perform _assert('owner cannot see another practice''s patients',
    _as('d1111111-0000-0000-0000-000000000001','select count(*) from patients'), '0');
  perform _assert('client-supplied role is ignored',
    (select role::text from profiles where id = 'd1111111-0000-0000-0000-000000000002'), 'patient');
  perform _assert('role-claiming user gets no practice',
    (select count(*)::text from practice_members where profile_id = 'd1111111-0000-0000-0000-000000000002'), '0');
  perform _assert('role-claiming user sees no practices',
    _as('d1111111-0000-0000-0000-000000000002','select count(*) from practices'), '0');

  raise notice '---- all RLS assertions passed ----';
end $$;

drop function _assert(text, text, text);
drop function _as(uuid, text);

rollback;
