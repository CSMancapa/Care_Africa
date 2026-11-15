-- =====================================================================
-- Care Africa — 0004 practice settings
-- =====================================================================
-- The onboarding and Settings screens collect things the first schema had
-- nowhere to put: business hours, specialties, insurers, reward rules and the
-- practice's doctors. This adds them.
--
-- Doctors are listed by the practice and do not need a login, so they live in
-- their own table rather than in profiles. Appointments now point at it.
-- (consultations.doctor_id still points at profiles: that is the clinician who
-- signed in and wrote the consultation.)
--
-- Services and doctors are saved as a whole list from the Settings screen, so
-- two functions replace a practice's list atomically while keeping row ids
-- stable. Appointments reference those ids, so rows are matched by name and
-- removed ones are soft-deleted instead of dropped.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Practice settings
-- ---------------------------------------------------------------------

alter table practices
  add column if not exists category            text not null default 'other',
  add column if not exists business_hours      jsonb not null default '{}'::jsonb,
  add column if not exists specialties         text[] not null default '{}',
  add column if not exists accepted_insurances text[] not null default '{}',
  add column if not exists percentage_reward   numeric(5,2) not null default 1
        check (percentage_reward >= 0 and percentage_reward <= 100),
  add column if not exists referral_points     integer not null default 100
        check (referral_points >= 0),
  add column if not exists points_rules        jsonb not null
        default '{"perVisit":0,"perReferral":0,"perReview":0}'::jsonb,
  add column if not exists reward_campaigns    text[] not null default '{}';

-- A practice cannot list the same live service twice.
create unique index if not exists services_practice_name_live_idx
  on services (practice_id, lower(name)) where deleted_at is null;


-- ---------------------------------------------------------------------
-- Practice doctors
-- ---------------------------------------------------------------------

create table if not exists practice_doctors (
  id             uuid primary key default gen_random_uuid(),
  practice_id    uuid not null references practices(id) on delete cascade,
  name           text not null,
  specialization text,
  availability   jsonb not null default '{}'::jsonb,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists practice_doctors_name_live_idx
  on practice_doctors (practice_id, lower(name)) where deleted_at is null;

drop trigger if exists practice_doctors_touch on practice_doctors;
create trigger practice_doctors_touch before update on practice_doctors
  for each row execute function set_updated_at();

alter table practice_doctors enable row level security;

drop policy if exists practice_doctors_staff_all on practice_doctors;
create policy practice_doctors_staff_all on practice_doctors
  for all using (auth_is_practice_member(practice_id))
  with check (auth_is_practice_member(practice_id));

drop policy if exists practice_doctors_patient_read on practice_doctors;
create policy practice_doctors_patient_read on practice_doctors
  for select using (
    deleted_at is null and practice_id in (select auth_patient_practices())
  );

-- Appointments now reference practice_doctors. Any doctor_id written before
-- this migration pointed at a login profile, which is not a valid value here.
alter table appointments drop constraint if exists appointments_doctor_id_fkey;
update appointments set doctor_id = null where doctor_id is not null;
alter table appointments
  add constraint appointments_doctor_id_fkey
  foreign key (doctor_id) references practice_doctors(id) on delete set null;


-- ---------------------------------------------------------------------
-- Replace a practice's services / doctors in one call
-- ---------------------------------------------------------------------
-- security invoker: the caller's row level security still applies, and each
-- function also checks membership so a non-member gets a clear error.

create or replace function replace_practice_services(p_practice_id uuid, p_items jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
begin
  if not auth_is_practice_member(p_practice_id) then
    raise exception 'not a member of this practice' using errcode = '42501';
  end if;

  -- drop what is no longer listed
  update services s set deleted_at = now()
   where s.practice_id = p_practice_id and s.deleted_at is null
     and not exists (
       select 1 from jsonb_array_elements(v_items) i
        where lower(btrim(i->>'name')) = lower(s.name));

  -- update what is still listed
  update services s
     set price       = coalesce((i->>'price')::numeric, 0),
         description = nullif(i->>'description', '')
    from jsonb_array_elements(v_items) i
   where s.practice_id = p_practice_id and s.deleted_at is null
     and lower(btrim(i->>'name')) = lower(s.name);

  -- add what is new (first occurrence wins if the list repeats a name)
  insert into services (practice_id, name, price, description)
  select p_practice_id, n.name, n.price, n.description
    from (
      select distinct on (lower(btrim(i->>'name')))
             btrim(i->>'name')                          as name,
             coalesce((i->>'price')::numeric, 0)        as price,
             nullif(i->>'description', '')              as description
        from jsonb_array_elements(v_items) i
       where btrim(coalesce(i->>'name', '')) <> ''
    ) n
   where not exists (
     select 1 from services s
      where s.practice_id = p_practice_id and s.deleted_at is null
        and lower(s.name) = lower(n.name));
end $$;

create or replace function replace_practice_doctors(p_practice_id uuid, p_items jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
begin
  if not auth_is_practice_member(p_practice_id) then
    raise exception 'not a member of this practice' using errcode = '42501';
  end if;

  update practice_doctors d set deleted_at = now()
   where d.practice_id = p_practice_id and d.deleted_at is null
     and not exists (
       select 1 from jsonb_array_elements(v_items) i
        where lower(btrim(i->>'name')) = lower(d.name));

  update practice_doctors d
     set specialization = nullif(i->>'specialization', ''),
         availability   = coalesce(i->'availability', '{}'::jsonb)
    from jsonb_array_elements(v_items) i
   where d.practice_id = p_practice_id and d.deleted_at is null
     and lower(btrim(i->>'name')) = lower(d.name);

  insert into practice_doctors (practice_id, name, specialization, availability)
  select p_practice_id, n.name, n.specialization, n.availability
    from (
      select distinct on (lower(btrim(i->>'name')))
             btrim(i->>'name')                           as name,
             nullif(i->>'specialization', '')            as specialization,
             coalesce(i->'availability', '{}'::jsonb)    as availability
        from jsonb_array_elements(v_items) i
       where btrim(coalesce(i->>'name', '')) <> ''
    ) n
   where not exists (
     select 1 from practice_doctors d
      where d.practice_id = p_practice_id and d.deleted_at is null
        and lower(d.name) = lower(n.name));
end $$;

revoke execute on function replace_practice_services(uuid, jsonb) from public;
revoke execute on function replace_practice_doctors(uuid, jsonb)  from public;
grant  execute on function replace_practice_services(uuid, jsonb) to authenticated;
grant  execute on function replace_practice_doctors(uuid, jsonb)  to authenticated;


-- Practice logos are stored in the practice-branding bucket created by
-- 0003_practice_branding.sql, so this migration adds no storage bucket.

commit;
