-- =====================================================================
-- Care Africa — 0006 practice modules
-- =====================================================================
-- Different kinds of practice get different features (decision of
-- 21 Nov 2026, see the project's practice-modules decision record):
--
--   * The retention core (bookings, waiting room, members, loyalty,
--     rewards, retail) is always on and has no switch.
--   * Clinical records have three levels:
--       off     no clinical screens (e.g. a massage studio)
--       intake  intake / contraindication forms only (spa, beauty)
--       full    full clinical notes, vitals, prescriptions
--   * Medical-aid claims are a separate module.
--
-- Who decides what:
--   * The practice type picked at onboarding suggests defaults (in the
--     app, src/lib/practiceTypes.ts).
--   * The subscription plan sets the limits, enforced here:
--       starter   clinical records up to "intake", no claims
--       practice  everything
--       network   everything
--   * A practice admin can change the modules within those limits.
--   * Only Care Africa (service role / SQL editor) can change the plan.
-- =====================================================================

begin;

alter table practices
  add column if not exists plan text not null default 'practice'
        check (plan in ('starter', 'practice', 'network')),
  add column if not exists clinical_records text not null default 'off'
        check (clinical_records in ('off', 'intake', 'full')),
  add column if not exists claims_enabled boolean not null default false;

comment on column practices.plan is
  'Subscription plan. Sets which modules are allowed. Changed by Care Africa only.';
comment on column practices.clinical_records is
  'Clinical records module: off, intake (forms only) or full (notes, vitals, prescriptions).';
comment on column practices.claims_enabled is
  'Medical-aid claims module.';

-- ---------------------------------------------------------------------
-- Plan limits and who may change the plan
-- ---------------------------------------------------------------------
create or replace function enforce_practice_plan()
returns trigger language plpgsql as $$
declare
  -- App users reach the database as anon/authenticated. Care Africa staff
  -- use the service role or the SQL editor (postgres).
  v_is_app_user boolean := current_user in ('anon', 'authenticated');
begin
  if v_is_app_user then
    if tg_op = 'INSERT' and new.plan is distinct from 'practice' then
      raise exception 'Only Care Africa can choose a practice''s plan'
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.plan is distinct from old.plan then
      raise exception 'Only Care Africa can change a practice''s plan'
        using errcode = '42501';
    end if;
  end if;

  if new.plan = 'starter' and new.clinical_records = 'full' then
    raise exception 'Full clinical notes are not included in the Starter plan'
      using errcode = 'P0001', hint = 'Upgrade to the Practice plan, or choose intake forms only.';
  end if;

  if new.plan = 'starter' and new.claims_enabled then
    raise exception 'Medical-aid claims are not included in the Starter plan'
      using errcode = 'P0001', hint = 'Upgrade to the Practice plan.';
  end if;

  return new;
end $$;

drop trigger if exists practices_enforce_plan on practices;
create trigger practices_enforce_plan
  before insert or update of plan, clinical_records, claims_enabled on practices
  for each row execute function enforce_practice_plan();

-- ---------------------------------------------------------------------
-- Practice types. Settings used to take free text ("Dental Practice"),
-- so map what's there onto the fixed list the app now uses.
-- ---------------------------------------------------------------------
update practices set category = case
    when category in ('dental', 'medical', 'physio', 'chiro', 'optometry',
                      'psychology', 'nutrition', 'biokinetics', 'aesthetics',
                      'iv_therapy', 'nurse_clinic', 'wellness', 'beauty',
                      'alternative', 'other')                       then category
    when category ~* 'dent|orthodon'                               then 'dental'
    when category ~* 'optom|eye|vision|optic'                      then 'optometry'
    when category ~* 'physio'                                      then 'physio'
    when category ~* 'chiro'                                       then 'chiro'
    when category ~* 'bioki'                                       then 'biokinetics'
    when category ~* 'psych|counsel|therap(y|ist) ?$'              then 'psychology'
    when category ~* 'nutri|diet'                                  then 'nutrition'
    when category ~* 'drip|infusion|\miv\M'                      then 'iv_therapy'
    when category ~* 'aesthet|botox|filler|skin'                   then 'aesthetics'
    when category ~* 'nurse|clinic'                                then 'nurse_clinic'
    when category ~* 'spa|massage|wellness'                        then 'wellness'
    when category ~* 'beauty|salon|nail|lash|brow'                 then 'beauty'
    when category ~* 'medical|doctor|\mgp\M|general pract'       then 'medical'
    when category ~* 'homeo|natur|acupunct|altern|holistic'        then 'alternative'
    else 'other'
  end;

-- ---------------------------------------------------------------------
-- Existing practices: switch modules on from the practice type they
-- already chose. Claims stay off until the claims module is released.
-- ---------------------------------------------------------------------
update practices set clinical_records = case
    when category in ('dental', 'medical', 'physio', 'chiro', 'optometry',
                      'psychology', 'nutrition', 'biokinetics', 'aesthetics',
                      'iv_therapy', 'nurse_clinic')
      then 'full'
    when category in ('wellness', 'beauty', 'alternative', 'other')
      then 'intake'
    else 'intake'
  end
where clinical_records = 'off';

commit;
