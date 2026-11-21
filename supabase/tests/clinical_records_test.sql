-- =====================================================================
-- Care Africa — tests for 0010 (clinical notes and intake forms)
-- =====================================================================
--   psql "$DATABASE_URL" -f supabase/tests/clinical_records_test.sql
-- Seeds data, asserts, then rolls back.
-- =====================================================================

begin;

grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
revoke insert, update, delete, truncate on audit_log from authenticated;
revoke update, delete on intake_submissions from authenticated;
revoke update, delete on clinical_note_addenda from authenticated;

create or replace function _assert(label text, actual text, expected text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL  %  got[%] want[%]', label, actual, expected;
  end if;
  raise notice 'pass  %', label;
end $$;

create or replace function _as(actor uuid) returns void language plpgsql as $$
begin
  if actor is null then
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('role', 'anon', true);
  else
    perform set_config('request.jwt.claim.sub', actor::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', actor, 'aal', 'aal2')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end $$;

create or replace function _done() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('care.actor_label', '', true);
end $$;

create or replace function _try(actor uuid, q text) returns text language plpgsql as $$
begin
  perform _as(actor); execute q; perform _done(); return 'ok';
exception when others then perform _done(); return sqlerrm;
end $$;

create or replace function _read(actor uuid, q text) returns text language plpgsql as $$
declare out text;
begin
  perform _as(actor); execute q into out; perform _done(); return coalesce(out, '');
exception when others then perform _done(); return 'ERROR: ' || sqlerrm;
end $$;

-- People: a1 admin, d1 + d2 practitioners, f1 front desk; x1 another practice's admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@glow.test', '{"practice_name":"Glow IV Lounge"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'nurse@glow.test', '{"full_name":"Sister Dube"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'doc@glow.test',   '{"full_name":"Dr Pillay"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'desk@glow.test',  '{"full_name":"Front Desk"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'x@other.test',    '{"practice_name":"Other"}');
select set_config('t.p', (select practice_id::text from practice_members where profile_id = '00000000-0000-0000-0000-0000000000a1'), false);
select set_config('t.x', (select practice_id::text from practice_members where profile_id = '00000000-0000-0000-0000-0000000000e1'), false);
insert into practice_members (practice_id, profile_id, role) values
  (current_setting('t.p')::uuid, '00000000-0000-0000-0000-0000000000d1', 'doctor'),
  (current_setting('t.p')::uuid, '00000000-0000-0000-0000-0000000000d2', 'doctor'),
  (current_setting('t.p')::uuid, '00000000-0000-0000-0000-0000000000f1', 'staff');
insert into patients (id, practice_id, first_name, last_name) values
  ('00000000-0000-0000-0000-00000000aaaa', current_setting('t.p')::uuid, 'Thandi', 'Mokoena'),
  ('00000000-0000-0000-0000-00000000bbbb', current_setting('t.x')::uuid, 'Other', 'Person');

create temp table t (k text primary key, v text);
grant all on t to authenticated, anon;

-- A note, as SQL, by a given author
create or replace function _note_sql(p_id text) returns text language sql as $$
  select format($q$insert into clinical_notes (id, practice_id, patient_id, author_id, template_key, template_version, template, title, answers)
                   values (%L, %L, %L, auth.uid(), 'soap_consultation', 1, '{"key":"soap_consultation"}', 'General consultation',
                           '{"subjective":"Headache for 3 days","assessment":"Tension headache"}')$q$,
                p_id, current_setting('t.p'), '00000000-0000-0000-0000-00000000aaaa');
$$;

-- ---------------------------------------------------------------------
-- Modules
-- ---------------------------------------------------------------------
update practices set clinical_records = 'intake' where id = current_setting('t.p')::uuid;
select _assert('with intake forms only, no clinical notes can be written',
  (_try('00000000-0000-0000-0000-0000000000d1', _note_sql('00000000-0000-0000-0000-0000000000c1')) like '%row-level security%')::text, 'true');
update practices set clinical_records = 'full' where id = current_setting('t.p')::uuid;

-- ---------------------------------------------------------------------
-- Clinical notes
-- ---------------------------------------------------------------------
select _assert('front desk cannot write clinical notes',
  (_try('00000000-0000-0000-0000-0000000000f1', _note_sql('00000000-0000-0000-0000-0000000000c1')) like '%row-level security%')::text, 'true');
select _assert('a practitioner starts a note',
  _try('00000000-0000-0000-0000-0000000000d1', _note_sql('00000000-0000-0000-0000-0000000000c1')), 'ok');
select _assert('a note for another practice''s member is refused',
  _try('00000000-0000-0000-0000-0000000000d1',
    replace(_note_sql('00000000-0000-0000-0000-0000000000c2'), '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-00000000bbbb')),
  'That member isn''t at this practice');

select _assert('drafts are private: another practitioner can''t see it',
  _read('00000000-0000-0000-0000-0000000000d2', 'select count(*)::text from clinical_notes'), '0');
select _assert('drafts are private: nor can the admin',
  _read('00000000-0000-0000-0000-0000000000a1', 'select count(*)::text from clinical_notes'), '0');
select _assert('the author can edit their draft',
  _try('00000000-0000-0000-0000-0000000000d1',
    $q$update clinical_notes set answers = answers || '{"plan":"Rest, fluids"}' where id = '00000000-0000-0000-0000-0000000000c1'$q$), 'ok');

select _try('00000000-0000-0000-0000-0000000000d1',
  $q$update clinical_notes set status = 'signed' where id = '00000000-0000-0000-0000-0000000000c1'$q$);
select _assert('signing stamps who and when',
  (select (signed_by = '00000000-0000-0000-0000-0000000000d1' and signed_at is not null)::text
     from clinical_notes where id = '00000000-0000-0000-0000-0000000000c1'), 'true');
select _assert('a signed note is visible to other practitioners',
  _read('00000000-0000-0000-0000-0000000000d2', 'select count(*)::text from clinical_notes'), '1');
select _assert('and to the admin',
  _read('00000000-0000-0000-0000-0000000000a1', 'select count(*)::text from clinical_notes'), '1');
select _assert('front desk still can''t see it',
  _read('00000000-0000-0000-0000-0000000000f1', 'select count(*)::text from clinical_notes'), '0');

-- The policy only offers drafts for update, so a signed note simply isn't changed...
select _try('00000000-0000-0000-0000-0000000000d1',
  $q$update clinical_notes set answers = '{"assessment":"Migraine"}' where id = '00000000-0000-0000-0000-0000000000c1'$q$);
select _assert('a signed note can''t be changed by its author',
  (select answers ->> 'assessment' from clinical_notes where id = '00000000-0000-0000-0000-0000000000c1'), 'Tension headache');
-- ...and even Care Africa is stopped by the trigger.
do $$ begin
  update clinical_notes set answers = '{}' where id = '00000000-0000-0000-0000-0000000000c1';
  raise exception 'should not reach';
exception when others then perform set_config('t.err', sqlerrm, true); end $$;
select _assert('not even directly in the database',
  current_setting('t.err'), 'Signed notes can''t be changed. Add an addendum instead.');

select _try('00000000-0000-0000-0000-0000000000d1',
  $q$delete from clinical_notes where id = '00000000-0000-0000-0000-0000000000c1'$q$);
select _assert('a signed note can''t be deleted',
  (select count(*)::text from clinical_notes where id = '00000000-0000-0000-0000-0000000000c1'), '1');

-- Addenda
select _assert('another practitioner adds an addendum',
  _try('00000000-0000-0000-0000-0000000000d2',
    format('insert into clinical_note_addenda (note_id, author_id, reason, body) values (%L, auth.uid(), %L, %L)',
      '00000000-0000-0000-0000-0000000000c1', 'Lab result received', 'Bloods normal')), 'ok');
select _assert('the addendum is filed against the right member',
  (select patient_id::text from clinical_note_addenda limit 1), '00000000-0000-0000-0000-00000000aaaa');
select _assert('an addendum needs a reason',
  (_try('00000000-0000-0000-0000-0000000000d2',
    format('insert into clinical_note_addenda (note_id, author_id, reason, body) values (%L, auth.uid(), %L, %L)',
      '00000000-0000-0000-0000-0000000000c1', ' ', 'x')) like '%check constraint%')::text, 'true');
select _try('00000000-0000-0000-0000-0000000000d1', _note_sql('00000000-0000-0000-0000-0000000000c3'));
select _assert('drafts can''t get addenda',
  _try('00000000-0000-0000-0000-0000000000d1',
    format('insert into clinical_note_addenda (note_id, author_id, reason, body) values (%L, auth.uid(), %L, %L)',
      '00000000-0000-0000-0000-0000000000c3', 'x', 'y')), 'Addenda can only be added to a signed note');
select _assert('front desk can''t add addenda',
  _try('00000000-0000-0000-0000-0000000000f1',
    format('insert into clinical_note_addenda (note_id, author_id, reason, body) values (%L, auth.uid(), %L, %L)',
      '00000000-0000-0000-0000-0000000000c1', 'x', 'y')), 'Not allowed');
select _assert('the author can delete a draft',
  _try('00000000-0000-0000-0000-0000000000d1', $q$delete from clinical_notes where id = '00000000-0000-0000-0000-0000000000c3'$q$), 'ok');
select _assert('(it is gone)',
  (select count(*)::text from clinical_notes where id = '00000000-0000-0000-0000-0000000000c3'), '0');

-- ---------------------------------------------------------------------
-- Intake forms on a practice device
-- ---------------------------------------------------------------------
create or replace function _intake_sql(consent boolean) returns text language sql as $$
  select format($q$insert into intake_submissions (practice_id, patient_id, template_key, template_version, template, title,
                     answers, consent_given, consent_text, signed_name, source, collected_by)
                   values (%L, %L, 'general_health', 1, '{"key":"general_health"}', 'Health questionnaire',
                           '{"allergies":{"answer":"yes","details":"Penicillin"}}', %L, 'I agree', 'Thandi Mokoena', 'in_practice', auth.uid())$q$,
                current_setting('t.p'), '00000000-0000-0000-0000-00000000aaaa', consent);
$$;
select _assert('front desk hands a tablet over and the form is saved',
  _try('00000000-0000-0000-0000-0000000000f1', _intake_sql(true)), 'ok');
select _assert('consent is required',
  (_try('00000000-0000-0000-0000-0000000000f1', _intake_sql(false)) like '%check constraint%')::text, 'true');
select _assert('front desk can''t read the answers',
  _read('00000000-0000-0000-0000-0000000000f1', 'select count(*)::text from intake_submissions'), '0');
select _assert('but can see that it was completed',
  _read('00000000-0000-0000-0000-0000000000f1',
    format('select status || '' / '' || title from intake_overview(%L)', '00000000-0000-0000-0000-00000000aaaa')),
  'completed / Health questionnaire');
select _assert('a practitioner can read the answers',
  _read('00000000-0000-0000-0000-0000000000d1', 'select answers -> ''allergies'' ->> ''details'' from intake_submissions'), 'Penicillin');
do $$ begin
  update intake_submissions set answers = '{}';
  raise exception 'should not reach';
exception when others then perform set_config('t.err', sqlerrm, true); end $$;
select _assert('a submitted form can''t be changed',
  current_setting('t.err'), 'Submitted intake forms can''t be changed or deleted');

-- ---------------------------------------------------------------------
-- Intake forms by link
-- ---------------------------------------------------------------------
select _try('00000000-0000-0000-0000-0000000000f1',
  format('insert into t select %L, token from create_intake_link(%L, %L, %L)', 'link',
    '00000000-0000-0000-0000-00000000aaaa', 'iv_pretreatment', 'Before your drip'));
select _assert('front desk sends a link',
  (select count(*)::text from intake_requests where patient_id = '00000000-0000-0000-0000-00000000aaaa'), '1');
select _assert('only a hash of the link is kept',
  (select count(*)::text from intake_requests r join t on r.token_hash = t.v), '0');
select _assert('the link page greets the member and shows the practice',
  _read(null, format('select ((get_intake_link(%L)) ->> %L) || %L || ((get_intake_link(%L)) ->> %L)',
    (select v from t where k = 'link'), 'first_name', ' @ ', (select v from t where k = 'link'), 'practice_name')),
  'Thandi @ Glow IV Lounge');
select _assert('the wrong form is refused',
  _try(null, format('select submit_intake_link(%L, %L, %L, %L, %L)', (select v from t where k = 'link'),
    '{"key":"general_health","version":1}', '{}', 'I agree', 'Thandi Mokoena')),
  'This is not the form that was sent');
select _assert('the member submits without signing in',
  _try(null, format('select submit_intake_link(%L, %L, %L, %L, %L)', (select v from t where k = 'link'),
    '{"key":"iv_pretreatment","version":1}', '{"pregnant":{"answer":"no"}}', 'I agree', 'Thandi Mokoena')), 'ok');
select _assert('a link works once',
  _try(null, format('select submit_intake_link(%L, %L, %L, %L, %L)', (select v from t where k = 'link'),
    '{"key":"iv_pretreatment","version":1}', '{}', 'I agree', 'Thandi Mokoena')),
  'This form has already been sent. Thank you!');
select _assert('the activity log shows it came from the member''s link',
  (select actor_email from audit_log where action = 'intake_submissions.insert' and source = 'database' order by id desc limit 1),
  'Member, via intake link');
select _assert('a stranger cannot send links for our members',
  _try('00000000-0000-0000-0000-0000000000e1',
    format('select create_intake_link(%L, %L, %L)', '00000000-0000-0000-0000-00000000aaaa', 'general_health', 'x')), 'Not allowed');

update practices set clinical_records = 'off' where id = current_setting('t.p')::uuid;
select _assert('with clinical records off, no intake forms',
  _try('00000000-0000-0000-0000-0000000000f1',
    format('select create_intake_link(%L, %L, %L)', '00000000-0000-0000-0000-00000000aaaa', 'general_health', 'x')),
  'Intake forms are switched off for this practice');

-- ---------------------------------------------------------------------
-- Activity log and retention
-- ---------------------------------------------------------------------
select _assert('clinical content never enters the activity log',
  (select (string_agg(description || details::text, ' ') ~* 'headache|penicillin|fluids|bloods')::text from audit_log), 'false');
select _assert('signing is in the activity log',
  (select count(*)::text from audit_log where action = 'clinical_notes.update' and description like '%status draft → signed%'), '1');
select _assert('a member with clinical records can''t be deleted',
  (_try('00000000-0000-0000-0000-0000000000a1',
    $q$delete from patients where id = '00000000-0000-0000-0000-00000000aaaa'$q$) like '%foreign key%')::text, 'true');

delete from practices where id = current_setting('t.p')::uuid;
select _assert('Care Africa can still remove a whole practice',
  (select count(*)::text from practices where id = current_setting('t.p')::uuid), '0');

rollback;
