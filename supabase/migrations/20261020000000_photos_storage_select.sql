-- Storage の削除（remove）は対象を読めないと何も消えないため、管理者に読み取りも許可する
create policy photos_bucket_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_admin());
