-- =====================================================================
-- Care Africa — 0010 clinical notes and intake forms
-- =====================================================================
-- Built on the templates in the app (src/lib/forms/templates.ts). Each
-- record keeps a copy of the exact template it was filled in on, so the
-- questions asked are on record even after a template is improved.
--
-- Clinical notes (module "full clinical notes"):
--   * Written by practitioners and admins. Front desk can't see them.
--   * Draft → signed. Drafts are private to their author and can be
--     deleted. Once signed, a note is locked for good: corrections are
--     dated addenda with a reason (HPCSA: records may not be altered).
--   * Signed notes and addenda can never be deleted (retention: at least
--     6 years after a record goes dormant; minors until age 21).
--
-- Intake forms (module "intake forms" or "full clinical notes"):
--   * Filled in by the client on a practice device, or from a link sent
--     before the visit. Each keeps the client's consent and typed name.
--   * Any team member can start one or send a link and see whether it's
--     been completed. Only practitioners and admins can read the answers.
--   * Submitted forms can't be changed or deleted.
--
-- Everything here is in the activity log (0009); clinical content is not.
-- Run 0006–0009 first.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Is the module switched on for this practice?
-- ---------------------------------------------------------------------
create or replace function practice_has_module(target_practice uuid, level text)
returns boolean language sql stable security definer set search_path = public as $$
  select case level
           when 'intake' then clinical_records in ('intake', 'full')
           when 'full'   then clinical_records = 'full'
           else false end
    from practices where id = target_practice;
$$;
revoke execute on function practice_has_module(uuid, text) from public;
grant  execute on function practice_has_module(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Clinical notes
-- ---------------------------------------------------------------------
create table if not exists clinical_notes (
  id               uuid primary key default gen_random_uuid(),
  practice_id      uuid not null references practices(id) on delete cascade,
  patient_id       uuid not null references patients(id),
  appointment_id   uuid references appointments(id) on delete set null,
  author_id        uuid not null default auth.uid() references profiles(id),
  template_key     text not null,
  template_version int  not null,
  template         jsonb not null,
  title            text not null,
  answers          jsonb not null default '{}'::jsonb,
  status           text not null default 'draft' check (status in ('draft', 'signed')),
  signed_at        timestamptz,
  signed_by        uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (pg_column_size(answers) < 200000)
);
create index if not exists clinical_notes_patient_idx on clinical_notes (patient_id, created_at desc);
create index if not exists clinical_notes_practice_idx on clinical_notes (practice_id, created_at desc);

create table if not exists clinical_note_addenda (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references clinical_notes(id),
  practice_id uuid not null references practices(id) on delete cascade,
  patient_id  uuid not null references patients(id),
  author_id   uuid not null default auth.uid() references profiles(id),
  reason      text not null check (length(btrim(reason)) > 0),
  body        text not null check (length(btrim(body)) > 0),
  created_at  timestamptz not null default now()
);
create index if not exists clinical_note_addenda_note_idx on clinical_note_addenda (note_id, created_at);

-- Rules the policies can't express on their own.
create or replace function clinical_note_rules()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'signed' and current_user in ('anon', 'authenticated') then
      raise exception 'Signed notes can''t be deleted' using errcode = '42501';
    end if;
    return old;
  end if;

  if not exists (select 1 from patients where id = new.patient_id and practice_id = new.practice_id) then
    raise exception 'That member isn''t at this practice';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'signed' then
      raise exception 'Signed notes can''t be changed. Add an addendum instead.' using errcode = '42501';
    end if;
    -- These never change after the note is started.
    new.practice_id := old.practice_id;
    new.patient_id := old.patient_id;
    new.author_id := old.author_id;
    new.created_at := old.created_at;
  end if;

  if new.status = 'signed' then
    if current_user in ('anon', 'authenticated') and new.author_id is distinct from auth.uid() then
      raise exception 'Only the author can sign a note' using errcode = '42501';
    end if;
    new.signed_at := now();
    new.signed_by := coalesce(auth.uid(), new.author_id);
  else
    new.signed_at := null;
    new.signed_by := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists clinical_notes_rules on clinical_notes;
create trigger clinical_notes_rules
  before insert or update or delete on clinical_notes
  for each row execute function clinical_note_rules();

create or replace function clinical_addendum_rules()
returns trigger language plpgsql as $$
declare n clinical_notes%rowtype;
begin
  if tg_op <> 'INSERT' then
    -- Care Africa removing a whole practice is the only exception.
    -- Nobody, Care Africa included, can edit one.
    if tg_op = 'DELETE' and current_user not in ('anon', 'authenticated') then
      return old;
    end if;
    raise exception 'Addenda can''t be changed or deleted' using errcode = '42501';
  end if;
  select * into n from clinical_notes where id = new.note_id;
  if not found then
    raise exception 'Not allowed' using errcode = '42501';  -- not a note this person can see
  end if;
  if n.status <> 'signed' then
    raise exception 'Addenda can only be added to a signed note';
  end if;
  new.practice_id := n.practice_id;
  new.patient_id := n.patient_id;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists clinical_note_addenda_rules on clinical_note_addenda;
create trigger clinical_note_addenda_rules
  before insert or update or delete on clinical_note_addenda
  for each row execute function clinical_addendum_rules();

alter table clinical_notes enable row level security;
alter table clinical_note_addenda enable row level security;

drop policy if exists clinical_notes_read on clinical_notes;
create policy clinical_notes_read on clinical_notes for select using (
  auth_is_clinical_member(practice_id)
  and (status = 'signed' or author_id = auth.uid())          -- drafts are private
);
drop policy if exists clinical_notes_insert on clinical_notes;
create policy clinical_notes_insert on clinical_notes for insert with check (
  auth_is_clinical_member(practice_id)
  and practice_has_module(practice_id, 'full')
  and author_id = auth.uid()
);
drop policy if exists clinical_notes_update on clinical_notes;
create policy clinical_notes_update on clinical_notes for update
  using (auth_is_clinical_member(practice_id) and author_id = auth.uid() and status = 'draft')
  with check (auth_is_clinical_member(practice_id) and author_id = auth.uid());
drop policy if exists clinical_notes_delete on clinical_notes;
create policy clinical_notes_delete on clinical_notes for delete
  using (auth_is_clinical_member(practice_id) and author_id = auth.uid() and status = 'draft');

drop policy if exists clinical_note_addenda_read on clinical_note_addenda;
create policy clinical_note_addenda_read on clinical_note_addenda for select
  using (auth_is_clinical_member(practice_id));
drop policy if exists clinical_note_addenda_insert on clinical_note_addenda;
create policy clinical_note_addenda_insert on clinical_note_addenda for insert with check (
  author_id = auth.uid()
  and exists (select 1 from clinical_notes n
               where n.id = note_id and auth_is_clinical_member(n.practice_id))
);

grant select, insert, update, delete on clinical_notes to authenticated;
grant select, insert on clinical_note_addenda to authenticated;

-- ---------------------------------------------------------------------
-- Intake forms
-- ---------------------------------------------------------------------
create table if not exists intake_submissions (
  id               uuid primary key default gen_random_uuid(),
  practice_id      uuid not null references practices(id) on delete cascade,
  patient_id       uuid not null references patients(id),
  template_key     text not null,
  template_version int  not null,
  template         jsonb not null,
  title            text not null,
  answers          jsonb not null default '{}'::jsonb,
  consent_given    boolean not null check (consent_given),
  consent_text     text not null,
  signed_name      text not null check (length(btrim(signed_name)) > 1),
  source           text not null check (source in ('in_practice', 'link')),
  collected_by     uuid references profiles(id),
  submitted_at     timestamptz not null default now(),
  check (pg_column_size(answers) < 200000)
);
create index if not exists intake_submissions_patient_idx on intake_submissions (patient_id, submitted_at desc);

create table if not exists intake_requests (
  id            uuid primary key default gen_random_uuid(),
  practice_id   uuid not null references practices(id) on delete cascade,
  patient_id    uuid not null references patients(id) on delete cascade,
  template_key  text not null,
  title         text not null,
  token_hash    text not null unique,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '7 days',
  submitted_at  timestamptz,
  submission_id uuid references intake_submissions(id),
  revoked_at    timestamptz
);
create index if not exists intake_requests_patient_idx on intake_requests (patient_id, created_at desc);

create or replace function intake_submission_rules()
returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then
    -- Care Africa removing a whole practice is the only exception.
    -- Nobody, Care Africa included, can edit one.
    if tg_op = 'DELETE' and current_user not in ('anon', 'authenticated') then
      return old;
    end if;
    raise exception 'Submitted intake forms can''t be changed or deleted' using errcode = '42501';
  end if;
  if not exists (select 1 from patients where id = new.patient_id and practice_id = new.practice_id) then
    raise exception 'That member isn''t at this practice';
  end if;
  new.submitted_at := now();
  return new;
end $$;

drop trigger if exists intake_submissions_rules on intake_submissions;
create trigger intake_submissions_rules
  before insert or update or delete on intake_submissions
  for each row execute function intake_submission_rules();

alter table intake_submissions enable row level security;
alter table intake_requests enable row level security;

-- Answers: practitioners and admins only.
drop policy if exists intake_submissions_read on intake_submissions;
create policy intake_submissions_read on intake_submissions for select
  using (auth_is_clinical_member(practice_id));
-- Anyone on the team can hand a device to a client to fill one in.
drop policy if exists intake_submissions_insert on intake_submissions;
create policy intake_submissions_insert on intake_submissions for insert with check (
  auth_is_practice_member(practice_id)
  and practice_has_module(practice_id, 'intake')
  and source = 'in_practice'
  and collected_by = auth.uid()
);

drop policy if exists intake_requests_read on intake_requests;
create policy intake_requests_read on intake_requests for select
  using (auth_is_practice_member(practice_id));

grant select, insert on intake_submissions to authenticated;
grant select on intake_requests to authenticated;

-- Which forms a member has completed, without the answers (for front desk).
create or replace function intake_overview(p_patient uuid)
returns table (kind text, id uuid, template_key text, title text, at timestamptz,
               source text, status text, expires_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_practice uuid;
begin
  select pt.practice_id into v_practice from patients pt where pt.id = p_patient;
  if v_practice is null or not auth_is_practice_member(v_practice) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select 'submission'::text, s.id, s.template_key, s.title, s.submitted_at, s.source, 'completed'::text, null::timestamptz
      from intake_submissions s where s.patient_id = p_patient
    union all
    select 'link'::text, r.id, r.template_key, r.title, r.created_at, 'link'::text,
           case when r.revoked_at is not null then 'cancelled'
                when r.expires_at < now() then 'expired'
                else 'waiting' end,
           r.expires_at
      from intake_requests r
     where r.patient_id = p_patient and r.submitted_at is null
    order by 5 desc;
end $$;

-- Send a form by link. Returns the secret once; only its hash is kept.
create or replace function create_intake_link(p_patient uuid, p_template_key text, p_title text)
returns table (request_id uuid, token text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_practice uuid;
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_id uuid;
  v_exp timestamptz;
begin
  select practice_id into v_practice from patients where id = p_patient;
  if v_practice is null or not auth_is_practice_member(v_practice) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not practice_has_module(v_practice, 'intake') then
    raise exception 'Intake forms are switched off for this practice';
  end if;
  if coalesce(btrim(p_template_key), '') = '' or coalesce(btrim(p_title), '') = '' then
    raise exception 'Choose a form';
  end if;

  -- A new link for the same form replaces an open one.
  update intake_requests set revoked_at = now()
   where patient_id = p_patient and template_key = p_template_key
     and submitted_at is null and revoked_at is null;

  insert into intake_requests (practice_id, patient_id, template_key, title, token_hash, created_by)
  values (v_practice, p_patient, p_template_key, p_title, _invite_token_hash(v_token), auth.uid())
  returning id, intake_requests.expires_at into v_id, v_exp;
  return query select v_id, v_token, v_exp;
end $$;

-- What the public link page shows. Knowing the token is the permission.
create or replace function get_intake_link(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r intake_requests%rowtype; p practices%rowtype; v_first text;
begin
  select * into r from intake_requests where token_hash = _invite_token_hash(p_token);
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into p from practices where id = r.practice_id;
  select coalesce(nullif(first_name, ''), split_part(full_name, ' ', 1)) into v_first
    from patients where id = r.patient_id;
  return jsonb_build_object(
    'status', case when r.submitted_at is not null then 'completed'
                   when r.revoked_at is not null then 'cancelled'
                   when r.expires_at < now() then 'expired'
                   else 'pending' end,
    'template_key', r.template_key,
    'title', r.title,
    'first_name', v_first,
    'practice_name', p.name,
    'logo_url', p.logo_url,
    'brand_primary_color', p.brand_primary_color,
    'brand_accent_color', p.brand_accent_color,
    'expires_at', r.expires_at
  );
end $$;

-- The client submits from the link, without signing in.
create or replace function submit_intake_link(
  p_token text, p_template jsonb, p_answers jsonb, p_consent_text text, p_signed_name text
) returns void language plpgsql security definer set search_path = public as $$
declare r intake_requests%rowtype; v_id uuid;
begin
  select * into r from intake_requests where token_hash = _invite_token_hash(p_token) for update;
  if not found then
    raise exception 'This link isn''t valid';
  end if;
  if r.submitted_at is not null then
    raise exception 'This form has already been sent. Thank you!';
  end if;
  if r.revoked_at is not null or r.expires_at < now() then
    raise exception 'This link has expired. Ask the practice for a new one.';
  end if;
  if p_template ->> 'key' is distinct from r.template_key then
    raise exception 'This is not the form that was sent';
  end if;
  if pg_column_size(p_answers) > 200000 then
    raise exception 'The form is too large';
  end if;

  -- Shown as the actor in the activity log.
  perform set_config('care.actor_label', 'Member, via intake link', true);

  insert into intake_submissions (practice_id, patient_id, template_key, template_version, template,
                                  title, answers, consent_given, consent_text, signed_name, source)
  values (r.practice_id, r.patient_id, r.template_key, coalesce((p_template ->> 'version')::int, 1), p_template,
          r.title, coalesce(p_answers, '{}'::jsonb), true, coalesce(p_consent_text, ''), btrim(p_signed_name), 'link')
  returning id into v_id;

  update intake_requests set submitted_at = now(), submission_id = v_id where id = r.id;
end $$;

revoke execute on function intake_overview(uuid) from public;
revoke execute on function create_intake_link(uuid, text, text) from public;
revoke execute on function get_intake_link(text) from public;
revoke execute on function submit_intake_link(text, jsonb, jsonb, text, text) from public;
grant execute on function intake_overview(uuid) to authenticated;
grant execute on function create_intake_link(uuid, text, text) to authenticated;
grant execute on function get_intake_link(text) to anon, authenticated;
grant execute on function submit_intake_link(text, jsonb, jsonb, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Activity log (0009): who is the actor for link submissions
-- ---------------------------------------------------------------------
create or replace function _audit_write(
  p_practice       uuid,
  p_category       text,
  p_action         text,
  p_description    text,
  p_patient        uuid  default null,
  p_target_profile uuid  default null,
  p_entity_type    text  default null,
  p_entity_id      text  default null,
  p_details        jsonb default '{}'::jsonb,
  p_source         text  default 'database'
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_email   text;
  v_role    text;
  v_label   text := nullif(current_setting('care.actor_label', true), '');
  v_headers json;
begin
  if v_uid is not null then
    select email into v_email from profiles where id = v_uid;
    select role::text into v_role from practice_members
     where profile_id = v_uid and practice_id = p_practice;
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;

  insert into audit_log (practice_id, actor_id, actor_email, actor_role, category, action,
                         description, patient_id, target_profile_id, entity_type, entity_id,
                         details, ip, user_agent, source)
  values (p_practice, v_uid,
          coalesce(v_email, v_label, case when v_uid is null then 'Care Africa' end),
          v_role, p_category, p_action, p_description, p_patient, p_target_profile,
          p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb),
          nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
          left(v_headers ->> 'user-agent', 300),
          p_source);
end $$;
revoke execute on function _audit_write(uuid, text, text, text, uuid, uuid, text, text, jsonb, text) from public, anon, authenticated;

-- The activity view shows that label instead of "Care Africa".
create or replace function get_activity(
  p_practice uuid,
  p_category text   default null,
  p_actor    uuid   default null,
  p_search   text   default null,
  p_before   bigint default null,
  p_limit    int    default 50
) returns table (
  id bigint, occurred_at timestamptz, category text, action text, description text,
  actor_id uuid, actor_name text, actor_email text, actor_role text,
  patient_id uuid, patient_name text, target_name text,
  details jsonb, ip text, user_agent text, source text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not auth_is_practice_admin(p_practice) then
    raise exception 'Only a practice admin can see the activity log' using errcode = '42501';
  end if;

  return query
  select a.id, a.occurred_at, a.category, a.action, a.description,
         a.actor_id,
         coalesce(nullif(ap.full_name, ''), a.actor_email, 'Care Africa'),
         a.actor_email, a.actor_role,
         a.patient_id,
         coalesce(nullif(pt.full_name, ''), nullif(btrim(concat_ws(' ', pt.first_name, pt.last_name)), ''),
                  case when a.patient_id is not null then 'Deleted member' end),
         coalesce(nullif(tp.full_name, ''), tp.email),
         a.details, a.ip, a.user_agent, a.source
    from audit_log a
    left join profiles ap on ap.id = a.actor_id
    left join patients pt on pt.id = a.patient_id and pt.practice_id = a.practice_id
    left join profiles tp on tp.id = a.target_profile_id
   where a.practice_id = p_practice
     and (p_category is null or a.category = p_category)
     and (p_actor is null or a.actor_id = p_actor)
     and (p_before is null or a.id < p_before)
     and (p_search is null or p_search = ''
          or a.description ilike '%' || p_search || '%'
          or coalesce(pt.full_name, concat_ws(' ', pt.first_name, pt.last_name)) ilike '%' || p_search || '%'
          or coalesce(ap.full_name, a.actor_email) ilike '%' || p_search || '%')
   order by a.id desc
   limit least(greatest(coalesce(p_limit, 50), 1), 500);
end $$;

-- Record these tables too. Answers and template content are never copied.
do $$
declare
  spec text[];
  specs text[][] := array[
    array['clinical_notes',        'clinical', 'clinical note',        'status,title',  'answers,template,signed_at,signed_by', 'Started'],
    array['clinical_note_addenda', 'clinical', 'addendum to a note',   '',              '',                                     'Added'],
    array['intake_submissions',    'clinical', 'intake form',          'title,source',  '',                                     'Received'],
    array['intake_requests',       'members',  'intake form link',     'title',         'submission_id',                        'Sent']
  ];
begin
  foreach spec slice 1 in array specs loop
    execute format('drop trigger if exists audit_changes on %I', spec[1]);
    execute format(
      'create trigger audit_changes after insert or update or delete on %I
         for each row execute function audit_row_change(%L, %L, %L, %L, %L)',
      spec[1], spec[2], spec[3], spec[4], spec[5], spec[6]);
  end loop;
end $$;

commit;
