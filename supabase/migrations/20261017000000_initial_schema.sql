-- Landscape Database: initial schema
-- 物件（親子）・関係者・構成要素・樹種マスタ・写真・出典・受賞・非公開メモ

create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------
-- 管理者
-- ---------------------------------------------------------------
create table admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 物件
-- ---------------------------------------------------------------
create type project_use as enum (
  'park',            -- 公園
  'plaza',           -- 広場
  'greenway',        -- 緑道・遊歩道
  'street',          -- 街路・道路空間
  'waterfront',      -- 水辺・河川・港湾
  'commercial',      -- 商業施設外構
  'office',          -- オフィス外構・公開空地
  'housing',         -- 集合住宅外構
  'public_facility', -- 庁舎・文化施設など公共建築外構
  'education',       -- 学校・大学キャンパス
  'healthcare',      -- 病院・福祉施設
  'rooftop',         -- 屋上緑化
  'wall_greening',   -- 壁面緑化
  'redevelopment',   -- 面的な都市計画・再開発（親になることが多い）
  'other'
);

create type publish_status as enum ('draft', 'published');
create type translation_status as enum ('none', 'machine_draft', 'reviewed');

create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_id uuid references projects (id) on delete set null,
  name_ja text not null,
  name_en text,
  use_category project_use not null,
  prefecture text not null,             -- 例: '大阪府'
  municipality text,                    -- 例: '大阪市北区'
  address_ja text,
  location geography (point, 4326),
  completed_year smallint check (completed_year between 1800 and 2100),
  completion_note text,                 -- 段階竣工など
  site_area_m2 numeric(12, 2) check (site_area_m2 > 0),
  summary_ja text,                      -- 公開情報の要約（自分の文章）
  summary_en text,
  summary_en_status translation_status not null default 'none',
  status publish_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create index projects_parent_idx on projects (parent_id);
create index projects_location_idx on projects using gist (location);
create index projects_prefecture_idx on projects (prefecture);
create index projects_use_idx on projects (use_category);
create index projects_year_idx on projects (completed_year);
create index projects_name_trgm_idx on projects using gin (name_ja gin_trgm_ops);

create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

-- 非公開層: 管理者のみ
create table project_private_notes (
  project_id uuid primary key references projects (id) on delete cascade,
  impressions text,      -- 所感
  rating smallint check (rating between 1 and 5),
  detail_notes text,     -- 設計に使えるディテール
  cost_notes text,
  visit_notes text,      -- 撮影許可・アクセスなど
  updated_at timestamptz not null default now()
);

create trigger project_private_notes_updated_at before update on project_private_notes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------
-- 関係者（設計者・施工者・施主）
-- ---------------------------------------------------------------
create table parties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ja text not null,
  name_en text,
  is_person boolean not null default false,
  website_url text,
  created_at timestamptz not null default now()
);

create index parties_name_trgm_idx on parties using gin (name_ja gin_trgm_ops);

create type credit_role as enum (
  'landscape_design',       -- ランドスケープ設計
  'architecture',           -- 建築設計
  'urban_design',           -- 都市計画・マスタープラン
  'construction',           -- 施工
  'landscape_construction', -- 造園施工
  'client',                 -- 施主・事業者
  'other'
);

create table project_credits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  party_id uuid not null references parties (id) on delete restrict,
  role credit_role not null,
  note text,
  sort_order smallint not null default 0,
  unique (project_id, party_id, role)
);

create index project_credits_party_idx on project_credits (party_id);

-- ---------------------------------------------------------------
-- 樹種マスタ（YList を初期データに）
-- ---------------------------------------------------------------
create type growth_form as enum (
  'tree', 'shrub', 'ground_cover', 'climber', 'grass', 'fern', 'aquatic', 'bamboo', 'other'
);

create table species (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), -- 学名ベース 例: zelkova-serrata
  name_ja text not null,             -- 標準和名（カタカナ）
  name_en text,
  scientific_name text not null unique,
  family_ja text,
  family_scientific text,
  growth_form growth_form,
  evergreen boolean,
  ylist_id text unique,
  created_at timestamptz not null default now()
);

-- 表記ゆれ（欅 / けやき 等）
create table species_aliases (
  alias text primary key,
  species_id uuid not null references species (id) on delete cascade
);

create index species_name_trgm_idx on species using gin (name_ja gin_trgm_ops);

create type planting_layer as enum (
  'tall_tree', 'mid_tree', 'shrub', 'ground_cover', 'climber', 'other'
);

create table project_plantings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  species_id uuid not null references species (id) on delete restrict,
  layer planting_layer not null,
  note text,
  unique (project_id, species_id, layer)
);

create index project_plantings_species_idx on project_plantings (species_id);

-- ---------------------------------------------------------------
-- 構成要素: 一般分類（必須）+ 製品名・メーカー（任意文字列）
-- ---------------------------------------------------------------
create type component_kind as enum (
  'paving', 'furniture', 'lighting', 'water', 'play', 'greening_system', 'wall_fence', 'other'
);

create table component_categories (
  id uuid primary key default gen_random_uuid(),
  kind component_kind not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ja text not null,
  name_en text not null,
  sort_order smallint not null default 0
);

create table project_components (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  category_id uuid not null references component_categories (id) on delete restrict,
  product_name text,   -- 将来メーカーマスタへ移行
  maker_name text,
  note text
);

create index project_components_project_idx on project_components (project_id);
create index project_components_category_idx on project_components (category_id);

-- ---------------------------------------------------------------
-- 写真（自分で撮影したもののみ。EXIF は削除済みで保存）
-- ---------------------------------------------------------------
create table photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  storage_path text not null unique,
  taken_on date not null,
  caption_ja text,
  caption_en text,
  width integer,
  height integer,
  credit text not null default '© Landscape Database',
  exif_stripped boolean not null default false,
  people_checked boolean not null default false, -- 人物の写り込み確認済み
  is_cover boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index photos_project_idx on photos (project_id, sort_order);
create unique index photos_one_cover_idx on photos (project_id) where is_cover;

-- ---------------------------------------------------------------
-- 出典・受賞
-- ---------------------------------------------------------------
create type source_kind as enum ('award', 'official', 'designer', 'article', 'other');

create table sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  kind source_kind not null,
  url text not null,
  title text,
  publisher text,
  accessed_on date,
  unique (project_id, url)
);

create table project_awards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  award_name text not null,   -- 例: '日本造園学会賞（作品部門）'
  award_year smallint,
  category text,
  source_url text
);

create index project_awards_project_idx on project_awards (project_id);

-- ---------------------------------------------------------------
-- RLS: 公開物件とその子データは誰でも読める。書き込みと非公開層は管理者のみ
-- ---------------------------------------------------------------
alter table admins enable row level security;
alter table projects enable row level security;
alter table project_private_notes enable row level security;
alter table parties enable row level security;
alter table project_credits enable row level security;
alter table species enable row level security;
alter table species_aliases enable row level security;
alter table project_plantings enable row level security;
alter table component_categories enable row level security;
alter table project_components enable row level security;
alter table photos enable row level security;
alter table sources enable row level security;
alter table project_awards enable row level security;

create policy admins_admin on admins for all using (is_admin()) with check (is_admin());

create policy projects_public_read on projects for select using (status = 'published');
create policy projects_admin on projects for all using (is_admin()) with check (is_admin());

create policy private_notes_admin on project_private_notes for all using (is_admin()) with check (is_admin());

-- マスタは常に公開
create policy parties_public_read on parties for select using (true);
create policy parties_admin on parties for all using (is_admin()) with check (is_admin());
create policy species_public_read on species for select using (true);
create policy species_admin on species for all using (is_admin()) with check (is_admin());
create policy species_aliases_public_read on species_aliases for select using (true);
create policy species_aliases_admin on species_aliases for all using (is_admin()) with check (is_admin());
create policy component_categories_public_read on component_categories for select using (true);
create policy component_categories_admin on component_categories for all using (is_admin()) with check (is_admin());

-- 物件の子データ: 親物件が公開されていれば読める
create policy project_credits_public_read on project_credits for select
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
create policy project_credits_admin on project_credits for all using (is_admin()) with check (is_admin());

create policy project_plantings_public_read on project_plantings for select
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
create policy project_plantings_admin on project_plantings for all using (is_admin()) with check (is_admin());

create policy project_components_public_read on project_components for select
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
create policy project_components_admin on project_components for all using (is_admin()) with check (is_admin());

-- 写真は EXIF 削除・人物確認の両方が済んだものだけ公開
create policy photos_public_read on photos for select
  using (exif_stripped and people_checked
         and exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
create policy photos_admin on photos for all using (is_admin()) with check (is_admin());

create policy sources_public_read on sources for select
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
create policy sources_admin on sources for all using (is_admin()) with check (is_admin());

create policy project_awards_public_read on project_awards for select
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
create policy project_awards_admin on project_awards for all using (is_admin()) with check (is_admin());
