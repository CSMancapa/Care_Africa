-- =====================================================================
-- Care Africa — DEMO DATA (fictional practice, fictional patients)
-- =====================================================================
-- What it does
--   Fills the practice owned by the demo login with a believable practice:
--   branding, hours, 3 doctors, 6 services, 18 members, ~2 months of
--   completed visits with points, today's queue, upcoming bookings,
--   products, rewards, sales and a few claimed rewards.
--
-- How to use
--   1. Register the demo login in the deployed app first (Register page),
--      so the database creates the practice and makes that login its admin.
--   2. Change the email on the line marked  <<< DEMO LOGIN  below if needed.
--   3. Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
--
-- Safe to re-run: each run WIPES this one practice's patients, visits,
-- sales, rewards, products, services and doctors and rebuilds them, with
-- today's queue moved to today's date. Use it to reset before every demo.
-- It never touches any other practice.
--
-- NEVER run this against a database that holds real patient data.
-- =====================================================================

-- The app reads tables as the signed-in user. Some newer Supabase projects
-- don't grant table access to that role automatically; this makes sure it
-- has it. Row-level security still decides which rows each user can see.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
declare
  v_email    text := 'demo@careafrica.co.za';          -- <<< DEMO LOGIN
  v_uid      uuid;
  v_practice uuid;

  v_doc  uuid[];        -- 3 doctors
  v_svc  uuid[];        -- 6 services
  v_svc_name  text[] := array['Check-up & Clean','Filling','Teeth Whitening','Root Canal','Child Check-up','Emergency Visit'];
  v_svc_price numeric[] := array[650, 950, 2800, 4500, 450, 850];
  v_svc_mins  int[]     := array[45, 60, 90, 120, 30, 30];
  v_pat  uuid[] := '{}';
  v_prod uuid[];
  v_rew  uuid[];

  v_first text[] := array['Thandiwe','Sipho','Lerato','Johan','Ayesha','Pieter','Nomvula','Kagiso',
                          'Fatima','Bongani','Chantelle','Themba','Zanele','Riaan','Naledi','Mandla',
                          'Priya','Lindiwe'];
  v_last  text[] := array['Mokoena','Dlamini','Nkosi','van der Merwe','Patel','Botha','Khumalo','Molefe',
                          'Adams','Ndlovu','Jacobs','Mthembu','Zulu','Pretorius','Sithole','Ngcobo',
                          'Naidoo','Mahlangu'];

  v_appt  uuid;
  v_when  timestamptz;
  v_today date := (now() at time zone 'Africa/Johannesburg')::date;
  v_s     int;
  v_s2    int;
  v_total numeric;
  v_order uuid;
  v_claim uuid;
  v_n     int := 0;
  i int; d int; k int;
begin
  -- ---------- find the demo practice --------------------------------
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise exception 'No login % found. Register it in the app first (Register page), then run this again.', v_email;
  end if;

  select practice_id into v_practice
    from practice_members
   where profile_id = v_uid and role = 'practice_admin'
   order by created_at limit 1;
  if v_practice is null then
    raise exception 'Login % has no practice. Register through the app''s Register page, which creates one.', v_email;
  end if;

  -- ---------- wipe this practice's demo data -------------------------
  delete from reward_claims    where practice_id = v_practice;
  delete from orders           where practice_id = v_practice;
  delete from appointments     where practice_id = v_practice;
  delete from patients         where practice_id = v_practice;   -- cascades ledger
  delete from rewards          where practice_id = v_practice;
  delete from products         where practice_id = v_practice;
  delete from services         where practice_id = v_practice;
  delete from practice_doctors where practice_id = v_practice;

  -- ---------- practice profile & branding ----------------------------
  update practices set
    name                = 'Baywest Family Dental',
    email               = v_email,
    phone               = '041 555 0142',
    address_line1       = '12 Demo Street, Walmer',
    city                = 'Gqeberha',
    province            = 'Eastern Cape',
    postal_code         = '6070',
    category            = 'dental',
    brand_primary_color = '#0E7C7B',
    brand_accent_color  = '#F2A541',
    specialties         = array['General dentistry','Cosmetic dentistry','Paediatric dentistry'],
    accepted_insurances = array['Discovery Health','Bonitas','Momentum Health','GEMS','Medshield'],
    percentage_reward   = 5,
    referral_points     = 100,
    points_rules        = '{"perVisit":0,"perReferral":100,"perReview":25}'::jsonb,
    business_hours      = '{
      "monday":   {"start":"08:00","end":"17:00","isOpen":true},
      "tuesday":  {"start":"08:00","end":"17:00","isOpen":true},
      "wednesday":{"start":"08:00","end":"17:00","isOpen":true},
      "thursday": {"start":"08:00","end":"17:00","isOpen":true},
      "friday":   {"start":"08:00","end":"16:00","isOpen":true},
      "saturday": {"start":"08:30","end":"12:30","isOpen":true},
      "sunday":   {"start":"09:00","end":"13:00","isOpen":false}}'::jsonb,
    setup_completed     = true
  where id = v_practice;

  update profiles set full_name = 'Demo Admin' where id = v_uid and full_name = '';

  -- ---------- doctors -------------------------------------------------
  with ins as (
    insert into practice_doctors (practice_id, name, specialization) values
      (v_practice, 'Dr Naledi Khumalo', 'General Dentist'),
      (v_practice, 'Dr Ryan Pillay',    'Cosmetic Dentist'),
      (v_practice, 'Dr Anke Botha',     'Paediatric Dentist')
    returning id, name)
  select array_agg(id order by name) into v_doc from ins;   -- Botha, Khumalo, Pillay

  -- ---------- services ------------------------------------------------
  v_svc := '{}';
  for i in 1..6 loop
    insert into services (practice_id, name, duration_minutes, price)
    values (v_practice, v_svc_name[i], v_svc_mins[i], v_svc_price[i]) returning id into v_appt;
    v_svc := v_svc || v_appt;
  end loop;

  -- ---------- members (patients) -------------------------------------
  for i in 1..18 loop
        insert into patients (practice_id, first_name, last_name, email, phone,
                              city, province, date_of_birth, gender, notes, created_at)
        values (v_practice, v_first[i], v_last[i],
                lower(replace(v_first[i] || '.' || v_last[i], ' ', '')) || '@example.com',
                '07' || lpad(((i * 7919) % 100000000)::text, 8, '0'),
                'Gqeberha', 'Eastern Cape',
                date '1960-01-01' + ((i * 977) % 20000),
                case when i % 2 = 0 then 'male' else 'female' end,
                'Fictional demo member',
                now() - ((70 + i * 3) || ' days')::interval)
        returning id into v_appt;
    v_pat := v_pat || v_appt;
  end loop;

  -- ---------- past visits: ~8 weeks, completed, with points ---------
  for d in 1..56 loop
    v_when := ((v_today - d)::timestamp + time '08:30') at time zone 'Africa/Johannesburg';
    continue when extract(isodow from v_today - d) = 7;            -- closed Sundays
    for k in 0..(case when extract(isodow from v_today - d) = 6 then 1 else 2 end) loop
      v_n := v_n + 1;
      i    := 1 + (v_n * 7) % 18;
      v_s  := case when v_n % 9 = 0 then 3 when v_n % 13 = 0 then 4
                   when v_n % 5 = 0 then 2 when v_n % 7 = 0 then 5 else 1 end;
      insert into appointments (practice_id, patient_id, service_id, doctor_id,
                                scheduled_for, duration_minutes, status,
                                arrived_at, wait_started_at, seen_at, completed_at, created_at)
      values (v_practice, v_pat[i], v_svc[v_s], v_doc[1 + v_n % 3],
              v_when + (k * 150 || ' minutes')::interval, v_svc_mins[v_s], 'completed',
              v_when + (k * 150 - 6 || ' minutes')::interval,
              v_when + (k * 150 - 5 || ' minutes')::interval,
              v_when + (k * 150 + 4 + v_n % 18 || ' minutes')::interval,
              v_when + (k * 150 + 4 + v_n % 18 + v_svc_mins[v_s] || ' minutes')::interval,
              v_when - interval '5 days')
      returning id into v_appt;

      insert into appointment_services (appointment_id, service_id, name, price)
      values (v_appt, v_svc[v_s], v_svc_name[v_s], v_svc_price[v_s]);
      v_total := v_svc_price[v_s];
      if v_n % 6 = 0 and v_s = 1 then                             -- some visits get a 2nd service
        insert into appointment_services (appointment_id, service_id, name, price)
        values (v_appt, v_svc[2], v_svc_name[2], v_svc_price[2]);
        v_total := v_total + v_svc_price[2];
      end if;

      insert into points_ledger (practice_id, patient_id, delta, reason, appointment_id, created_by, created_at)
      values (v_practice, v_pat[i], floor(v_total * 5 / 100), 'visit', v_appt, v_uid,
              v_when + (k * 150 + 60 || ' minutes')::interval);
    end loop;
  end loop;

  -- a few no-shows and cancellations so the history looks real
  insert into appointments (practice_id, patient_id, service_id, doctor_id, scheduled_for, duration_minutes, status)
  values (v_practice, v_pat[4],  v_svc[1], v_doc[2], ((v_today - 9)::timestamp  + time '14:00') at time zone 'Africa/Johannesburg', 45, 'no_show'),
         (v_practice, v_pat[11], v_svc[5], v_doc[1], ((v_today - 16)::timestamp + time '10:30') at time zone 'Africa/Johannesburg', 30, 'cancelled'),
         (v_practice, v_pat[15], v_svc[2], v_doc[3], ((v_today - 23)::timestamp + time '15:00') at time zone 'Africa/Johannesburg', 60, 'no_show');

  -- ---------- today's queue (live demo) ------------------------------
  -- statuses: 2 done, 1 in the room, 2 waiting, 1 just arrived, 3 still to come
  for k in 1..9 loop
    i   := (array[2,6,9,13,1,17,3,8,12])[k];
    v_s := (array[1,5,1,2,1,5,3,1,6])[k];
    v_when := ((v_today)::timestamp + time '08:00' + (k * 50 || ' minutes')::interval) at time zone 'Africa/Johannesburg';
    insert into appointments (practice_id, patient_id, service_id, doctor_id, scheduled_for,
                              duration_minutes, status, arrived_at, wait_started_at, seen_at, completed_at)
    values (v_practice, v_pat[i], v_svc[v_s], v_doc[1 + k % 3], v_when, v_svc_mins[v_s],
            (array['completed','completed','in_room','waiting','waiting','arrived',
                   'scheduled','scheduled','scheduled'])[k]::appointment_status,
            case when k <= 6 then now() - ((7 - k) * 12 || ' minutes')::interval end,
            case when k <= 5 then now() - ((7 - k) * 11 || ' minutes')::interval end,
            case when k <= 3 then now() - ((4 - k) * 9  || ' minutes')::interval end,
            case when k <= 2 then now() - ((3 - k) * 4  || ' minutes')::interval end)
    returning id into v_appt;
    insert into appointment_services (appointment_id, service_id, name, price)
    values (v_appt, v_svc[v_s], v_svc_name[v_s], v_svc_price[v_s]);
    if k <= 2 then
      insert into points_ledger (practice_id, patient_id, delta, reason, appointment_id, created_by)
      values (v_practice, v_pat[i], floor(v_svc_price[v_s] * 5 / 100), 'visit', v_appt, v_uid);
    end if;
  end loop;

  -- ---------- upcoming bookings (next 2 weeks) -----------------------
  for d in 1..14 loop
    continue when extract(isodow from v_today + d) = 7;
    for k in 0..(case when d % 3 = 0 then 2 else 1 end) loop
      i   := 1 + (d * 5 + k * 3) % 18;
      v_s := case when (d + k) % 4 = 0 then 2 when (d + k) % 7 = 0 then 3 else 1 end;
      insert into appointments (practice_id, patient_id, service_id, doctor_id, scheduled_for,
                                duration_minutes, status, source)
      values (v_practice, v_pat[i], v_svc[v_s], v_doc[1 + (d + k) % 3],
              ((v_today + d)::timestamp + time '09:00' + (k * 120 || ' minutes')::interval) at time zone 'Africa/Johannesburg',
              v_svc_mins[v_s], 'scheduled', case when k = 1 then 'online' else 'staff' end)
      returning id into v_appt;
      insert into appointment_services (appointment_id, service_id, name, price)
      values (v_appt, v_svc[v_s], v_svc_name[v_s], v_svc_price[v_s]);
    end loop;
  end loop;

  -- ---------- products -----------------------------------------------
  with ins as (
    insert into products (practice_id, name, description, sku, category, price, cost,
                          current_stock, reorder_level, is_in_practice, is_online) values
      (v_practice, 'Electric Toothbrush',        'Rechargeable, 2-minute timer',   'BWD-001', 'Oral care', 899, 520, 14, 5, true, true),
      (v_practice, 'Whitening Toothpaste 75ml',  'Enamel-safe whitening',          'BWD-002', 'Oral care',  89,  41, 48, 15, true, true),
      (v_practice, 'Sensitive Toothpaste 75ml',  'For sensitive teeth',            'BWD-003', 'Oral care',  79,  36,  6, 15, true, false),
      (v_practice, 'Interdental Brushes (pack)', 'Assorted sizes, 8 brushes',      'BWD-004', 'Oral care',  65,  28, 30, 10, true, false),
      (v_practice, 'Kids Toothbrush',            'Soft bristles, ages 3-8',        'BWD-005', 'Kids',       45,  18, 22, 10, true, true),
      (v_practice, 'Mouthwash 500ml',            'Alcohol-free',                   'BWD-006', 'Oral care', 119,  55,  3, 8,  true, true)
    returning id, sku)
  select array_agg(id order by sku) into v_prod from ins;

  -- ---------- rewards -------------------------------------------------
  with ins as (
    insert into rewards (practice_id, name, description, points_cost, type, service_id, product_id, discount_percentage) values
      (v_practice, 'Free Kids Toothbrush',       'Collect at reception',            40,  'free',     null,      null,       null),
      (v_practice, 'Free Child Check-up',        'For one child under 12',          120, 'free',     v_svc[5],  null,       null),
      (v_practice, '20% off Teeth Whitening',    'Valid for 3 months after claim',  150, 'discount', v_svc[3],  null,       20),
      (v_practice, '15% off Electric Toothbrush','In-practice purchase only',       80,  'discount', null,      v_prod[1],  15)
    returning id, points_cost)
  select array_agg(id order by points_cost) into v_rew from ins;   -- 40, 80, 120, 150
  update rewards set product_id = v_prod[5] where id = v_rew[1];

  -- ---------- sales (last 30 days) -----------------------------------
  for k in 1..16 loop
    i := 1 + (k * 11) % 18;
    v_when := now() - ((k * 43) % 30 || ' days')::interval - ((k * 37) % 300 || ' minutes')::interval;
    v_s  := 1 + (k * 5) % 6;
    v_s2 := 1 + (k * 7) % 6;
    insert into orders (practice_id, patient_id, order_number, status, payment_method, created_by, created_at)
    values (v_practice, v_pat[i], 'ORD-' || lpad(k::text, 5, '0'), 'paid',
            (array['card','cash','eft','card'])[1 + k % 4]::payment_method, v_uid, v_when)
    returning id into v_order;
    insert into order_items (order_id, product_id, description, quantity, unit_price)
    select v_order, p.id, p.name, 1 + (k % 2), p.price from products p where p.id = v_prod[v_s];
    if v_s2 <> v_s and k % 3 = 0 then
      insert into order_items (order_id, product_id, description, quantity, unit_price)
      select v_order, p.id, p.name, 1, p.price from products p where p.id = v_prod[v_s2];
    end if;
    select sum(line_total) into v_total from order_items where order_id = v_order;
    update orders set subtotal = v_total, total = v_total where id = v_order;
    if floor(v_total * 5 / 100) > 0 then
      insert into points_ledger (practice_id, patient_id, delta, reason, order_id, created_by, created_at)
      values (v_practice, v_pat[i], floor(v_total * 5 / 100), 'purchase', v_order, v_uid, v_when);
    end if;
  end loop;

  -- ---------- claimed rewards (2 used, 1 waiting to be used) ---------
  for k in 1..3 loop
    -- members with the most points claim the cheapest rewards
    insert into reward_claims (practice_id, patient_id, reward_id, points_used, redemption_code,
                               is_redeemed, redeemed_at, created_at)
    select v_practice, p.id, v_rew[k], r.points_cost, 'DEMO' || lpad(k::text, 4, '0'),
           k < 3, case when k < 3 then now() - (k * 6 || ' days')::interval end,
           now() - (k * 7 || ' days')::interval
      from (select id from patients where practice_id = v_practice
             order by points desc offset k - 1 limit 1) p,
           rewards r where r.id = v_rew[k]
    returning id into v_claim;
    insert into points_ledger (practice_id, patient_id, delta, reason, reward_claim_id, created_by, created_at)
    select v_practice, c.patient_id, -c.points_used, 'reward_claim', c.id, v_uid, c.created_at
      from reward_claims c where c.id = v_claim;
  end loop;

  raise notice 'Demo practice ready: %', v_practice;
end $$;

-- Quick check: you should see one row with counts above zero.
select p.name,
       (select count(*) from patients     where practice_id = p.id) as members,
       (select count(*) from appointments where practice_id = p.id) as appointments,
       (select count(*) from appointments where practice_id = p.id
           and (scheduled_for at time zone 'Africa/Johannesburg')::date
               = (now() at time zone 'Africa/Johannesburg')::date) as today,
       (select count(*) from orders       where practice_id = p.id) as sales,
       (select sum(points) from patients  where practice_id = p.id) as points_outstanding
  from practices p
  join practice_members m on m.practice_id = p.id and m.role = 'practice_admin'
  join auth.users u on u.id = m.profile_id
 where lower(u.email) = lower('demo@careafrica.co.za');   -- <<< DEMO LOGIN (same as above)
