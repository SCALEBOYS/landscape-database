-- 写真の上に置くポイント（tecture のように、押すと素材・樹種がわかる）
-- 事例の植栽・構成要素は保存のたびに作り直すので、ポイントは樹種マスタ・素材の分類に結びつける
-- 製品名・メーカーは、同じ事例の構成要素から引いて表示する
create table photo_points (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references photos (id) on delete cascade,
  x real not null check (x >= 0 and x <= 1),   -- 写真の幅に対する位置（左端 0〜右端 1）
  y real not null check (y >= 0 and y <= 1),   -- 写真の高さに対する位置（上端 0〜下端 1）
  species_id uuid references species (id) on delete cascade,
  category_id uuid references component_categories (id) on delete cascade,
  note_ja text,                                -- 補足（例: 株立ち、目地は砂）
  note_en text,
  created_at timestamptz not null default now(),
  check ((species_id is null) <> (category_id is null))
);

create index photo_points_photo_idx on photo_points (photo_id);

alter table photo_points enable row level security;

-- 写真そのものが公開されているときだけ、ポイントも読める
create policy photo_points_public_read on photo_points for select
  using (exists (
    select 1 from photos ph join projects p on p.id = ph.project_id
    where ph.id = photo_id and ph.exif_stripped and ph.people_checked and p.status = 'published'
  ));
create policy photo_points_admin on photo_points for all using (is_admin()) with check (is_admin());
