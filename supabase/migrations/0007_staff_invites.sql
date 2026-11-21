-- =====================================================================
-- Care Africa — 0007 staff invites and roles
-- =====================================================================
-- Every person at a practice gets their own login (no shared passwords),
-- so the practice can control and later audit who did what.
--
-- Roles (practice_members.role):
--   practice_admin  "Practice admin"  everything, incl. settings and staff
--   doctor          "Practitioner"    appointments and clinical records
--   staff           "Front desk"      bookings, check-in, members, sales;
--                                     NO clinical records
--
-- Invites: a practice admin creates an invitation for an email address
-- and role. The app shows a one-time link the admin can send by WhatsApp
-- or email. The person opens it, creates an account (or signs in) with
-- that same email address, and joins the practice. Only a hash of the
-- link's secret is stored. Links expire after 7 days.
--
-- Safety rules enforced here:
--   * Only practice admins can invite, change roles or remove staff.
--   * A practice can never be left without an active admin.
--   * An invitation can only be accepted by a login with the invited
--     email address.
--   * Clinical tables (consultations, conditions, medications, visits,
--     documents, prescriptions) are now limited to practitioners and
--     admins. Front desk keeps bookings, members, sales and claims.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Clinical access: practitioners and admins only
-- ---------------------------------------------------------------------
create or replace function auth_is_clinical_member(target_practice uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from practice_members
    where profile_id = auth.uid()
      and practice_id = target_practice
      and role in ('doctor', 'practice_admin')
      and is_active
  );
$$;
revoke execute on function auth_is_clinical_member(uuid) from public;
grant  execute on function auth_is_clinical_member(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'consultations', 'patient_medications', 'patient_conditions',
    'patient_visits', 'patient_documents'
  ] loop
    execute format($f$
      drop policy if exists %1$s_staff_all on %1$s;
      drop policy if exists %1$s_clinical_all on %1$s;
      create policy %1$s_clinical_all on %1$s
        for all using (auth_is_clinical_member(practice_id))
        with check (auth_is_clinical_member(practice_id));
    $f$, t);
  end loop;
end $$;

drop policy if exists prescriptions_read on prescriptions;
drop policy if exists prescriptions_staff_write on prescriptions;
drop policy if exists prescriptions_clinical_write on prescriptions;

create policy prescriptions_read on prescriptions
  for select using (
    exists (select 1 from consultations c
            where c.id = prescriptions.consultation_id
              and (auth_owns_patient(c.patient_id) or auth_is_clinical_member(c.practice_id)))
  );

create policy prescriptions_clinical_write on prescriptions
  for all using (
    exists (select 1 from consultations c
            where c.id = prescriptions.consultation_id
              and auth_is_clinical_member(c.practice_id))
  )
  with check (
    exists (select 1 from consultations c
            where c.id = prescriptions.consultation_id
              and auth_is_clinical_member(c.practice_id))
  );

-- ---------------------------------------------------------------------
-- Never leave a practice without an active admin
-- ---------------------------------------------------------------------
create or replace function guard_last_practice_admin()
returns trigger language plpgsql as $$
-- Runs as the caller (not security definer), so it can tell app users
-- apart from Care Africa staff working in the SQL editor or with the
-- service role, and from whole-practice or whole-account deletions.
declare
  v_was_admin   boolean := old.role = 'practice_admin' and old.is_active;
  v_still_admin boolean := tg_op = 'UPDATE' and new.role = 'practice_admin' and new.is_active;
begin
  if current_user in ('anon', 'authenticated')
     and v_was_admin and not v_still_admin
     and not exists (
       select 1 from practice_members
       where practice_id = old.practice_id
         and id <> old.id
         and role = 'practice_admin'
         and is_active
     ) then
    raise exception 'A practice needs at least one active admin'
      using errcode = 'P0001',
            hint = 'Make someone else an admin first.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists practice_members_keep_admin on practice_members;
create trigger practice_members_keep_admin
  before update of role, is_active or delete on practice_members
  for each row execute function guard_last_practice_admin();

-- ---------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------
create table if not exists practice_invitations (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references practices(id) on delete cascade,
  email        citext not null,
  role         user_role not null
                 check (role in ('staff', 'doctor', 'practice_admin')),
  token_hash   text not null unique,
  invited_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  accepted_by  uuid references profiles(id) on delete set null,
  revoked_at   timestamptz
);

-- At most one open invitation per email per practice.
create unique index if not exists practice_invitations_open_idx
  on practice_invitations (practice_id, email)
  where accepted_at is null and revoked_at is null;

alter table practice_invitations enable row level security;

drop policy if exists practice_invitations_admin_read on practice_invitations;
create policy practice_invitations_admin_read on practice_invitations
  for select using (auth_is_practice_admin(practice_id));
-- No insert/update/delete policies: changes go through the functions below.

grant select on practice_invitations to authenticated;

create or replace function _invite_token_hash(p_token text)
returns text language sql immutable as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- Create (or replace) an invitation. Returns the secret link token once;
-- only its hash is stored.
create or replace function create_invitation(p_practice uuid, p_email text, p_role user_role)
returns table (invitation_id uuid, token text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_email citext := lower(btrim(p_email));
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_id uuid;
  v_expires timestamptz;
begin
  if not auth_is_practice_admin(p_practice) then
    raise exception 'Only a practice admin can invite staff' using errcode = '42501';
  end if;
  if p_role not in ('staff', 'doctor', 'practice_admin') then
    raise exception 'Choose a role: front desk, practitioner or practice admin';
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address';
  end if;
  if exists (
    select 1 from practice_members m join profiles p on p.id = m.profile_id
    where m.practice_id = p_practice and m.is_active and p.email = v_email
  ) then
    raise exception '% is already on your team', v_email;
  end if;

  -- A new invite replaces any open one for the same person.
  update practice_invitations set revoked_at = now()
   where practice_id = p_practice and email = v_email
     and accepted_at is null and revoked_at is null;

  insert into practice_invitations (practice_id, email, role, token_hash, invited_by)
  values (p_practice, v_email, p_role, _invite_token_hash(v_token), auth.uid())
  returning id, practice_invitations.expires_at into v_id, v_expires;

  return query select v_id, v_token, v_expires;
end $$;

create or replace function revoke_invitation(p_invitation uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_practice uuid;
begin
  select practice_id into v_practice from practice_invitations where id = p_invitation;
  if v_practice is null or not auth_is_practice_admin(v_practice) then
    raise exception 'Only a practice admin can cancel invitations' using errcode = '42501';
  end if;
  update practice_invitations set revoked_at = now()
   where id = p_invitation and accepted_at is null and revoked_at is null;
end $$;

-- What the invite page shows before anyone signs in. Knowing the token
-- is the permission to see this.
create or replace function get_invitation(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v practice_invitations%rowtype; v_name text;
begin
  select * into v from practice_invitations where token_hash = _invite_token_hash(p_token);
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;
  select name into v_name from practices where id = v.practice_id;
  return jsonb_build_object(
    'status', case
                when v.accepted_at is not null then 'accepted'
                when v.revoked_at  is not null then 'revoked'
                when v.expires_at < now()      then 'expired'
                else 'pending' end,
    'practice_name', v_name,
    'role', v.role,
    'email', v.email,
    'expires_at', v.expires_at
  );
end $$;

-- Join the practice. The signed-in account's email must match the invite.
create or replace function accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v practice_invitations%rowtype;
  v_uid uuid := auth.uid();
  v_email citext;
begin
  if v_uid is null then
    raise exception 'Sign in to accept this invitation' using errcode = '42501';
  end if;

  select * into v from practice_invitations
   where token_hash = _invite_token_hash(p_token)
   for update;

  if not found then
    raise exception 'This invitation link isn''t valid';
  end if;
  if v.accepted_at is not null then
    if v.accepted_by = v_uid then return v.practice_id; end if;
    raise exception 'This invitation has already been used';
  end if;
  if v.revoked_at is not null then
    raise exception 'This invitation was cancelled. Ask your practice admin for a new link.';
  end if;
  if v.expires_at < now() then
    raise exception 'This invitation has expired. Ask your practice admin for a new link.';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is distinct from v.email then
    raise exception 'This invitation was sent to %. Sign in with that email address.', v.email
      using errcode = '42501';
  end if;

  insert into practice_members (practice_id, profile_id, role, is_active)
  values (v.practice_id, v_uid, v.role, true)
  on conflict (practice_id, profile_id)
    do update set role = excluded.role, is_active = true;

  -- People who signed up through an invite start as 'patient' profiles.
  update profiles set role = v.role where id = v_uid and role = 'patient';

  update practice_invitations set accepted_at = now(), accepted_by = v_uid where id = v.id;
  return v.practice_id;
end $$;

-- Change a team member's role or remove (deactivate) them.
create or replace function update_team_member(p_member uuid, p_role user_role, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_practice uuid;
begin
  select practice_id into v_practice from practice_members where id = p_member;
  if v_practice is null or not auth_is_practice_admin(v_practice) then
    raise exception 'Only a practice admin can change the team' using errcode = '42501';
  end if;
  if p_role not in ('staff', 'doctor', 'practice_admin') then
    raise exception 'Choose a role: front desk, practitioner or practice admin';
  end if;
  -- Same rule as the trigger (which this security-definer function
  -- would otherwise bypass): keep at least one active admin.
  if exists (select 1 from practice_members
              where id = p_member and role = 'practice_admin' and is_active)
     and not (p_role = 'practice_admin' and p_active)
     and not exists (select 1 from practice_members
                      where practice_id = v_practice and id <> p_member
                        and role = 'practice_admin' and is_active) then
    raise exception 'A practice needs at least one active admin'
      using errcode = 'P0001', hint = 'Make someone else an admin first.';
  end if;
  update practice_members set role = p_role, is_active = p_active where id = p_member;
end $$;

revoke execute on function _invite_token_hash(text) from public;
revoke execute on function create_invitation(uuid, text, user_role) from public;
revoke execute on function revoke_invitation(uuid) from public;
revoke execute on function get_invitation(text) from public;
revoke execute on function accept_invitation(text) from public;
revoke execute on function update_team_member(uuid, user_role, boolean) from public;
grant execute on function create_invitation(uuid, text, user_role) to authenticated;
grant execute on function revoke_invitation(uuid) to authenticated;
grant execute on function get_invitation(text) to anon, authenticated;
grant execute on function accept_invitation(text) to authenticated;
grant execute on function update_team_member(uuid, user_role, boolean) to authenticated;

commit;
