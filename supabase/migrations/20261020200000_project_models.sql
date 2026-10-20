-- 事例の 3D モデル（GLB / glTF）。事例ページの 3D ビューアと、上部の 3D 地図の上に置いて見せる
-- ファイルは公開バケット models に置く。書き込み・削除は管理者だけ
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('models', 'models', true, 52428800, array['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'])
on conflict (id) do nothing;

create policy models_bucket_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'models' and public.is_admin());
create policy models_bucket_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'models' and public.is_admin());
create policy models_bucket_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'models' and public.is_admin());
create policy models_bucket_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'models' and public.is_admin());

create table project_models (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  size_bytes integer not null check (size_bytes > 0),
  caption_ja text,
  caption_en text,
  -- 地図に置くときの位置合わせ。原点は事例の座標で、そこから東・北にずらせる（単位 m）
  offset_east_m real not null default 0,
  offset_north_m real not null default 0,
  altitude_m real not null default 0,
  rotation_deg real not null default 0,      -- 真北から時計回りの向き
  scale real not null default 1 check (scale > 0),
  show_on_map boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index project_models_project_idx on project_models (project_id);

alter table project_models enable row level security;
create policy project_models_public_read on project_models for select
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
create policy project_models_admin on project_models for all using (is_admin()) with check (is_admin());
