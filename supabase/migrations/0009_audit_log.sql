-- =====================================================================
-- Care Africa — 0009 audit log ("Activity log")
-- =====================================================================
-- A permanent record of who did what, and when, at each practice. Used to
-- investigate a breach, answer "who changed this?", and show that patient
-- records are protected (POPIA security safeguards; HPCSA record keeping).
--
-- Rules:
--   * Nobody can edit or delete entries: not staff, not admins, not the
--     app. Only practice admins can read their practice's entries.
--   * Most entries are written by the database itself (triggers), so they
--     can't be skipped by the app: clinical records, members, team and
--     invitations, practice settings and modules, services, practitioners,
--     products and prices, rewards, sales, claims and appointments.
--   * The app reports what only it can see (source = 'app'): sign-ins,
--     wrong two-step codes, recovery codes used, password changes, opening
--     a member's profile or clinical record, exports.
--   * Clinical content is never copied into the log: only which fields
--     changed. For non-clinical settings (prices, roles, status), the old
--     and new values are kept.
--   * Who did it is kept even if their login is later removed (email and
--     role are copied at the time). Changes made in the Supabase SQL
--     editor show as "Care Africa".
--
-- Run 0006–0008 first.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- The log
-- ---------------------------------------------------------------------
create table if not exists audit_log (
  id                bigint generated always as identity primary key,
  practice_id       uuid,             -- no foreign key: entries outlive deletions
  occurred_at       timestamptz not null default now(),
  actor_id          uuid,             -- null = Care Africa (SQL editor / service role)
  actor_email       text,
  actor_role        text,
  category          text not null check (category in
                      ('security', 'team', 'clinical', 'members', 'settings', 'sales', 'appointments')),
  action            text not null,
  description       text not null,
  patient_id        uuid,
  target_profile_id uuid,
  entity_type       text,
  entity_id         text,
  details           jsonb not null default '{}'::jsonb,
  ip                text,
  user_agent        text,
  source            text not null default 'database' check (source in ('database', 'app'))
);

create index if not exists audit_log_practice_time_idx   on audit_log (practice_id, id desc);
create index if not exists audit_log_practice_patient_idx on audit_log (practice_id, patient_id, id desc);
create index if not exists audit_log_practice_actor_idx   on audit_log (practice_id, actor_id, id desc);

alter table audit_log enable row level security;

drop policy if exists audit_log_admin_read on audit_log;
create policy audit_log_admin_read on audit_log
  for select using (auth_is_practice_admin(practice_id));

revoke insert, update, delete, truncate on audit_log from public, anon, authenticated;
grant select on audit_log to authenticated;

-- Nobody changes history.
create or replace function audit_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'The activity log can''t be changed or deleted' using errcode = '42501';
end $$;

drop trigger if exists audit_log_no_update on audit_log;
create trigger audit_log_no_update before update or delete on audit_log
  for each row execute function audit_log_immutable();
drop trigger if exists audit_log_no_truncate on audit_log;
create trigger audit_log_no_truncate before truncate on audit_log
  for each statement execute function audit_log_immutable();

-- ---------------------------------------------------------------------
-- Writing an entry (internal)
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
          coalesce(v_email, case when v_uid is null then 'Care Africa' end),
          v_role, p_category, p_action, p_description, p_patient, p_target_profile,
          p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb),
          nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
          left(v_headers ->> 'user-agent', 300),
          p_source);
end $$;
revoke execute on function _audit_write(uuid, text, text, text, uuid, uuid, text, text, jsonb, text) from public, anon, authenticated;

-- Values in plain words for descriptions ("front desk", not "staff").
create or replace function _audit_value(p_key text, p_val jsonb)
returns text language sql immutable as $$
  select case
    when p_val is null or p_val = 'null'::jsonb then '–'
    when p_key = 'role' then case p_val #>> '{}'
        when 'practice_admin' then 'practice admin'
        when 'doctor' then 'practitioner'
        when 'staff' then 'front desk'
        else p_val #>> '{}' end
    when p_key = 'clinical_records' then case p_val #>> '{}'
        when 'off' then 'off'
        when 'intake' then 'intake forms'
        when 'full' then 'full clinical notes'
        else p_val #>> '{}' end
    when p_key in ('claims_enabled', 'mfa_required') then case when p_val = 'true'::jsonb then 'on' else 'off' end
    when jsonb_typeof(p_val) = 'boolean' then case when p_val = 'true'::jsonb then 'yes' else 'no' end
    else p_val #>> '{}'
  end;
$$;

-- ---------------------------------------------------------------------
-- One trigger for every audited table
--   TG_ARGV[0] category
--   TG_ARGV[1] what the row is called ("member", "product", ...)
--   TG_ARGV[2] columns whose old/new values may be shown ('' = none)
--   TG_ARGV[3] columns whose changes don't matter ('' = none)
--   TG_ARGV[4] verb for a new row (default "Added")
-- ---------------------------------------------------------------------
create or replace function audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_category text := tg_argv[0];
  v_label    text := tg_argv[1];
  v_show     text[] := array_remove(string_to_array(coalesce(tg_argv[2], ''), ','), '');
  v_ignore   text[] := array_remove(string_to_array(coalesce(tg_argv[3], ''), ','), '')
                       || array['updated_at', 'created_at', 'token_hash'];
  v_verb     text := coalesce(nullif(tg_argv[4], ''), 'Added');
  v_new      jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old      jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row      jsonb := coalesce(v_new, v_old);
  v_practice uuid;
  v_patient  uuid;
  v_target   uuid;
  v_changed  text[] := '{}';
  v_values   jsonb := '{}'::jsonb;
  v_parts    text[] := '{}';
  v_key      text;
  v_desc     text;
begin
  -- Which practice and member is this about?
  if tg_table_name = 'practices' then
    v_practice := (v_row ->> 'id')::uuid;
  elsif tg_table_name = 'prescriptions' then
    select practice_id, patient_id into v_practice, v_patient
      from consultations where id = (v_row ->> 'consultation_id')::uuid;
  else
    v_practice := (v_row ->> 'practice_id')::uuid;
  end if;
  if tg_table_name = 'patients' then
    v_patient := (v_row ->> 'id')::uuid;
  elsif v_row ? 'patient_id' then
    v_patient := (v_row ->> 'patient_id')::uuid;
  end if;
  if tg_table_name = 'practice_members' then
    v_target := (v_row ->> 'profile_id')::uuid;
  end if;

  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key <> all(v_ignore) and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_changed := v_changed || v_key;
        if v_key = any(v_show) then
          v_values := v_values || jsonb_build_object(v_key,
                        jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
          v_parts := v_parts || (replace(v_key, '_', ' ') || ' ' ||
                        _audit_value(v_key, v_old -> v_key) || ' → ' || _audit_value(v_key, v_new -> v_key));
        else
          v_parts := v_parts || replace(v_key, '_', ' ');
        end if;
      end if;
    end loop;
    if cardinality(v_changed) = 0 then
      return null;  -- nothing that matters changed
    end if;
    v_desc := 'Changed ' || v_label || ': ' || array_to_string(v_parts, ', ');
  elsif tg_op = 'INSERT' then
    v_desc := v_verb || ' ' || v_label;
    foreach v_key in array v_show loop
      if v_new ? v_key and v_new -> v_key <> 'null'::jsonb then
        v_values := v_values || jsonb_build_object(v_key, v_new -> v_key);
      end if;
    end loop;
  else
    v_desc := 'Deleted ' || v_label;
    foreach v_key in array v_show loop
      if v_old ? v_key and v_old -> v_key <> 'null'::jsonb then
        v_values := v_values || jsonb_build_object(v_key, v_old -> v_key);
      end if;
    end loop;
  end if;

  perform _audit_write(
    v_practice, v_category, tg_table_name || '.' || lower(tg_op), v_desc,
    v_patient, v_target, tg_table_name, v_row ->> 'id',
    jsonb_strip_nulls(jsonb_build_object(
      'changed', case when cardinality(v_changed) > 0 then to_jsonb(v_changed) end,
      'values',  case when v_values <> '{}'::jsonb then v_values end)));
  return null;
end $$;

-- Attach it. Clinical tables show only which fields changed, never values.
do $$
declare
  spec text[];
  specs text[][] := array[
    -- table,                category,      label,                 show values,                                   ignore,                                                    insert verb
    array['consultations',       'clinical',     'consultation note',   'status',                                      '',                                                        'Wrote'],
    array['prescriptions',       'clinical',     'prescription',        '',                                            '',                                                        'Wrote'],
    array['patient_conditions',  'clinical',     'condition',           'status',                                      '',                                                        'Recorded'],
    array['patient_medications', 'clinical',     'medication',          '',                                            '',                                                        'Recorded'],
    array['patient_documents',   'clinical',     'document',            'doc_type,title',                              '',                                                        'Uploaded'],
    array['patient_visits',      'clinical',     'visit record',        '',                                            '',                                                        'Recorded'],
    array['patients',            'members',      'member details',      'is_active',                                   'points',                                                  'Added'],
    array['practice_members',    'team',         'team member',         'role,is_active',                              '',                                                        'Added'],
    array['practices',           'settings',     'practice settings',   'plan,clinical_records,claims_enabled,mfa_required,category,name', 'setup_completed',                   'Created'],
    array['services',            'settings',     'service',             'name,price,is_active',                        '',                                                        'Added'],
    array['practice_doctors',    'settings',     'practitioner listing','name,deleted_at',                             '',                                                        'Added'],
    array['products',            'sales',        'product',             'name,price,cost,discount,is_active',          'current_stock',                                           'Added'],
    array['rewards',             'sales',        'reward',              'name,points_cost,discount_percentage,is_active', '',                                                     'Added'],
    array['orders',              'sales',        'sale',                'order_number,total,status',                   '',                                                        'Recorded'],
    array['reward_claims',       'sales',        'reward claim',        'is_redeemed,points_used',                     'redeemed_at',                                             'Recorded'],
    array['claims',              'sales',        'medical-aid claim',   'status,amount_claimed,amount_paid',           '',                                                        'Created'],
    array['appointments',        'appointments', 'appointment',         'status,scheduled_for',                        'arrived_at,wait_started_at,seen_at,completed_at',         'Booked']
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

-- Invitations read better with their own wording.
create or replace function audit_invitation_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := case new.role
                         when 'practice_admin' then 'practice admin'
                         when 'doctor' then 'practitioner'
                         else 'front desk' end;
begin
  if tg_op = 'INSERT' then
    perform _audit_write(new.practice_id, 'team', 'invitation.created',
      'Invited ' || new.email || ' as ' || v_role, null, null, 'practice_invitations', new.id::text,
      jsonb_build_object('email', new.email, 'role', new.role));
  elsif new.accepted_at is not null and old.accepted_at is null then
    perform _audit_write(new.practice_id, 'team', 'invitation.accepted',
      'Accepted an invitation to join as ' || v_role, null, new.accepted_by, 'practice_invitations', new.id::text,
      jsonb_build_object('email', new.email, 'role', new.role));
  elsif new.revoked_at is not null and old.revoked_at is null then
    perform _audit_write(new.practice_id, 'team', 'invitation.cancelled',
      'Cancelled the invitation for ' || new.email, null, null, 'practice_invitations', new.id::text,
      jsonb_build_object('email', new.email));
  end if;
  return null;
end $$;

drop trigger if exists audit_changes on practice_invitations;
create trigger audit_changes after insert or update on practice_invitations
  for each row execute function audit_invitation_change();

-- The 2FA reset (0008) touches Supabase's own tables, so log it explicitly.
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

  delete from auth.mfa_factors where user_id = v_profile;
  delete from auth.sessions where user_id = v_profile;

  perform _audit_write(v_practice, 'security', 'two_step.reset',
    'Reset two-step sign-in for a team member (they were signed out everywhere)',
    null, v_profile, 'practice_members', p_member::text);
end $$;

-- ---------------------------------------------------------------------
-- What the app reports
-- ---------------------------------------------------------------------

-- Sign-in and account security events, recorded at every practice the
-- person works at. Allowed before the second step, so wrong codes count.
create or replace function log_auth_event(p_event text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_desc text := case p_event
    when 'signed_in'              then 'Signed in'
    when 'two_step_failed'        then 'Entered a wrong two-step code'
    when 'recovery_code_used'     then 'Signed in with a recovery code'
    when 'two_step_set_up'        then 'Set up two-step sign-in'
    when 'recovery_codes_renewed' then 'Made new recovery codes'
    when 'password_changed'       then 'Changed their password'
  end;
  m record;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if v_desc is null then
    raise exception 'Unknown event';
  end if;
  -- A runaway page can't flood the log.
  if (select count(*) from audit_log
       where actor_id = v_uid and source = 'app' and occurred_at > now() - interval '1 minute') >= 30 then
    return;
  end if;
  for m in select practice_id from practice_members where profile_id = v_uid and is_active loop
    perform _audit_write(m.practice_id, 'security', 'auth.' || p_event, v_desc,
      null, null, null, null, '{}'::jsonb, 'app');
  end loop;
end $$;

-- Someone opened a member's profile or clinical record.
create or replace function log_record_view(p_patient uuid, p_what text default 'member_profile')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_practice uuid;
  v_uid uuid := auth.uid();
begin
  select practice_id into v_practice from patients where id = p_patient;
  if v_practice is null or not auth_is_practice_member(v_practice) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_what not in ('member_profile', 'clinical_record') then
    raise exception 'Unknown record type';
  end if;
  if p_what = 'clinical_record' and not auth_is_clinical_member(v_practice) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  -- One entry per person, member and record type every 10 minutes.
  if exists (select 1 from audit_log
              where practice_id = v_practice and actor_id = v_uid and patient_id = p_patient
                and action = 'viewed.' || p_what and occurred_at > now() - interval '10 minutes') then
    return;
  end if;
  perform _audit_write(v_practice,
    case when p_what = 'clinical_record' then 'clinical' else 'members' end,
    'viewed.' || p_what,
    case when p_what = 'clinical_record' then 'Opened clinical record' else 'Opened member profile' end,
    p_patient, null, 'patients', p_patient::text, '{}'::jsonb, 'app');
end $$;

-- Someone exported or printed practice information.
create or replace function log_export(p_practice uuid, p_what text, p_rows int default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_desc text := case p_what
    when 'activity_log' then 'Exported the activity log'
    when 'members'      then 'Exported the member list'
    when 'sales'        then 'Exported sales'
    when 'clinical'     then 'Exported or printed a clinical record'
  end;
begin
  if not auth_is_practice_member(p_practice) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_desc is null then
    raise exception 'Unknown export';
  end if;
  perform _audit_write(p_practice, case when p_what = 'clinical' then 'clinical' else 'security' end,
    'export.' || p_what, v_desc, null, null, null, null,
    jsonb_strip_nulls(jsonb_build_object('rows', p_rows)), 'app');
end $$;

-- ---------------------------------------------------------------------
-- Reading it (practice admins only), with names filled in
-- ---------------------------------------------------------------------
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

revoke execute on function audit_row_change() from public, anon, authenticated;
revoke execute on function audit_invitation_change() from public, anon, authenticated;
revoke execute on function log_auth_event(text) from public;
revoke execute on function log_record_view(uuid, text) from public;
revoke execute on function log_export(uuid, text, int) from public;
revoke execute on function get_activity(uuid, text, uuid, text, bigint, int) from public;
grant execute on function log_auth_event(text) to authenticated;
grant execute on function log_record_view(uuid, text) to authenticated;
grant execute on function log_export(uuid, text, int) to authenticated;
grant execute on function get_activity(uuid, text, uuid, text, bigint, int) to authenticated;

commit;
