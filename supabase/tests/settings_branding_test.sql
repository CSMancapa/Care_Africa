-- =====================================================================
-- Care Africa — tests for 0003 (branding) and 0004 (practice settings)
-- =====================================================================
-- Same style as rls_test.sql: seeds data, asserts, then rolls back.
-- Run against a local or staging database, not production:
--
--   psql "$DATABASE_URL" -f supabase/tests/settings_branding_test.sql
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
-- Fixtures: practice A (admin + plain staff + a patient), practice B (admin)
-- ---------------------------------------------------------------------

insert into practices (id, name, slug) values
 ('11111111-1111-1111-1111-111111111111','Test Practice A','test-a'),
 ('22222222-2222-2222-2222-222222222222','Test Practice B','test-b');

insert into auth.users (id, email) values
 ('a1111111-0000-0000-0000-000000000001','admin.a@test'),
 ('a1111111-0000-0000-0000-000000000002','staff.a@test'),
 ('a2222222-0000-0000-0000-000000000001','admin.b@test'),
 ('b1111111-0000-0000-0000-000000000001','patient.a@test');

update profiles set role = 'practice_admin'
 where id in ('a1111111-0000-0000-0000-000000000001','a2222222-0000-0000-0000-000000000001');
update profiles set role = 'staff' where id = 'a1111111-0000-0000-0000-000000000002';

insert into practice_members (practice_id, profile_id, role) values
 ('11111111-1111-1111-1111-111111111111','a1111111-0000-0000-0000-000000000001','practice_admin'),
 ('11111111-1111-1111-1111-111111111111','a1111111-0000-0000-0000-000000000002','staff'),
 ('22222222-2222-2222-2222-222222222222','a2222222-0000-0000-0000-000000000001','practice_admin');

insert into patients (practice_id, profile_id, first_name, last_name) values
 ('11111111-1111-1111-1111-111111111111','b1111111-0000-0000-0000-000000000001','Pat','A');

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;

do $$
declare
  admin_a uuid := 'a1111111-0000-0000-0000-000000000001';
  staff_a uuid := 'a1111111-0000-0000-0000-000000000002';
  admin_b uuid := 'a2222222-0000-0000-0000-000000000001';
  pat_a   uuid := 'b1111111-0000-0000-0000-000000000001';
  pa      text := '''11111111-1111-1111-1111-111111111111''';
  appt    uuid;
  doc     uuid;
begin
  -- ---------------- Branding (0003) ----------------
  perform _assert('admin can set brand colours',
    _as(admin_a, 'with u as (update practices set brand_primary_color = ''#0F766E'' where id = ' || pa || ' returning 1) select count(*) from u'), '1');
  perform _assert('plain staff cannot change branding',
    _as(staff_a, 'with u as (update practices set brand_primary_color = ''#FF0000'' where id = ' || pa || ' returning 1) select count(*) from u'), '0');
  perform _assert('other practice cannot change branding',
    _as(admin_b, 'with u as (update practices set brand_primary_color = ''#FF0000'' where id = ' || pa || ' returning 1) select count(*) from u'), '0');
  perform _assert('brand colour must be #RRGGBB',
    left(_as(admin_a, 'with u as (update practices set brand_primary_color = ''teal'' where id = ' || pa || ' returning 1) select count(*) from u'), 6), 'ERROR:');
  perform _assert('staff can read their practice branding',
    _as(staff_a, 'select brand_primary_color from practices where id = ' || pa), '#0F766E');

  perform _assert('admin can upload a logo to own folder',
    _as(admin_a, 'with i as (insert into storage.objects (bucket_id, name) values (''practice-branding'', ''11111111-1111-1111-1111-111111111111/logo.png'') returning 1) select count(*) from i'), '1');
  perform _assert('plain staff cannot upload a logo',
    left(_as(staff_a, 'with i as (insert into storage.objects (bucket_id, name) values (''practice-branding'', ''11111111-1111-1111-1111-111111111111/x.png'') returning 1) select count(*) from i'), 6), 'ERROR:');
  perform _assert('other practice cannot upload into A''s folder',
    left(_as(admin_b, 'with i as (insert into storage.objects (bucket_id, name) values (''practice-branding'', ''11111111-1111-1111-1111-111111111111/y.png'') returning 1) select count(*) from i'), 6), 'ERROR:');

  -- ---------------- Practice settings (0004) ----------------
  perform _assert('plain staff cannot change practice details',
    _as(staff_a, 'with u as (update practices set business_hours = ''{"monday":{"start":"08:00","end":"17:00","isOpen":true}}'' where id = ' || pa || ' returning 1) select count(*) from u'), '0');
  perform _assert('admin can save business hours',
    _as(admin_a, 'with u as (update practices set business_hours = ''{"monday":{"start":"08:00","end":"17:00","isOpen":true}}'', specialties = ''{Dentistry}'' where id = ' || pa || ' returning 1) select count(*) from u'), '1');

  perform _as(admin_a, 'select replace_practice_services(' || pa || ', ''[{"name":"Check-up","price":450},{"name":"Cleaning","price":600},{"name":"check-up","price":999}]''::jsonb)');
  perform _assert('services saved, duplicate name ignored',
    (select count(*)::text from services where practice_id = '11111111-1111-1111-1111-111111111111' and deleted_at is null), '2');
  perform _as(admin_a, 'select replace_practice_services(' || pa || ', ''[{"name":"Check-up","price":500}]''::jsonb)');
  perform _assert('removed service is soft-deleted',
    (select count(*)::text from services where practice_id = '11111111-1111-1111-1111-111111111111' and deleted_at is not null), '1');
  perform _assert('kept service is updated in place',
    (select price::int::text from services where practice_id = '11111111-1111-1111-1111-111111111111' and name = 'Check-up' and deleted_at is null), '500');
  perform _assert('other practice cannot replace A''s services',
    left(_as(admin_b, 'select replace_practice_services(' || pa || ', ''[]''::jsonb)'), 6), 'ERROR:');

  perform _as(staff_a, 'select replace_practice_doctors(' || pa || ', ''[{"name":"Dr Naidoo","specialization":"Dentist"},{"name":"Dr Mokoena"}]''::jsonb)');
  perform _assert('doctors saved',
    (select count(*)::text from practice_doctors where practice_id = '11111111-1111-1111-1111-111111111111' and deleted_at is null), '2');
  perform _assert('other practice cannot see A''s doctors',
    _as(admin_b, 'select count(*) from practice_doctors'), '0');
  perform _assert('patient can see their practice''s doctors',
    _as(pat_a, 'select count(*) from practice_doctors'), '2');

  select id into doc from practice_doctors where name = 'Dr Naidoo';
  insert into appointments (practice_id, patient_id, doctor_id, scheduled_for)
    select '11111111-1111-1111-1111-111111111111', id, doc, now() from patients limit 1
    returning id into appt;
  perform _as(admin_a, 'select replace_practice_doctors(' || pa || ', ''[{"name":"Dr Mokoena"}]''::jsonb)');
  perform _assert('removing a doctor keeps past appointments linked',
    (select (doctor_id = doc)::text from appointments where id = appt), 'true');

  raise notice '---- all settings and branding assertions passed ----';
end $$;

drop function _assert(text, text, text);
drop function _as(uuid, text);

rollback;
