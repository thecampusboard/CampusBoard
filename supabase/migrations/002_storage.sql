-- ============================================================================
-- CampusBoard — Storage buckets & policies
-- ============================================================================

-- Public buckets: attachments/images that are fine for anyone to view once
-- published. Writes are still admin-only (or owner-only for listing photos).
insert into storage.buckets (id, name, public)
values
  ('notice-files', 'notice-files', true),
  ('content-images', 'content-images', true),
  ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Private bucket: UPI payment screenshots. Never public — only the
-- submitting student and Admin may read these.
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- notice-files — Admin uploads, anyone can read.
-- ----------------------------------------------------------------------------
create policy notice_files_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'notice-files');

create policy notice_files_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'notice-files' and public.is_admin());

create policy notice_files_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'notice-files' and public.is_admin())
  with check (bucket_id = 'notice-files' and public.is_admin());

create policy notice_files_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'notice-files' and public.is_admin());

-- ----------------------------------------------------------------------------
-- content-images — event/club/opportunity images. Admin uploads, anyone reads.
-- ----------------------------------------------------------------------------
create policy content_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'content-images');

create policy content_images_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'content-images' and public.is_admin());

create policy content_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'content-images' and public.is_admin())
  with check (bucket_id = 'content-images' and public.is_admin());

create policy content_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'content-images' and public.is_admin());

-- ----------------------------------------------------------------------------
-- listing-images — Buy & Sell item photos. Sellers upload their own, under a
-- path prefixed with their own user id: {auth.uid()}/{listingId}/{file}.
-- Readable by anyone once public (the item photo itself isn't sensitive);
-- writable only by the owner (via the path prefix) or Admin.
-- ----------------------------------------------------------------------------
create policy listing_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'listing-images');

create policy listing_images_owner_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy listing_images_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'listing-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy listing_images_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ----------------------------------------------------------------------------
-- payment-screenshots — PRIVATE. Path convention:
-- {auth.uid()}/{listingId}/{file}. Only the uploading student and Admin may
-- read or write; there is no public read policy at all, so the app must use
-- a signed URL (or the Admin's authenticated session) to display these.
-- ----------------------------------------------------------------------------
create policy payment_screenshots_owner_or_admin_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-screenshots'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy payment_screenshots_owner_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy payment_screenshots_owner_or_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'payment-screenshots'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'payment-screenshots'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy payment_screenshots_owner_or_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-screenshots'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
