-- =====================================================================
-- Care Africa — 0005 visits, rewards and sales
-- =====================================================================
-- What the app's Appointments, Rewards and Sales screens need on top of
-- the base schema, plus the database functions that keep points, stock
-- and reward codes consistent. Each function runs as the calling user
-- (security invoker), so row-level security still applies, and does all of
-- its writes in one transaction: a sale or a completed visit either saves
-- in full or not at all.
--
--   appointment_services   several services per visit, with the price charged
--   points_ledger          + appointment_id, so a visit's points are awarded once
--   rewards                + type (free/discount), product_id, discount_percentage
--   complete_appointment() marks a visit done and awards its points
--   claim_reward()         spends a patient's points and issues a code
--   redeem_reward_code()   uses a code once, at booking or at the till
--   create_order()         order + lines + stock + reward + points, together
--   products               + the fields the Inventory form already collects
--   product-images bucket  product photos, one folder per practice
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Services on a visit
-- ---------------------------------------------------------------------

create table if not exists appointment_services (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  service_id     uuid references services(id) on delete set null,
  name           text not null,                       -- as it was when booked
  price          numeric(12,2) not null default 0 check (price >= 0),
  created_at     timestamptz not null default now()
);

create index if not exists appointment_services_appointment_idx
  on appointment_services (appointment_id);

alter table appointment_services enable row level security;

drop policy if exists appointment_services_staff_all on appointment_services;
create policy appointment_services_staff_all on appointment_services
  for all using (
    exists (select 1 from appointments a
            where a.id = appointment_id and auth_is_practice_member(a.practice_id))
  ) with check (
    exists (select 1 from appointments a
            where a.id = appointment_id and auth_is_practice_member(a.practice_id))
  );

drop policy if exists appointment_services_patient_read on appointment_services;
create policy appointment_services_patient_read on appointment_services
  for select using (
    exists (select 1 from appointments a
            where a.id = appointment_id and auth_owns_patient(a.patient_id))
  );

-- ---------------------------------------------------------------------
-- Points: one award per visit
-- ---------------------------------------------------------------------

alter table points_ledger
  add column if not exists appointment_id uuid references appointments(id) on delete set null;

create unique index if not exists points_ledger_one_award_per_visit
  on points_ledger (appointment_id) where reason = 'visit';

-- ---------------------------------------------------------------------
-- Rewards: what kind of reward it is
-- ---------------------------------------------------------------------

-- A reward is either a free item or a percentage off, for a service or a
-- product (service_id / product_id). With neither, a discount applies to
-- the whole bill.
alter table rewards
  add column if not exists type text not null default 'free'
    check (type in ('free','discount')),
  add column if not exists product_id uuid references products(id) on delete set null,
  add column if not exists discount_percentage numeric(5,2)
    check (discount_percentage is null or (discount_percentage > 0 and discount_percentage <= 100)),
  add constraint rewards_discount_has_percentage
    check (type <> 'discount' or discount_percentage is not null);


-- ---------------------------------------------------------------------
-- Products: fields the Inventory form collects
-- ---------------------------------------------------------------------

alter table products
  add column if not exists category               text,
  add column if not exists is_online              boolean not null default false,
  add column if not exists is_in_practice         boolean not null default true,
  add column if not exists discount               numeric(12,2) not null default 0 check (discount >= 0),
  add column if not exists is_discount_percentage boolean not null default false,
  add column if not exists has_multiple_sizes     boolean not null default false,
  add column if not exists sizes                  jsonb not null default '[]'::jsonb;

-- Product photos: product-images/<practice_id>/<file>, readable by anyone
-- (they appear in the shop), written only by that practice's staff.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists product_images_staff_write on storage.objects;
create policy product_images_staff_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images'
              and auth_is_practice_member(((storage.foldername(name))[1])::uuid));

drop policy if exists product_images_staff_delete on storage.objects;
create policy product_images_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images'
         and auth_is_practice_member(((storage.foldername(name))[1])::uuid));


-- ---------------------------------------------------------------------
-- complete_appointment: mark a visit done and award its points once
-- ---------------------------------------------------------------------
-- Points = percentage_reward % of the services' total, rounded down.
-- Calling it again on a completed visit awards nothing more.

create or replace function complete_appointment(p_appointment_id uuid)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  v_appt   appointments%rowtype;
  v_total  numeric;
  v_pct    numeric;
  v_points integer := 0;
begin
  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found or not auth_is_practice_member(v_appt.practice_id) then
    raise exception 'Appointment not found';
  end if;

  update appointments
     set status = 'completed',
         completed_at = coalesce(completed_at, now()),
         seen_at = coalesce(seen_at, now())
   where id = p_appointment_id;

  if v_appt.patient_id is null then
    return 0;                                   -- walk-in without a member record
  end if;

  select coalesce(sum(price), 0) into v_total
    from appointment_services where appointment_id = p_appointment_id;
  select percentage_reward into v_pct from practices where id = v_appt.practice_id;
  v_points := floor(v_total * coalesce(v_pct, 0) / 100);

  if v_points > 0 then
    insert into points_ledger (practice_id, patient_id, delta, reason, appointment_id, created_by)
    values (v_appt.practice_id, v_appt.patient_id, v_points, 'visit', p_appointment_id, auth.uid())
    on conflict (appointment_id) where reason = 'visit' do nothing;
    if not found then
      v_points := 0;                            -- already awarded earlier
    end if;
  end if;

  return v_points;
end $$;


-- ---------------------------------------------------------------------
-- claim_reward: spend points, get a redemption code
-- ---------------------------------------------------------------------

create or replace function claim_reward(p_patient_id uuid, p_reward_id uuid)
returns table (claim_id uuid, redemption_code text, points_left integer)
language plpgsql security invoker set search_path = public as $$
declare
  v_patient patients%rowtype;
  v_reward  rewards%rowtype;
  v_code    text;
  v_claim   uuid;
begin
  select * into v_patient from patients where id = p_patient_id for update;
  if not found or not auth_is_practice_member(v_patient.practice_id) then
    raise exception 'Member not found';
  end if;

  select * into v_reward from rewards
   where id = p_reward_id and practice_id = v_patient.practice_id
     and deleted_at is null and is_active;
  if not found then
    raise exception 'Reward not found';
  end if;

  if v_patient.points < v_reward.points_cost then
    raise exception 'Not enough points: % needed, % available', v_reward.points_cost, v_patient.points;
  end if;

  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (select 1 from reward_claims c
                          where c.practice_id = v_patient.practice_id and c.redemption_code = v_code);
  end loop;

  insert into reward_claims (practice_id, patient_id, reward_id, points_used, redemption_code)
  values (v_patient.practice_id, p_patient_id, p_reward_id, v_reward.points_cost, v_code)
  returning id into v_claim;

  insert into points_ledger (practice_id, patient_id, delta, reason, reward_claim_id, created_by)
  values (v_patient.practice_id, p_patient_id, -v_reward.points_cost, 'reward_claim', v_claim, auth.uid());

  return query select v_claim, v_code, (select points from patients where id = p_patient_id);
end $$;


-- ---------------------------------------------------------------------
-- redeem_reward_code: use a code once
-- ---------------------------------------------------------------------

create or replace function redeem_reward_code(p_practice_id uuid, p_code text)
returns table (
  claim_id uuid, reward_id uuid, reward_name text, reward_type text,
  service_id uuid, product_id uuid, discount_percentage numeric, patient_id uuid
)
language plpgsql security invoker set search_path = public as $$
declare
  v_claim reward_claims%rowtype;
begin
  if not auth_is_practice_member(p_practice_id) then
    raise exception 'Not a member of this practice';
  end if;

  select * into v_claim from reward_claims c
   where c.practice_id = p_practice_id and c.redemption_code = upper(trim(p_code))
   for update;
  if not found then
    raise exception 'Invalid reward code';
  end if;
  if v_claim.is_redeemed then
    raise exception 'This reward code has already been used';
  end if;

  update reward_claims set is_redeemed = true, redeemed_at = now() where id = v_claim.id;

  return query
    select v_claim.id, r.id, r.name, r.type, r.service_id, r.product_id, r.discount_percentage, v_claim.patient_id
      from rewards r where r.id = v_claim.reward_id;
end $$;


-- ---------------------------------------------------------------------
-- create_order: a sale, all or nothing
-- ---------------------------------------------------------------------
-- p_items: [{"product_id": "...", "quantity": 2}, ...]  (prices come from
-- the products table, not the browser). Stock is reduced, an optional
-- reward code is used, and the member earns percentage_reward % of the
-- amount paid.

create or replace function create_order(
  p_practice_id    uuid,
  p_patient_id     uuid,
  p_items          jsonb,
  p_payment_method payment_method default 'cash',
  p_reward_code    text default null
)
returns table (order_id uuid, order_number text, total numeric, points_awarded integer)
language plpgsql security invoker set search_path = public as $$
declare
  v_order    uuid;
  v_number   text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total    numeric;
  v_pct      numeric;
  v_points   integer := 0;
  v_item     jsonb;
  v_product  products%rowtype;
  v_qty      integer;
  v_reward   record;
begin
  if not auth_is_practice_member(p_practice_id) then
    raise exception 'Not a member of this practice';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'An order needs at least one item';
  end if;
  if p_patient_id is not null and not exists
     (select 1 from patients where id = p_patient_id and practice_id = p_practice_id) then
    raise exception 'Member not found';
  end if;

  -- Order numbers count up per practice: ORD-00001, ORD-00002, ...
  perform pg_advisory_xact_lock(hashtext('orders:' || p_practice_id::text));
  select 'ORD-' || lpad((count(*) + 1)::text, 5, '0') into v_number
    from orders where practice_id = p_practice_id;

  insert into orders (practice_id, patient_id, order_number, status, payment_method, created_by)
  values (p_practice_id, p_patient_id, v_number, 'paid', p_payment_method, auth.uid())
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(coalesce((v_item->>'quantity')::int, 1), 1);
    select * into v_product from products
     where id = (v_item->>'product_id')::uuid and practice_id = p_practice_id
       and deleted_at is null
     for update;
    if not found then
      raise exception 'Product not found';
    end if;
    if v_product.current_stock < v_qty then
      raise exception 'Not enough stock of %: % left', v_product.name, v_product.current_stock;
    end if;

    insert into order_items (order_id, product_id, description, quantity, unit_price)
    values (v_order, v_product.id, v_product.name, v_qty, v_product.price);
    update products set current_stock = current_stock - v_qty where id = v_product.id;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  if p_reward_code is not null and trim(p_reward_code) <> '' then
    select * into v_reward from redeem_reward_code(p_practice_id, p_reward_code);
    if v_reward.service_id is not null then
      raise exception 'This reward is for a service. Use it when booking the visit.';
    end if;
    if v_reward.product_id is not null and not exists
       (select 1 from order_items oi where oi.order_id = v_order and oi.product_id = v_reward.product_id) then
      raise exception 'This reward is for a product that is not in this sale';
    end if;

    if v_reward.reward_type = 'free' then
      -- one unit of the rewarded product is free
      select coalesce(min(oi.unit_price), 0) into v_discount
        from order_items oi where oi.order_id = v_order and oi.product_id = v_reward.product_id;
    elsif v_reward.product_id is not null then
      -- percentage off that product's lines
      select round(coalesce(sum(oi.line_total), 0) * v_reward.discount_percentage / 100, 2) into v_discount
        from order_items oi where oi.order_id = v_order and oi.product_id = v_reward.product_id;
    else
      -- percentage off the whole bill
      v_discount := round(v_subtotal * v_reward.discount_percentage / 100, 2);
    end if;
  end if;

  v_total := greatest(v_subtotal - v_discount, 0);
  update orders set subtotal = v_subtotal, discount = v_discount, total = v_total where id = v_order;

  if p_patient_id is not null then
    select percentage_reward into v_pct from practices where id = p_practice_id;
    v_points := floor(v_total * coalesce(v_pct, 0) / 100);
    if v_points > 0 then
      insert into points_ledger (practice_id, patient_id, delta, reason, order_id, created_by)
      values (p_practice_id, p_patient_id, v_points, 'purchase', v_order, auth.uid());
    end if;
  end if;

  return query select v_order, v_number, v_total, v_points;
end $$;

grant execute on function complete_appointment(uuid) to authenticated;
grant execute on function claim_reward(uuid, uuid) to authenticated;
grant execute on function redeem_reward_code(uuid, text) to authenticated;
grant execute on function create_order(uuid, uuid, jsonb, payment_method, text) to authenticated;

commit;
