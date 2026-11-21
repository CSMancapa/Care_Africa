-- =====================================================================
-- Care Africa — 0008 two-step sign-in (2FA) for everyone
-- =====================================================================
-- Decision of 21 Nov 2026: everyone at a practice (admins, practitioners
-- and front desk) signs in with a password AND a code from an
-- authenticator app. Recovery codes cover a lost phone; a practice admin
-- can reset a colleague's 2FA; Care Africa is the last resort.
--
-- What this migration does:
--   1. Practice data is only reachable from a session that completed the
--      second step (Supabase marks it "aal2" in the login token). The
--      membership helpers used by every policy now check this, so one
--      change covers all tables and functions.
--   2. practices.mfa_required (default true). Care Africa can switch it
--      off for a practice, e.g. the shared demo login. Practice admins
--      can't change it.
--   3. my_mfa_requirement(): tells the app, before the second step,
--      whether this person must use 2FA.
--   4. reset_member_two_step(): a practice admin clears a colleague's
--      authenticator and recovery codes and signs them out everywhere;
--      they set 2FA up again at their next sign-in.
--
-- Run 0006 and 0007 first.
-- =====================================================================

begin;

alter table practices
  add column if not exists mfa_required boolean not null default true;

comment on column practices.mfa_required is
  'Everyone at the practice must use two-step sign-in. Changed by Care Africa only (e.g. off for the demo practice).';

-- Only Care Africa may switch 2FA off (or on) for a practice.
create or replace function guard_practice_mfa_flag()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated')
     and new.mfa_required is distinct from old.mfa_required then
    raise exception 'Only Care Africa can change whether two-step sign-in is required'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists practices_guard_mfa_flag on practices;
create trigger practices_guard_mfa_flag
  before update of mfa_required on practices
  for each row execute function guard_practice_mfa_flag();

-- ---------------------------------------------------------------------
-- Has this session done what the practice requires?
-- ---------------------------------------------------------------------
create or replace function auth_mfa_satisfied(target_practice uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not coalesce((select mfa_required from practices where id = target_practice), true);
$$;
revoke execute on function auth_mfa_satisfied(uuid) from public;
grant  execute on function auth_mfa_satisfied(uuid) to authenticated;

-- The membership helpers behind every policy now also require 2FA.
create or replace function auth_is_practice_member(target_practice uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from practice_members
    where profile_id = auth.uid()
      and practice_id = target_practice
      and is_active
  ) and auth_mfa_satisfied(target_practice);
$$;

create or replace function auth_is_practice_admin(target_practice uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from practice_members
    where profile_id = auth.uid()
      and practice_id = target_practice
      and role = 'practice_admin'
      and is_active
  ) and auth_mfa_satisfied(target_practice);
$$;

create or replace function auth_is_clinical_member(target_practice uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from practice_members
    where profile_id = auth.uid()
      and practice_id = target_practice
      and role in ('doctor', 'practice_admin')
      and is_active
  ) and auth_mfa_satisfied(target_practice);
$$;

create or replace function auth_shares_practice_with(target_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from practice_members me
    join practice_members them on them.practice_id = me.practice_id
    where me.profile_id = auth.uid() and me.is_active
      and them.profile_id = target_profile and them.is_active
      and auth_mfa_satisfied(me.practice_id)
  );
$$;

-- ---------------------------------------------------------------------
-- For the app, before the second step: must this person use 2FA?
-- True if any practice they work at requires it.
-- ---------------------------------------------------------------------
create or replace function my_mfa_requirement()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from practice_members m
    join practices p on p.id = m.practice_id
    where m.profile_id = auth.uid() and m.is_active and p.mfa_required
  );
$$;
revoke execute on function my_mfa_requirement() from public;
grant  execute on function my_mfa_requirement() to authenticated;

-- ---------------------------------------------------------------------
-- Admin-assisted reset
-- ---------------------------------------------------------------------
create or replace function reset_member_two_step(p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_practice uuid;
  v_profile  uuid;
begin
  select practice_id, profile_id into v_practice, v_profile
    from practice_members where id = p_member and is_active;

  if v_practice is null or not auth_is_practice_admin(v_practice) then
    raise exception 'Only a practice admin can reset two-step sign-in' using errcode = '42501';
  end if;
  if v_profile = auth.uid() then
    raise exception 'You can''t reset your own two-step sign-in. Use a recovery code, or ask another admin.'
      using errcode = '42501';
  end if;

  -- Their authenticator app(s) and recovery codes...
  delete from auth.mfa_factors where user_id = v_profile;
  -- ...and every signed-in session, so they start again cleanly.
  delete from auth.sessions where user_id = v_profile;
end $$;
revoke execute on function reset_member_two_step(uuid) from public;
grant  execute on function reset_member_two_step(uuid) to authenticated;

commit;
