-- 写真の保存先（公開バケット）。読み取りは誰でも、書き込み・削除は管理者だけ
-- 写真はブラウザ側で再エンコードして EXIF を消してから JPEG で上げる（web/src/app/admin/photos.ts）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg'])
on conflict (id) do nothing;

create policy photos_bucket_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_admin());
create policy photos_bucket_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.is_admin());
create policy photos_bucket_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_admin());
