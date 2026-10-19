-- 法令（法律・制度・条例）のマスタと、事例との関係（どう使われたか＋出典）
create type law_kind as enum (
  'law',        -- 国の法律
  'system',     -- 法律に基づく制度（総合設計・地区計画・緑化地域など）
  'ordinance'   -- 自治体の条例
);

create table laws (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind law_kind not null,
  name_ja text not null,
  name_en text,
  short_ja text,                         -- 探す画面のボタン用の短い名前（なければ name_ja）
  short_en text,
  jurisdiction_ja text not null default '国',  -- 条例なら自治体名
  jurisdiction_en text,
  basis_id uuid references laws (id) on delete set null,  -- 制度の根拠となる法律
  summary_ja text,                       -- 要点の説明（自分の文章）
  summary_en text,
  official_url text,                     -- e-Gov 法令検索・自治体の例規集など
  sort_order smallint not null default 0
);

create table project_laws (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  law_id uuid not null references laws (id) on delete restrict,
  note_ja text,                          -- どう使われたか（例: 公開空地を設けて容積率を緩和）
  note_en text,
  source_url text,                       -- その根拠となる公開資料
  sort_order smallint not null default 0,
  unique (project_id, law_id)
);

create index project_laws_project_idx on project_laws (project_id);
create index project_laws_law_idx on project_laws (law_id);

alter table laws enable row level security;
alter table project_laws enable row level security;

create policy laws_public_read on laws for select using (true);
create policy laws_admin on laws for all using (is_admin()) with check (is_admin());
create policy project_laws_public_read on project_laws for select
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
create policy project_laws_admin on project_laws for all using (is_admin()) with check (is_admin());

-- 初期の法令マスタ。説明は一般的な要点だけ。公式 URL は管理画面で後から入れる
insert into laws (slug, kind, name_ja, name_en, short_ja, short_en, sort_order, summary_ja) values
  ('urban-parks-act', 'law', '都市公園法', 'Urban Parks Act', null, 'Urban Parks', 10,
   '都市公園の設置と管理の基準を定める法律。公園施設の建ぺい率や、民間事業者が公園に施設を設ける仕組みなどを含む。'),
  ('urban-green-space-act', 'law', '都市緑地法', 'Urban Green Space Conservation Act', null, 'Urban Green Space', 20,
   '都市の緑地の保全と緑化の推進を定める法律。緑化地域・緑地協定・市民緑地認定などの制度の根拠になっている。'),
  ('landscape-act', 'law', '景観法', 'Landscape Act', null, 'Landscape Act', 30,
   '良好な景観をつくるための法律。景観計画・景観地区・景観重要樹木などの仕組みを定める。'),
  ('city-planning-act', 'law', '都市計画法', 'City Planning Act', null, 'City Planning', 40,
   '用途地域・地区計画・都市施設など、まちの土地利用と整備の枠組みを定める法律。'),
  ('building-standards-act', 'law', '建築基準法', 'Building Standards Act', null, 'Building Standards', 50,
   '建築物の敷地・構造・用途などの最低基準を定める法律。公開空地による容積率の緩和（総合設計制度）の根拠でもある。'),
  ('urban-renaissance-act', 'law', '都市再生特別措置法', 'Act on Special Measures concerning Urban Renaissance', '都市再生特措法', 'Urban Renaissance', 60,
   '都市再生緊急整備地域・都市再生特別地区・立地適正化計画など、都市の再生を進める仕組みを定める法律。'),
  ('river-act', 'law', '河川法', 'River Act', null, 'River Act', 70,
   '河川の管理を定める法律。河川敷や水辺の空間を使う際の占用許可にも関わる。'),
  ('cultural-properties-act', 'law', '文化財保護法', 'Act on Protection of Cultural Properties', null, 'Cultural Properties', 80,
   '史跡・名勝などの指定と保存・活用を定める法律。史跡を公園として整備する事例に関わる。'),
  ('barrier-free-act', 'law', 'バリアフリー法', 'Barrier-Free Act', null, 'Barrier-Free', 90,
   '高齢者や障害者などが移動しやすいよう、公園・道路・建築物の基準を定める法律。');

insert into laws (slug, kind, name_ja, name_en, short_ja, short_en, sort_order, basis_id, summary_ja)
select v.slug, 'system', v.name_ja, v.name_en, v.short_ja, v.short_en, v.sort_order, l.id, v.summary_ja
from (values
  ('comprehensive-design', '総合設計制度（公開空地）', 'Comprehensive design system (public open space)', '総合設計・公開空地', 'Public open space', 110, 'building-standards-act',
   '敷地内に誰でも使える公開空地を設けることで、容積率や高さの制限を緩和する制度。'),
  ('district-plan', '地区計画', 'District plan', null, 'District plan', 120, 'city-planning-act',
   '地区ごとに、建物の用途や形、緑地や広場の配置などを細かく定める都市計画の制度。'),
  ('greening-district', '緑化地域制度', 'Greening district', '緑化地域', 'Greening district', 130, 'urban-green-space-act',
   '指定された地域で、一定規模以上の建築物の敷地に緑化率の最低限度を義務付ける制度。'),
  ('park-pfi', '公募設置管理制度（Park-PFI）', 'Park-PFI', 'Park-PFI', 'Park-PFI', 140, 'urban-parks-act',
   '民間事業者が公園にカフェなどの収益施設を設け、その収益を公園の整備に充てる制度。'),
  ('citizen-green-space', '市民緑地認定制度', 'Certified citizen green space', '市民緑地', 'Citizen green space', 150, 'urban-green-space-act',
   '民有地を、地域に開かれた緑地として整備・管理する計画を自治体が認定する制度。'),
  ('urban-renaissance-district', '都市再生特別地区', 'Special urban renaissance district', null, 'Urban renaissance district', 160, 'urban-renaissance-act',
   '都市再生緊急整備地域の中で、既存の用途地域などの規制によらない自由度の高い計画を定める制度。'),
  ('river-space-use', '河川敷地占用の特例（都市・地域再生等利用区域）', 'Special use of riverside land', '河川敷の占用特例', 'Riverside use', 170, 'river-act',
   '河川敷地を広場やオープンカフェなどに使えるよう、占用できる者や施設を広げる特例。')
) as v(slug, name_ja, name_en, short_ja, short_en, sort_order, basis, summary_ja)
join laws l on l.slug = v.basis;

insert into laws (slug, kind, name_ja, name_en, jurisdiction_ja, jurisdiction_en, sort_order, summary_ja) values
  ('osaka-pref-nature-conservation', 'ordinance', '大阪府自然環境保全条例', 'Osaka Prefecture Natural Environment Conservation Ordinance', '大阪府', 'Osaka Prefecture', 210,
   '大阪府の自然環境の保全に関する条例。一定規模以上の建築物の敷地に緑化を求める基準を含む。'),
  ('osaka-city-landscape', 'ordinance', '大阪市都市景観条例', 'Osaka City Urban Landscape Ordinance', '大阪市', 'Osaka City', 220,
   '大阪市の都市景観の形成に関する条例。'),
  ('kyoto-city-townscape', 'ordinance', '京都市市街地景観整備条例', 'Kyoto City Townscape Ordinance', '京都市', 'Kyoto City', 230,
   '京都市の市街地の景観整備に関する条例。'),
  ('kobe-city-landscape', 'ordinance', '神戸市都市景観条例', 'Kobe City Urban Landscape Ordinance', '神戸市', 'Kobe City', 240,
   '神戸市の都市景観の形成に関する条例。'),
  ('hyogo-environment', 'ordinance', '環境の保全と創造に関する条例', 'Hyogo Prefecture Ordinance on Environmental Conservation and Creation', '兵庫県', 'Hyogo Prefecture', 250,
   '兵庫県の環境の保全と創造に関する条例。一定規模以上の建築物の敷地に緑化を求める基準を含む。');
