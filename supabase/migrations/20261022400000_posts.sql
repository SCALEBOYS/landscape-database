-- HOME に出す NEWS と特集の記事。管理画面で書く
create type post_kind as enum ('news', 'feature');

create table posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind post_kind not null default 'news',
  title_ja text not null check (length(trim(title_ja)) between 1 and 200),
  title_en text,
  summary_ja text,
  summary_en text,
  body_ja text,   -- 段落は空行で区切る。「- 」で始まる行は箇条書き
  body_en text,
  project_id uuid references projects (id) on delete set null, -- 関係する事例（カバー画像にも使う）
  link_url text,  -- 外部のお知らせなどへのリンク（任意）
  status publish_status not null default 'draft',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_published_idx on posts (status, published_at desc);

alter table posts enable row level security;
create policy posts_public_read on posts for select using (status = 'published');
create policy posts_admin on posts for all using (is_admin()) with check (is_admin());

-- 最初のお知らせ（公開の告知）
insert into posts (slug, kind, title_ja, title_en, summary_ja, summary_en, body_ja, body_en, status, published_at) values
('launch', 'news', 'Landscape Database を公開しました', 'Landscape Database is live',
 '関西のランドスケープ事例を、用途・素材・樹種・設計・法令・研究から横断して探せるデータベースを公開しました。',
 'A database for finding landscape projects in Kansai by type, material, plant, designer, regulation and research is now live.',
 '関西のランドスケープ（公園・広場・街路・外構など）の事例を集めたデータベースを公開しました。

できること
- 事例を、用途・地域・竣工年・設計などで絞り込み、地図の上でも探せます
- 事例を3件まで並べて、敷地面積や竣工年などを比べられます
- 研究の手法と代表的な論文、関係する法令をまとめて調べられます
- 3D モデルや現地写真を一覧で見られます

掲載内容の訂正や、取り上げてほしい事例があれば、お問い合わせフォームからお知らせください。',
 'We have launched a database of landscape architecture projects — parks, plazas, streets and building surroundings — in Kansai.

What you can do
- Filter projects by type, area, completion year and designer, and find them on a map
- Compare up to three projects side by side
- Look up research methods, key papers and related regulations
- Browse 3D models and on-site photos

If you spot an error or know a project we should add, please let us know through the contact form.',
 'published', '2026-10-21 12:00+09');
