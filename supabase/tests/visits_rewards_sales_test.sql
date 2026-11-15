-- =====================================================================
-- Care Africa — tests for 0005 (visits, rewards, sales)
-- =====================================================================
-- Seeds data, asserts, then rolls back. Run against a local or staging
-- database, not production:
--
--   psql "$DATABASE_URL" -f supabase/tests/visits_rewards_sales_test.sql
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

insert into practices (id, name, slug, percentage_reward) values
 ('11111111-1111-1111-1111-111111111111','Test Practice A','test-a', 10),
 ('22222222-2222-2222-2222-222222222222','Test Practice B','test-b', 10);

insert into auth.users (id, email) values
 ('a1111111-0000-0000-0000-000000000002','staff.a@test'),
 ('a2222222-0000-0000-0000-000000000001','staff.b@test');

insert into practice_members (practice_id, profile_id, role) values
 ('11111111-1111-1111-1111-111111111111','a1111111-0000-0000-0000-000000000002','staff'),
 ('22222222-2222-2222-2222-222222222222','a2222222-0000-0000-0000-000000000001','staff');

insert into patients (id, practice_id, first_name, last_name) values
 ('c1111111-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Thandi','M');

insert into appointments (id, practice_id, patient_id, scheduled_for, status) values
 ('d1111111-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
  'c1111111-0000-0000-0000-000000000001', now(), 'in_room');
insert into appointment_services (appointment_id, name, price) values
 ('d1111111-0000-0000-0000-000000000001','Check-up', 450),
 ('d1111111-0000-0000-0000-000000000001','Cleaning', 600);

insert into rewards (id, practice_id, name, points_cost, type, discount_percentage) values
 ('e1111111-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','10% off', 50, 'discount', 10),
 ('e1111111-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Big reward', 5000, 'free', null);

insert into products (id, practice_id, name, price, current_stock) values
 ('f1111111-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Toothpaste', 80, 10);

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;

do $$
declare
  sa uuid := 'a1111111-0000-0000-0000-000000000002';
  sb uuid := 'a2222222-0000-0000-0000-000000000001';
  appt text := '''d1111111-0000-0000-0000-000000000001''';
  pat  text := '''c1111111-0000-0000-0000-000000000001''';
  pa   text := '''11111111-1111-1111-1111-111111111111''';
  code text;
begin
  -- Visits
  perform _assert('other practice cannot complete the visit',
    left(_as(sb, 'select complete_appointment(' || appt || ')'), 6), 'ERROR:');
  perform _assert('completing awards 10% of R1,050 = 105 points',
    _as(sa, 'select complete_appointment(' || appt || ')'), '105');
  perform _assert('visit marked completed',
    (select status::text from appointments where id = 'd1111111-0000-0000-0000-000000000001'), 'completed');
  perform _assert('completing again awards nothing more',
    _as(sa, 'select complete_appointment(' || appt || ')'), '0');
  perform _assert('member balance is 105',
    (select points::text from patients where id = 'c1111111-0000-0000-0000-000000000001'), '105');

  -- Rewards
  perform _assert('cannot claim without enough points',
    left(_as(sa, 'select redemption_code from claim_reward(' || pat || ', ''e1111111-0000-0000-0000-000000000002'')'), 100),
    'ERROR:Not enough points: 5000 needed, 105 available');
  code := _as(sa, 'select redemption_code from claim_reward(' || pat || ', ''e1111111-0000-0000-0000-000000000001'')');
  perform _assert('claim returns an 8-character code', length(code)::text, '8');
  perform _assert('claim spends 50 points',
    (select points::text from patients where id = 'c1111111-0000-0000-0000-000000000001'), '55');
  perform _assert('other practice cannot use the code',
    left(_as(sb, 'select reward_name from redeem_reward_code(' || pa || ', ''' || code || ''')'), 6), 'ERROR:');

  -- Sales: stock problem rolls back everything
  perform _assert('order with too little stock is refused',
    left(_as(sa, 'select order_number from create_order(' || pa || ', ' || pat ||
      ', ''[{"product_id":"f1111111-0000-0000-0000-000000000001","quantity":99}]'')'), 6), 'ERROR:');
  perform _assert('refused order left stock untouched',
    (select current_stock::text from products where id = 'f1111111-0000-0000-0000-000000000001'), '10');
  perform _assert('refused order saved nothing', (select count(*)::text from orders), '0');

  -- Sales: a normal sale with a 10% voucher
  perform _assert('sale with voucher: 2 x R80 less 10% = R144',
    _as(sa, 'select total from create_order(' || pa || ', ' || pat ||
      ', ''[{"product_id":"f1111111-0000-0000-0000-000000000001","quantity":2}]'', ''cash'', ''' || code || ''')'), '144.00');
  perform _assert('order number assigned', (select order_number from orders), 'ORD-00001');
  perform _assert('stock reduced by 2',
    (select current_stock::text from products where id = 'f1111111-0000-0000-0000-000000000001'), '8');
  perform _assert('sale earned 14 points (10% of R144)',
    (select points::text from patients where id = 'c1111111-0000-0000-0000-000000000001'), '69');
  perform _assert('voucher code is now used',
    left(_as(sa, 'select reward_name from redeem_reward_code(' || pa || ', ''' || code || ''')'), 100),
    'ERROR:This reward code has already been used');
  perform _assert('ledger explains the balance',
    (select string_agg(reason || ':' || delta, ',' order by reason) from points_ledger),
    'purchase:14,reward_claim:-50,visit:105');

  raise notice '---- all visit, reward and sales assertions passed ----';
end $$;

drop function _assert(text, text, text);
drop function _as(uuid, text);

rollback;
