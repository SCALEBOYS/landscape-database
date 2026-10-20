-- 研究: 研究・設計の手法（解説ページ）と論文カード。論文は手法・事例・樹種・素材とつなぐ
-- 要約は公開されている抄録・書誌情報からの下書き（review_status = 'draft'）で、確認後に 'reviewed' にする。本文の転載はしない
create type review_status as enum ('draft', 'reviewed');
create type paper_kind as enum ('article', 'report', 'book');

create table methods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ja text not null,
  name_en text not null,
  summary_ja text not null,
  summary_en text,
  body_ja text,          -- 段落は空行で区切る。「- 」で始まる行は箇条書き
  body_en text,
  sort_order smallint not null default 100,
  review_status review_status not null default 'draft',
  updated_at timestamptz not null default now()
);

create table papers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind paper_kind not null default 'article',
  title text not null,      -- 原題
  title_ja text,            -- 原題が日本語でなければ、その訳
  authors text not null,    -- 原文どおり（例: Ulrich, R. S. / 斎藤 馨）
  year smallint not null check (year between 1800 and 2100),
  venue text not null,      -- 掲載誌・発行元
  volume text,
  issue text,
  pages text,
  doi text unique,
  url text,                 -- DOI がないものの原文・書誌ページ
  language text not null default 'en' check (language in ('ja', 'en', 'other')),
  summary_ja text not null,
  summary_en text,
  review_status review_status not null default 'draft',
  updated_at timestamptz not null default now(),
  check (doi is not null or url is not null)
);

create table paper_methods (
  paper_id uuid not null references papers (id) on delete cascade,
  method_id uuid not null references methods (id) on delete cascade,
  primary key (paper_id, method_id)
);
create table paper_projects (
  paper_id uuid not null references papers (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  note_ja text,
  primary key (paper_id, project_id)
);
create table paper_species (
  paper_id uuid not null references papers (id) on delete cascade,
  species_id uuid not null references species (id) on delete cascade,
  primary key (paper_id, species_id)
);
create table paper_categories (
  paper_id uuid not null references papers (id) on delete cascade,
  category_id uuid not null references component_categories (id) on delete cascade,
  primary key (paper_id, category_id)
);

alter table methods enable row level security;
alter table papers enable row level security;
alter table paper_methods enable row level security;
alter table paper_projects enable row level security;
alter table paper_species enable row level security;
alter table paper_categories enable row level security;

create policy methods_public_read on methods for select using (true);
create policy methods_admin on methods for all using (is_admin()) with check (is_admin());
create policy papers_public_read on papers for select using (true);
create policy papers_admin on papers for all using (is_admin()) with check (is_admin());
create policy paper_methods_public_read on paper_methods for select using (true);
create policy paper_methods_admin on paper_methods for all using (is_admin()) with check (is_admin());
create policy paper_projects_public_read on paper_projects for select
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
create policy paper_projects_admin on paper_projects for all using (is_admin()) with check (is_admin());
create policy paper_species_public_read on paper_species for select using (true);
create policy paper_species_admin on paper_species for all using (is_admin()) with check (is_admin());
create policy paper_categories_public_read on paper_categories for select using (true);
create policy paper_categories_admin on paper_categories for all using (is_admin()) with check (is_admin());
