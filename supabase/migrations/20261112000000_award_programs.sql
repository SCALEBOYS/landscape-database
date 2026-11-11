-- 賞のマスタ。管理画面で賞を選んで入れるようにして、同じ賞の書き方がばらつかないようにする。
-- project_awards.award_name は表示用に残す（保存時に「賞の名前 + 賞の種類」で組み立てる）。
-- 賞の種類（最優秀賞・知事賞など）は既存の category 列に入れる。
create table award_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ja text not null unique check (length(trim(name_ja)) between 1 and 200),
  name_en text,
  organizer_ja text,
  url text,
  aliases text[] not null default '{}', -- 旧名・略称など（この名前で入れても同じ賞になる）
  prizes text[] not null default '{}',  -- よく使う賞の種類（入力の候補に出す）
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table award_programs enable row level security;
create policy award_programs_public_read on award_programs for select using (true);
create policy award_programs_admin on award_programs for all using (is_admin()) with check (is_admin());

alter table project_awards add column program_id uuid references award_programs (id) on delete restrict;
create index project_awards_program_idx on project_awards (program_id);

insert into award_programs (slug, name_ja, name_en, organizer_ja, aliases, prizes, sort_order) values
  ('toshikoen-concours', '都市公園等コンクール', 'Urban Park Competition', '一般社団法人 日本公園緑地協会',
    '{都市公園コンクール}',
    '{国土交通大臣賞,国土交通大臣賞（特定テーマ）,国土交通省都市局長賞,国土交通省都市局長賞（設計）,国土交通省都市局長賞（特定テーマ）,日本公園緑地協会会長賞,日本公園緑地協会会長賞（設計）}', 10),
  ('osaka-landscape-award', '大阪ランドスケープ賞', 'Osaka Landscape Award', '大阪府・ランドスケープコンサルタンツ協会関西支部 ほか',
    '{みどりのまちづくり賞,大阪府みどりのまちづくり賞}',
    '{知事賞,LCA関西支部長賞,LCA関西支部長賞（マネジメント部門）,花博記念協会会長賞,奨励賞}', 20),
  ('osaka-machinami-award', '大阪まちなみ賞', 'Osaka Urban Scenery Award', '大阪府・大阪市 ほか',
    '{大阪都市景観建築賞}', '{大阪府知事賞,大阪市長賞,緑化賞,奨励賞}', 30),
  ('jsce-design-award', '土木学会デザイン賞', 'JSCE Design Prize', '公益社団法人 土木学会',
    '{}', '{最優秀賞,優秀賞,奨励賞}', 40),
  ('jila-award', '日本造園学会賞', 'JILA Award', '公益社団法人 日本造園学会',
    '{}', '{設計作品,奨励賞}', 50),
  ('cla-award', 'CLA賞', 'CLA Award', '一般社団法人 ランドスケープコンサルタンツ協会',
    '{ランドスケープコンサルタンツ協会賞}', '{設計部門最優秀賞,設計部門優秀賞,設計部門奨励賞,設計部門特別賞}', 60),
  ('good-design-award', 'グッドデザイン賞', 'Good Design Award', '公益財団法人 日本デザイン振興会',
    '{Gマーク}', '{金賞,ベスト100,ベスト100 グッドフォーカス賞}', 70),
  ('ningen-size-award', '人間サイズのまちづくり賞', 'Human-Scale Townscape Award', '兵庫県',
    '{}', '{知事賞,奨励賞}', 80),
  ('rooftop-greening-concours', '屋上・壁面・特殊緑化技術コンクール', 'Rooftop, Wall and Special Greening Technology Competition', '公益財団法人 都市緑化機構',
    '{屋上・壁面緑化技術コンクール}', '{国土交通大臣賞,環境大臣賞,日本経済新聞社賞,都市緑化機構理事長賞}', 90),
  ('ryo-design-award', '“涼”デザイン建築賞', 'Cool Design Architecture Award', '大阪府・大阪市',
    '{涼デザイン建築賞}', '{}', 100),
  ('osaka-eco-building-award', 'おおさか環境にやさしい建築賞', 'Osaka Environment-Friendly Building Award', '大阪府・大阪市',
    '{}', '{}', 110),
  ('osaka-climate-award', 'おおさか気候変動対策賞', 'Osaka Climate Action Award', '大阪府',
    '{}', '{特別賞}', 120);

-- 既存の受賞を賞のマスタにつなぐ（award_name → 賞 + 賞の種類）
create temp table award_map (award_name text primary key, slug text not null, prize text);
insert into award_map values
  ('“涼”デザイン建築賞 -ZEB Style-(南館)', 'ryo-design-award', 'ZEB Style（南館）'),
  ('2025年度 グッドデザイン賞', 'good-design-award', null),
  ('CLA賞設計部門優秀賞', 'cla-award', '設計部門優秀賞'),
  ('CLA賞設計部門最優秀賞', 'cla-award', '設計部門最優秀賞'),
  ('CLA賞設計部門奨励賞', 'cla-award', '設計部門奨励賞'),
  ('CLA賞設計部門特別賞', 'cla-award', '設計部門特別賞'),
  ('グッドデザイン・ベスト100', 'good-design-award', 'ベスト100'),
  ('グッドデザイン・ベスト100 グッドフォーカス賞［地域社会デザイン］', 'good-design-award', 'ベスト100 グッドフォーカス賞［地域社会デザイン］'),
  ('グッドデザイン賞', 'good-design-award', null),
  ('グッドデザイン金賞', 'good-design-award', '金賞'),
  ('人間サイズのまちづくり賞 知事賞', 'ningen-size-award', '知事賞'),
  ('人間サイズのまちづくり賞奨励賞', 'ningen-size-award', '奨励賞'),
  ('令和7年度 おおさか気候変動対策賞（特別賞）', 'osaka-climate-award', '特別賞'),
  ('令和7年度 おおさか環境にやさしい建築賞', 'osaka-eco-building-award', null),
  ('土木学会デザイン賞優秀賞', 'jsce-design-award', '優秀賞'),
  ('土木学会デザイン賞最優秀賞', 'jsce-design-award', '最優秀賞'),
  ('大阪まちなみ賞 緑化賞', 'osaka-machinami-award', '緑化賞'),
  ('大阪ランドスケープ賞 LCA関西支部長賞', 'osaka-landscape-award', 'LCA関西支部長賞'),
  ('大阪ランドスケープ賞 LCA関西支部長賞（マネジメント部門）', 'osaka-landscape-award', 'LCA関西支部長賞（マネジメント部門）'),
  ('大阪ランドスケープ賞 奨励賞', 'osaka-landscape-award', '奨励賞'),
  ('大阪ランドスケープ賞 知事賞', 'osaka-landscape-award', '知事賞'),
  ('大阪ランドスケープ賞 花博記念協会会長賞', 'osaka-landscape-award', '花博記念協会会長賞'),
  ('大阪市長賞', 'osaka-machinami-award', '大阪市長賞'),
  ('屋上・壁面緑化技術コンクール 日本経済新聞社賞', 'rooftop-greening-concours', '日本経済新聞社賞'),
  ('日本造園学会賞（設計作品）', 'jila-award', '設計作品'),
  ('日本造園学会賞奨励賞', 'jila-award', '奨励賞'),
  ('都市公園等コンクール 日本公園緑地協会会長賞', 'toshikoen-concours', '日本公園緑地協会会長賞'),
  ('都市公園等コンクール 日本公園緑地協会会長賞（設計）', 'toshikoen-concours', '日本公園緑地協会会長賞（設計）'),
  ('都市公園等コンクール会長賞（設計）', 'toshikoen-concours', '日本公園緑地協会会長賞（設計）'),
  ('都市公園等コンクール国土交通大臣賞', 'toshikoen-concours', '国土交通大臣賞'),
  ('都市公園等コンクール国土交通大臣賞（特定テーマ）', 'toshikoen-concours', '国土交通大臣賞（特定テーマ）'),
  ('都市公園等コンクール国土交通省都市局長賞', 'toshikoen-concours', '国土交通省都市局長賞'),
  ('都市公園等コンクール国土交通省都市局長賞（特定テーマ）', 'toshikoen-concours', '国土交通省都市局長賞（特定テーマ）'),
  ('都市公園等コンクール国土交通省都市局長賞（設計）', 'toshikoen-concours', '国土交通省都市局長賞（設計）');

update project_awards a
set program_id = ap.id,
    category = m.prize,
    award_name = ap.name_ja || coalesce(' ' || m.prize, '')
from award_map m join award_programs ap on ap.slug = m.slug
where a.award_name = m.award_name;

drop table award_map;
