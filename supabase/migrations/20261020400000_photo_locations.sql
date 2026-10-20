-- 写真の撮影地点と向き。写真ファイルからは EXIF を消すので、位置だけをここに残す
-- 公開するかは写真ごとに選ぶ（is_public = false の地点は公開サイトから読めない）
create table photo_locations (
  photo_id uuid primary key references photos (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  heading real check (heading >= 0 and heading < 360), -- 撮影した向き（北が0、時計回り）。分からなければ null
  source text not null check (source in ('exif', 'manual')),
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table photo_locations enable row level security;

create policy photo_locations_public_read on photo_locations for select
  using (is_public and exists (
    select 1 from photos ph join projects p on p.id = ph.project_id
    where ph.id = photo_id and ph.exif_stripped and ph.people_checked and p.status = 'published'));
create policy photo_locations_admin on photo_locations for all using (is_admin()) with check (is_admin());
