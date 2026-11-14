-- =====================================================================
-- 0003 — Practice branding
-- Each practice can set a primary and an accent colour (hex, e.g. #0F766E)
-- and a logo. The app themes itself from these after login.
-- Writes are already limited to practice admins by practices_admin_write.
-- =====================================================================

alter table practices
  add column brand_primary_color text,
  add column brand_accent_color  text,
  add constraint practices_brand_primary_hex
    check (brand_primary_color is null or brand_primary_color ~* '^#[0-9a-f]{6}$'),
  add constraint practices_brand_accent_hex
    check (brand_accent_color is null or brand_accent_color ~* '^#[0-9a-f]{6}$');

comment on column practices.brand_primary_color is
  'Main brand colour as #RRGGBB. Used for buttons, navigation highlights and the practice name. Null = Care Africa default.';
comment on column practices.brand_accent_color is
  'Secondary brand colour as #RRGGBB. Null = Care Africa default.';

-- ---------------------------------------------------------------------
-- Storage bucket for practice logos.
-- Files live at practice-branding/<practice_id>/<file>.
-- Logos are public (they appear on reminders and patient-facing pages);
-- only admins of that practice can upload, replace or delete them.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('practice-branding', 'practice-branding', true, 2097152,
        array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do nothing;

create policy practice_branding_read on storage.objects
  for select using (bucket_id = 'practice-branding');

create policy practice_branding_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'practice-branding'
    and auth_is_practice_admin(((storage.foldername(name))[1])::uuid)
  );

create policy practice_branding_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'practice-branding'
    and auth_is_practice_admin(((storage.foldername(name))[1])::uuid)
  );

create policy practice_branding_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'practice-branding'
    and auth_is_practice_admin(((storage.foldername(name))[1])::uuid)
  );
