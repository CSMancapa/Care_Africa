-- =====================================================================
-- Care Africa — 0002: row level security
-- =====================================================================
-- Run after 0001_schema.sql.
--
-- Model
--   staff    read/write everything at practices they belong to
--   patients read only rows resolving to their own patient record, and
--            write only the few things a portal legitimately creates:
--            appointment requests, reward claims, chat messages, and
--            their own contact details
--
-- Anything not matched by a policy is denied. RLS is enabled on every
-- table, including ones patients never touch, so a future portal feature
-- cannot accidentally read a table that was left open.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
-- security definer so policies can consult membership without recursing
-- into the RLS on the tables they read.

create or replace function auth_is_practice_member(target_practice uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from practice_members
    where profile_id = auth.uid()
      and practice_id = target_practice
      and is_active
  );
$$;

create or replace function auth_owns_patient(target_patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from patients
    where id = target_patient and profile_id = auth.uid()
  );
$$;

-- Either the patient themselves, or staff at the practice holding the row.
create or replace function auth_can_read_patient(target_patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from patients p
    where p.id = target_patient
      and (p.profile_id = auth.uid() or auth_is_practice_member(p.practice_id))
  );
$$;

-- Practice admin check. Must be security definer for the same reason as
-- the above: policies on practice_members would otherwise recurse into
-- practice_members when evaluating themselves.
create or replace function auth_is_practice_admin(target_practice uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from practice_members
    where profile_id = auth.uid()
      and practice_id = target_practice
      and role = 'practice_admin'
      and is_active
  );
$$;

-- True when the caller and the target profile are staff at a shared practice.
create or replace function auth_shares_practice_with(target_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from practice_members me
    join practice_members them on them.practice_id = me.practice_id
    where me.profile_id = auth.uid() and me.is_active
      and them.profile_id = target_profile and them.is_active
  );
$$;

-- Practices where the caller is a registered patient.
create or replace function auth_patient_practices()
returns setof uuid language sql stable security definer set search_path = public as $$
  select practice_id from patients where profile_id = auth.uid();
$$;

revoke execute on function auth_is_practice_member(uuid) from public;
revoke execute on function auth_is_practice_admin(uuid)  from public;
grant  execute on function auth_is_practice_admin(uuid)  to authenticated;
revoke execute on function auth_owns_patient(uuid)       from public;
revoke execute on function auth_can_read_patient(uuid)   from public;
revoke execute on function auth_patient_practices()      from public;
grant  execute on function auth_is_practice_member(uuid) to authenticated;
grant  execute on function auth_owns_patient(uuid)       to authenticated;
grant  execute on function auth_can_read_patient(uuid)   to authenticated;
grant  execute on function auth_patient_practices()      to authenticated;
revoke execute on function auth_shares_practice_with(uuid) from public;
grant  execute on function auth_shares_practice_with(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'practices','profiles','practice_members','services','patients',
    'appointments','products','product_images','orders','order_items',
    'rewards','reward_claims','points_ledger','campaigns','consultations',
    'prescriptions','patient_medications','patient_conditions',
    'patient_visits','patient_documents','chats','chat_messages','claims'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------

create policy profiles_self_rw on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- staff can see colleagues at shared practices
create policy profiles_colleague_read on profiles
  for select using (auth_shares_practice_with(profiles.id));

create policy practice_members_read on practice_members
  for select using (profile_id = auth.uid() or auth_is_practice_member(practice_id));

create policy practice_members_admin_write on practice_members
  for all using (auth_is_practice_admin(practice_id))
  with check (auth_is_practice_admin(practice_id));


-- ---------------------------------------------------------------------
-- Practices
-- ---------------------------------------------------------------------

create policy practices_read on practices
  for select using (
    auth_is_practice_member(id) or id in (select auth_patient_practices())
  );

create policy practices_admin_write on practices
  for update using (auth_is_practice_admin(id))
  with check (auth_is_practice_admin(id));


-- ---------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------

create policy patients_staff_all on patients
  for all using (auth_is_practice_member(practice_id))
  with check (auth_is_practice_member(practice_id));

create policy patients_self_read on patients
  for select using (profile_id = auth.uid());

-- A patient may correct their own contact details. They cannot move
-- themselves to another practice or hand the record to someone else:
-- practice_id and profile_id are frozen by the trigger below.
create policy patients_self_update on patients
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create or replace function guard_patient_self_update()
returns trigger language plpgsql as $$
begin
  -- Only constrains a patient editing their own row through the API.
  -- Service-role calls (auth.uid() is null), internal triggers such as
  -- the points ledger, and practice staff all pass straight through.
  if auth.uid() is null
     or old.profile_id is distinct from auth.uid()
     or auth_is_practice_member(new.practice_id) then
    return new;
  end if;

  if new.practice_id is distinct from old.practice_id
     or new.profile_id is distinct from old.profile_id
     or new.points     is distinct from old.points
     or new.is_active  is distinct from old.is_active then
    raise exception 'patients: field not editable by patient';
  end if;
  return new;
end $$;

create trigger patients_self_update_guard
  before update on patients
  for each row execute function guard_patient_self_update();


-- ---------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------

create policy appointments_staff_all on appointments
  for all using (auth_is_practice_member(practice_id))
  with check (auth_is_practice_member(practice_id));

create policy appointments_patient_read on appointments
  for select using (auth_owns_patient(patient_id));

-- Patients request; staff confirm. Enforced by the status check.
create policy appointments_patient_request on appointments
  for insert with check (auth_owns_patient(patient_id) and status = 'requested');

create policy appointments_patient_cancel on appointments
  for update using (auth_owns_patient(patient_id))
  with check (auth_owns_patient(patient_id) and status in ('requested','cancelled'));


-- ---------------------------------------------------------------------
-- Catalogue: staff manage, patients browse at their own practice
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['services','products','rewards','campaigns'] loop
    execute format($f$
      create policy %1$s_staff_all on %1$s
        for all using (auth_is_practice_member(practice_id))
        with check (auth_is_practice_member(practice_id));

      create policy %1$s_patient_read on %1$s
        for select using (practice_id in (select auth_patient_practices()));
    $f$, t);
  end loop;
end $$;

create policy product_images_read on product_images
  for select using (
    exists (select 1 from products p
            where p.id = product_images.product_id
              and (auth_is_practice_member(p.practice_id)
                   or p.practice_id in (select auth_patient_practices())))
  );

create policy product_images_staff_write on product_images
  for all using (
    exists (select 1 from products p
            where p.id = product_images.product_id
              and auth_is_practice_member(p.practice_id))
  );


-- ---------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------

create policy orders_staff_all on orders
  for all using (auth_is_practice_member(practice_id))
  with check (auth_is_practice_member(practice_id));

create policy orders_patient_read on orders
  for select using (auth_owns_patient(patient_id));

create policy order_items_read on order_items
  for select using (
    exists (select 1 from orders o
            where o.id = order_items.order_id
              and (auth_is_practice_member(o.practice_id) or auth_owns_patient(o.patient_id)))
  );

create policy order_items_staff_write on order_items
  for all using (
    exists (select 1 from orders o
            where o.id = order_items.order_id and auth_is_practice_member(o.practice_id))
  );


-- ---------------------------------------------------------------------
-- Loyalty
-- ---------------------------------------------------------------------

create policy reward_claims_staff_all on reward_claims
  for all using (auth_is_practice_member(practice_id))
  with check (auth_is_practice_member(practice_id));

create policy reward_claims_patient_read on reward_claims
  for select using (auth_owns_patient(patient_id));

-- A patient may redeem for themselves, but cannot mark it fulfilled.
create policy reward_claims_patient_insert on reward_claims
  for insert with check (auth_owns_patient(patient_id) and is_redeemed = false);

-- The ledger is append-only and staff-written. Patients read their own
-- history; nobody edits it through the API.
create policy points_ledger_staff_write on points_ledger
  for insert with check (auth_is_practice_member(practice_id));

create policy points_ledger_read on points_ledger
  for select using (
    auth_is_practice_member(practice_id) or auth_owns_patient(patient_id)
  );


-- ---------------------------------------------------------------------
-- Clinical: staff write, patient reads own
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'consultations','patient_medications','patient_conditions',
    'patient_visits','patient_documents','claims'
  ] loop
    execute format($f$
      create policy %1$s_staff_all on %1$s
        for all using (auth_is_practice_member(practice_id))
        with check (auth_is_practice_member(practice_id));

      create policy %1$s_patient_read on %1$s
        for select using (auth_owns_patient(patient_id));
    $f$, t);
  end loop;
end $$;

-- prescriptions hang off a consultation and inherit its reachability
create policy prescriptions_read on prescriptions
  for select using (
    exists (select 1 from consultations c
            where c.id = prescriptions.consultation_id
              and auth_can_read_patient(c.patient_id))
  );

create policy prescriptions_staff_write on prescriptions
  for all using (
    exists (select 1 from consultations c
            where c.id = prescriptions.consultation_id
              and auth_is_practice_member(c.practice_id))
  );


-- ---------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------

create policy chats_read on chats
  for select using (auth_can_read_patient(patient_id));

create policy chats_staff_write on chats
  for all using (auth_is_practice_member(practice_id))
  with check (auth_is_practice_member(practice_id));

create policy chat_messages_read on chat_messages
  for select using (
    exists (select 1 from chats c
            where c.id = chat_messages.chat_id and auth_can_read_patient(c.patient_id))
  );

create policy chat_messages_insert on chat_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (select 1 from chats c
                where c.id = chat_messages.chat_id and auth_can_read_patient(c.patient_id))
  );

commit;
