-- =====================================================================
-- Care Africa — 0001: schema
-- =====================================================================
-- Complete schema for a fresh Supabase project. No legacy assumptions.
-- Policies live in 0002_rls.sql; run this first.
--
-- Conventions
--   * every tenant-scoped table carries practice_id
--   * money is numeric(12,2); the practice declares its currency
--   * soft delete via deleted_at on catalogue tables only
--   * timestamps are timestamptz, defaulted to now()
-- =====================================================================

begin;

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type user_role           as enum ('patient','staff','doctor','practice_admin');
create type appointment_status  as enum ('requested','scheduled','arrived','waiting','in_room','completed','cancelled','no_show');
create type consultation_status as enum ('scheduled','in_progress','completed','cancelled','no_show');
create type condition_status    as enum ('active','resolved','managed');
create type visit_type          as enum ('consultation','follow_up','walk_in','emergency','procedure');
create type document_type       as enum ('lab_result','imaging','referral','consent','prescription','other');
create type message_type        as enum ('text','image','file','system','ai');
create type claim_status        as enum ('draft','submitted','accepted','rejected','paid','partially_paid');
create type order_status        as enum ('draft','pending','paid','refunded','cancelled');
create type payment_method      as enum ('cash','card','eft','medical_aid','points','other');
create type claim_line_source   as enum ('product','service','consultation');


-- ---------------------------------------------------------------------
-- Tenancy and identity
-- ---------------------------------------------------------------------

create table practices (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            citext not null unique,
  email           citext,
  phone           text,
  address_line1   text,
  address_line2   text,
  city            text,
  province        text,
  postal_code     text,
  country_code    char(2) not null default 'ZA',
  timezone        text    not null default 'Africa/Johannesburg',
  currency_code   char(3) not null default 'ZAR',
  logo_url        text,
  setup_completed boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One row per authenticated user, staff or patient.
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null default 'patient',
  full_name  text not null default '',
  email      citext,
  phone      text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Staff membership. Many-to-many so a locum can work across practices.
create table practice_members (
  id             uuid primary key default gen_random_uuid(),
  practice_id    uuid not null references practices(id) on delete cascade,
  profile_id     uuid not null references profiles(id)  on delete cascade,
  role           user_role not null default 'staff',
  specialization text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (practice_id, profile_id),
  constraint practice_members_role_is_staff
    check (role in ('staff','doctor','practice_admin'))
);

create index practice_members_profile_idx  on practice_members(profile_id)  where is_active;
create index practice_members_practice_idx on practice_members(practice_id) where is_active;

-- Bookable services, priced per practice.
create table services (
  id               uuid primary key default gen_random_uuid(),
  practice_id      uuid not null references practices(id) on delete cascade,
  name             text not null,
  description      text,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  price            numeric(12,2) not null default 0 check (price >= 0),
  is_active        boolean not null default true,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index services_practice_idx on services(practice_id) where deleted_at is null;


-- ---------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------
-- profile_id is nullable on purpose: staff create records for people who
-- have never registered. Linking happens later, when they sign up.

create table patients (
  id             uuid primary key default gen_random_uuid(),
  practice_id    uuid not null references practices(id) on delete cascade,
  profile_id     uuid references profiles(id) on delete set null,
  first_name     text not null,
  last_name      text not null default '',
  full_name      text generated always as (btrim(first_name || ' ' || last_name)) stored,
  email          citext,
  phone          text,
  address_line1  text,
  address_line2  text,
  city           text,
  province       text,
  postal_code    text,
  date_of_birth  date,
  gender         text,
  id_number      text,
  blood_type     text,
  allergies      text[] not null default '{}',
  points         integer not null default 0,
  is_active      boolean not null default true,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- A given login maps to at most one record per practice.
create unique index patients_profile_practice_idx
  on patients(profile_id, practice_id) where profile_id is not null;

-- Email is NOT unique: families share addresses. Indexed for lookup only.
create index patients_practice_email_idx on patients(practice_id, email);
create index patients_practice_name_idx  on patients(practice_id, full_name);


-- ---------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------
-- Walk-ins were the reason the old schema stored patient names as loose
-- strings. Handled here by allowing a null patient_id with a walk_in_name
-- instead, so registered patients always get a real foreign key.

create table appointments (
  id               uuid primary key default gen_random_uuid(),
  practice_id      uuid not null references practices(id) on delete cascade,
  patient_id       uuid references patients(id) on delete set null,
  walk_in_name     text,
  walk_in_phone    text,
  service_id       uuid references services(id) on delete set null,
  doctor_id        uuid references profiles(id) on delete set null,
  scheduled_for    timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  status           appointment_status not null default 'scheduled',
  source           text not null default 'staff',
  notes            text,
  arrived_at       timestamptz,
  wait_started_at  timestamptz,
  seen_at          timestamptz,
  completed_at     timestamptz,
  created_by       uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint appointments_has_subject
    check (patient_id is not null or walk_in_name is not null)
);

create index appointments_practice_time_idx on appointments(practice_id, scheduled_for desc);
create index appointments_patient_idx       on appointments(patient_id, scheduled_for desc);
create index appointments_doctor_idx        on appointments(doctor_id, scheduled_for desc);
create index appointments_status_idx        on appointments(practice_id, status);


-- ---------------------------------------------------------------------
-- Retail
-- ---------------------------------------------------------------------

create table products (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null references practices(id) on delete cascade,
  name          text not null,
  description   text,
  sku           text,
  price         numeric(12,2) not null default 0 check (price >= 0),
  cost          numeric(12,2) check (cost >= 0),
  current_stock integer not null default 0,
  reorder_level integer not null default 0,
  is_active     boolean not null default true,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (practice_id, sku)
);

create index products_practice_idx on products(practice_id) where deleted_at is null;

create table product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  storage_path text not null,
  position     smallint not null default 0,
  created_at   timestamptz not null default now()
);

create index product_images_product_idx on product_images(product_id, position);

-- Line items are a table, not a jsonb blob, so stock and revenue can be
-- queried without unpacking JSON in the client.
create table orders (
  id             uuid primary key default gen_random_uuid(),
  practice_id    uuid not null references practices(id) on delete cascade,
  patient_id     uuid references patients(id) on delete set null,
  order_number   text not null,
  status         order_status not null default 'draft',
  payment_method payment_method,
  subtotal       numeric(12,2) not null default 0,
  discount       numeric(12,2) not null default 0 check (discount >= 0),
  total          numeric(12,2) not null default 0,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (practice_id, order_number)
);

create index orders_practice_idx on orders(practice_id, created_at desc);
create index orders_patient_idx  on orders(patient_id, created_at desc);

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  service_id  uuid references services(id) on delete set null,
  description text not null,
  quantity    integer not null default 1 check (quantity > 0),
  unit_price  numeric(12,2) not null default 0 check (unit_price >= 0),
  line_total  numeric(12,2) generated always as (quantity * unit_price) stored,
  constraint order_items_has_subject
    check (product_id is not null or service_id is not null or description <> '')
);

create index order_items_order_idx on order_items(order_id);


-- ---------------------------------------------------------------------
-- Loyalty
-- ---------------------------------------------------------------------

create table rewards (
  id          uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  name        text not null,
  description text,
  points_cost integer not null check (points_cost > 0),
  service_id  uuid references services(id) on delete set null,
  is_active   boolean not null default true,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index rewards_practice_idx on rewards(practice_id) where deleted_at is null;

create table reward_claims (
  id              uuid primary key default gen_random_uuid(),
  practice_id     uuid not null references practices(id) on delete cascade,
  patient_id      uuid not null references patients(id) on delete cascade,
  reward_id       uuid not null references rewards(id)  on delete restrict,
  points_used     integer not null check (points_used > 0),
  redemption_code text not null,
  is_redeemed     boolean not null default false,
  redeemed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (practice_id, redemption_code)
);

create index reward_claims_patient_idx on reward_claims(patient_id, created_at desc);

-- Points balance is derived from an append-only ledger and cached on
-- patients.points by trigger. Storing only a running integer makes every
-- bug permanent and unauditable.
create table points_ledger (
  id              uuid primary key default gen_random_uuid(),
  practice_id     uuid not null references practices(id) on delete cascade,
  patient_id      uuid not null references patients(id) on delete cascade,
  delta           integer not null check (delta <> 0),
  reason          text not null,
  order_id        uuid references orders(id)        on delete set null,
  reward_claim_id uuid references reward_claims(id) on delete set null,
  created_by      uuid references profiles(id)      on delete set null,
  created_at      timestamptz not null default now()
);

create index points_ledger_patient_idx on points_ledger(patient_id, created_at desc);

create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null references practices(id) on delete cascade,
  created_by    uuid references profiles(id) on delete set null,
  template_name text not null,
  category      text not null,
  points        integer not null default 0,
  value         numeric(12,2) not null default 0,
  description   text,
  is_active     boolean not null default true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index campaigns_practice_idx on campaigns(practice_id) where is_active;


-- ---------------------------------------------------------------------
-- Clinical
-- ---------------------------------------------------------------------

create table consultations (
  id                    uuid primary key default gen_random_uuid(),
  practice_id           uuid not null references practices(id)   on delete cascade,
  patient_id            uuid not null references patients(id)    on delete cascade,
  doctor_id             uuid references profiles(id)             on delete set null,
  appointment_id        uuid references appointments(id)         on delete set null,
  scheduled_at          timestamptz not null,
  started_at            timestamptz,
  ended_at              timestamptz,
  duration_minutes      integer,
  status                consultation_status not null default 'scheduled',
  symptoms              text[] not null default '{}',
  diagnosis             text,
  notes                 text,
  follow_up_recommended boolean not null default false,
  follow_up_date        date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index consultations_patient_idx  on consultations(patient_id, scheduled_at desc);
create index consultations_practice_idx on consultations(practice_id, scheduled_at desc);
create index consultations_doctor_idx   on consultations(doctor_id, scheduled_at desc);

create table prescriptions (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  medication      text not null,
  dosage          text,
  frequency       text,
  duration        text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index prescriptions_consultation_idx on prescriptions(consultation_id);

-- Standing medication list, distinct from a one-off prescription.
create table patient_medications (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id)  on delete cascade,
  practice_id   uuid not null references practices(id) on delete cascade,
  name          text not null,
  dosage        text,
  frequency     text,
  start_date    date,
  end_date      date,
  prescribed_by uuid references profiles(id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index patient_medications_patient_idx on patient_medications(patient_id);

create table patient_conditions (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients(id)  on delete cascade,
  practice_id    uuid not null references practices(id) on delete cascade,
  name           text not null,
  diagnosed_date date,
  status         condition_status not null default 'active',
  notes          text,
  created_at     timestamptz not null default now()
);

create index patient_conditions_patient_idx on patient_conditions(patient_id);

create table patient_visits (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references patients(id)  on delete cascade,
  practice_id      uuid not null references practices(id) on delete cascade,
  consultation_id  uuid references consultations(id) on delete set null,
  visited_at       timestamptz not null default now(),
  visit_type       visit_type not null default 'consultation',
  chief_complaint  text,
  diagnosis        text,
  treatment        text,
  notes            text,
  bp_systolic      smallint check (bp_systolic between 40 and 300),
  bp_diastolic     smallint check (bp_diastolic between 20 and 200),
  heart_rate       smallint check (heart_rate between 20 and 300),
  temperature_c    numeric(4,1) check (temperature_c between 25 and 45),
  respiratory_rate smallint check (respiratory_rate between 4 and 90),
  weight_kg        numeric(5,2) check (weight_kg > 0),
  height_cm        numeric(5,2) check (height_cm > 0),
  bmi              numeric(4,1) generated always as (
    case when height_cm is not null and height_cm > 0 and weight_kg is not null
         then round((weight_kg / ((height_cm / 100) ^ 2))::numeric, 1)
    end
  ) stored,
  created_at       timestamptz not null default now()
);

create index patient_visits_patient_idx on patient_visits(patient_id, visited_at desc);

-- Files live in Supabase Storage; this holds the pointer and metadata.
create table patient_documents (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id)  on delete cascade,
  practice_id  uuid not null references practices(id) on delete cascade,
  doc_type     document_type not null default 'other',
  title        text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index patient_documents_patient_idx on patient_documents(patient_id, created_at desc);


-- ---------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------

create table chats (
  id              uuid primary key default gen_random_uuid(),
  practice_id     uuid not null references practices(id) on delete cascade,
  patient_id      uuid not null references patients(id)  on delete cascade,
  consultation_id uuid references consultations(id) on delete set null,
  subject         text,
  is_ai           boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index chats_patient_idx  on chats(patient_id, updated_at desc);
create index chats_practice_idx on chats(practice_id, updated_at desc);

create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references chats(id) on delete cascade,
  sender_id  uuid references profiles(id) on delete set null,  -- null = AI
  content    text not null,
  msg_type   message_type not null default 'text',
  created_at timestamptz not null default now()
);

create index chat_messages_chat_idx on chat_messages(chat_id, created_at);


-- ---------------------------------------------------------------------
-- Billing
-- ---------------------------------------------------------------------

create table claims (
  id                 uuid primary key default gen_random_uuid(),
  practice_id        uuid not null references practices(id) on delete cascade,
  patient_id         uuid not null references patients(id)  on delete cascade,
  consultation_id    uuid references consultations(id) on delete set null,
  claim_number       text,
  medical_aid_scheme text,
  member_number      text,
  amount_claimed     numeric(12,2) not null default 0 check (amount_claimed >= 0),
  amount_paid        numeric(12,2) not null default 0 check (amount_paid >= 0),
  status             claim_status not null default 'draft',
  submitted_at       timestamptz,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (practice_id, claim_number)
);

create index claims_patient_idx  on claims(patient_id, created_at desc);
create index claims_practice_idx on claims(practice_id, status);


-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'practices','profiles','services','patients','appointments','products',
    'orders','rewards','reward_claims','campaigns','consultations',
    'patient_medications','chats','claims'
  ] loop
    execute format(
      'create trigger %1$s_touch before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- Keep patients.points in step with the ledger.
create or replace function apply_points_delta()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update patients set points = points + new.delta where id = new.patient_id;
  elsif tg_op = 'DELETE' then
    update patients set points = points - old.delta where id = old.patient_id;
  end if;
  return null;
end $$;

create trigger points_ledger_apply
  after insert or delete on points_ledger
  for each row execute function apply_points_delta();

-- Runs whenever someone signs up.
--
-- Every signup gets a profile. A signup that supplies a practice_name (the
-- practice registration form) also gets a new practice and becomes its admin.
--
-- Nothing here trusts a client-supplied role. raw_user_meta_data is whatever the
-- browser sent to signUp(), so anyone could claim {"role": "practice_admin"}.
-- The role is derived only from whether a practice was actually created.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_practice_name text := nullif(btrim(new.raw_user_meta_data->>'practice_name'), '');
  v_practice_id   uuid;
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when v_practice_name is not null then 'practice_admin'::user_role
         else 'patient'::user_role end
  )
  on conflict (id) do nothing;

  if v_practice_name is not null then
    insert into practices (name, slug, email)
    values (
      v_practice_name,
      coalesce(nullif(trim(both '-' from lower(regexp_replace(v_practice_name, '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'practice')
        || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
      new.email
    )
    returning id into v_practice_id;

    insert into practice_members (practice_id, profile_id, role)
    values (v_practice_id, new.id, 'practice_admin');
  end if;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

commit;
