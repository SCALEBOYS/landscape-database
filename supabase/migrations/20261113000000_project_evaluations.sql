-- 評価の軸: 受賞の講評で「何が評価されたか」を、軸ごとに短くまとめて持つ。
-- 講評の文章そのものは載せない（要点を自分の言葉で書き、出典の URL を付ける）。
-- 受賞（project_awards）の行は管理画面の保存で入れ替わるので、事例と賞の名前（award_programs）に結び付ける。
create table project_evaluations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  program_id uuid references award_programs (id) on delete set null,
  axis text not null check (axis in ('context','heritage','green','activity','connect','detail','integration','process','management','impact')),
  stance text not null default 'valued' check (stance in ('valued','concern')),
  point_ja text not null,
  point_en text,
  source_url text,
  sort_order int not null default 0
);
create index project_evaluations_project_idx on project_evaluations (project_id);
alter table project_evaluations enable row level security;
create policy project_evaluations_public_read on project_evaluations for select
  using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
create policy project_evaluations_admin on project_evaluations for all using (is_admin()) with check (is_admin());

-- 土木学会デザイン賞のシーパスパークは 2025 年の受賞
update project_awards a set award_year = 2025
  from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'sheepath-park' and g.slug = 'jsce-design-award' and a.award_year is null;

-- k-a4ed5e5e / jsce-design-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://design-prize.sakura.ne.jp/archives/result/1894', v.ord
  from projects p, award_programs g, (values
    ('context', 'valued', '二つの鉄道高架に挟まれた不整形な敷地の難しさを、丘の公園と歩行者デッキで解いた', 0),
    ('connect', 'valued', '駅からホール、その先の医療センターまで、ゆるい勾配のまま歩いて抜けられる', 1),
    ('activity', 'valued', '通り抜ける人と留まる人が互いの気配を感じながら、思い思いに過ごしている', 2),
    ('integration', 'valued', 'ランドスケープと建築、複数の事業が連動して一つの地形をつくった', 3),
    ('detail', 'valued', '電車からも見渡せる「見る・見られる」の関係と、夜の照明の演出', 4)
  ) as v(axis, stance, point, ord)
  where p.slug = 'k-a4ed5e5e' and g.slug = 'jsce-design-award';

update project_awards a set source_url = 'https://design-prize.sakura.ne.jp/archives/result/1894' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'k-a4ed5e5e' and g.slug = 'jsce-design-award' and a.source_url is null;

-- k-5266d695 / jsce-design-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://design-prize.sakura.ne.jp/archives/result/1925', v.ord
  from projects p, award_programs g, (values
    ('context', 'valued', '本流は護岸を寝かせ、支流は立てることで、それぞれの川らしい景観を際立たせた', 0),
    ('activity', 'valued', '川に近づきやすくなり、場所ごとに水辺を楽しむ人の姿がある', 1),
    ('detail', 'valued', '柵を低くし川側へ下げるなど、場所ごとに周りの景観へなじませた', 2),
    ('heritage', 'valued', '水位の変化に合わせた船着場など、長く続く観光文化を支える基盤を整えた', 3),
    ('management', 'concern', '増水で柵や舗装が傷み立ち入れない場所があり、水辺への近さと安全の両立が課題', 4)
  ) as v(axis, stance, point, ord)
  where p.slug = 'k-5266d695' and g.slug = 'jsce-design-award';

update project_awards a set source_url = 'https://design-prize.sakura.ne.jp/archives/result/1925' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'k-5266d695' and g.slug = 'jsce-design-award' and a.source_url is null;

-- k-140bca5d / jsce-design-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://design-prize.sakura.ne.jp/archives/result/2158', v.ord
  from projects p, award_programs g, (values
    ('connect', 'valued', '交通規制と高架下の開放で、通りと広場が車道に分断されず歩行者優先でつながった', 0),
    ('detail', 'valued', '高架下の開口の比率、舗装の引き込み、官民境界の処理に工夫がある', 1),
    ('impact', 'valued', '駅周辺の交通再編と歩行者優先の空間づくりを先導するモデルになった', 2),
    ('management', 'valued', '地元のエリアマネジメント組織が社会実験を重ねながら広場を運営している', 3),
    ('heritage', 'concern', 'かつての歴史の一部や既存の樹木が引き継がれなかった点に疑問が示された', 4),
    ('management', 'concern', 'ゴミ・駐輪など繁華街の環境を改善する工夫が今後に期待された', 5)
  ) as v(axis, stance, point, ord)
  where p.slug = 'k-140bca5d' and g.slug = 'jsce-design-award';

update project_awards a set source_url = 'https://design-prize.sakura.ne.jp/archives/result/2158' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'k-140bca5d' and g.slug = 'jsce-design-award' and a.source_url is null;

-- k-8b798c0a / jsce-design-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://design-prize.sakura.ne.jp/archives/result/2161', v.ord
  from projects p, award_programs g, (values
    ('context', 'valued', '「谷」のような空地で通天閣とあべのハルカスへの軸線を通し、駅ホームと緑地を向き合わせた', 0),
    ('green', 'valued', '小さな居場所を散りばめた、完成度の高い緑ゆたかな広場', 1),
    ('detail', 'valued', '起伏と植栽帯でやわらかく敷地を区切り、将来は開けるよう境界を丁寧に処理した', 2),
    ('impact', 'valued', '長く未利用だった駅前を変え、地域の変化を促すきっかけになった', 3),
    ('connect', 'concern', '広場が利用者以外に開放されておらず、入口がわかりにくい点が議論になった', 4)
  ) as v(axis, stance, point, ord)
  where p.slug = 'k-8b798c0a' and g.slug = 'jsce-design-award';

update project_awards a set source_url = 'https://design-prize.sakura.ne.jp/archives/result/2161' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'k-8b798c0a' and g.slug = 'jsce-design-award' and a.source_url is null;

-- k-aa97b7df / jsce-design-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://design-prize.sakura.ne.jp/archives/result/2609', v.ord
  from projects p, award_programs g, (values
    ('connect', 'valued', '柵を設けず、ベンチと見通しのよい植栽でゆるやかに囲い、まちに開いている', 0),
    ('activity', 'valued', '遊具がなくても斜面や起伏が遊び場になり、幅広い世代の人が絶えない', 1),
    ('integration', 'valued', '建築と土木が継ぎ目なく一体になった起伏の造形', 2),
    ('process', 'valued', '独創的な構想を受け入れ、防災などの予算も集めた行政の判断と、施工時の丁寧な調整', 3),
    ('impact', 'valued', '駅周辺の回遊を促し、周りのエリアの価値を高める挑戦', 4),
    ('management', 'concern', '天然芝やゴムチップなど、質の高さに見合う維持管理の体制と耐久性が気がかりとされた', 5)
  ) as v(axis, stance, point, ord)
  where p.slug = 'k-aa97b7df' and g.slug = 'jsce-design-award';

update project_awards a set source_url = 'https://design-prize.sakura.ne.jp/archives/result/2609' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'k-aa97b7df' and g.slug = 'jsce-design-award' and a.source_url is null;

-- kusatsugawa-atochi-park-5 / jsce-design-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://design-prize.sakura.ne.jp/archives/result/1237', v.ord
  from projects p, award_programs g, (values
    ('context', 'valued', '天井川だった履歴と地形を読み取り、堤防に囲われた高台という特徴を生かした', 0),
    ('activity', 'valued', '時間帯ごとにさまざまな市民が集い、長く居たくなる居心地がある', 1),
    ('process', 'valued', '市民を含む関係者が、計画から施工まで粘り強く議論を重ねた', 2),
    ('management', 'valued', '市民の活動と商業施設を重ねて配置し、市民が自ら手をかけて使う場になった', 3),
    ('detail', 'valued', '質感の高い護岸・舗装・植栽と、夜のライトアップ', 4),
    ('detail', 'concern', '見覚えのあるデザインが詰め込まれ、全体として高い水準で整っているとは言いがたいとの指摘もあった', 5)
  ) as v(axis, stance, point, ord)
  where p.slug = 'kusatsugawa-atochi-park-5' and g.slug = 'jsce-design-award';

update project_awards a set source_url = 'https://design-prize.sakura.ne.jp/archives/result/1237' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'kusatsugawa-atochi-park-5' and g.slug = 'jsce-design-award' and a.source_url is null;

-- shijo-dori / jsce-design-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://design-prize.sakura.ne.jp/archives/result/1430', v.ord
  from projects p, award_programs g, (values
    ('connect', 'valued', '歩道の拡幅とテラス型のバス停で、歩く快適さと交通の便利さを両立した', 0),
    ('process', 'valued', '何年もの社会実験と地元協議を重ね、多くの関係者が合意に至った', 1),
    ('detail', 'valued', '京都らしさの記号に頼らない控えめな構造物が、通りの店の表情を引き立てている', 2),
    ('management', 'valued', '荷捌きやタクシーの停車を、エリアのルールづくりで解決した', 3),
    ('impact', 'valued', '道路の再整備をめざす他の都市のモデルになる', 4)
  ) as v(axis, stance, point, ord)
  where p.slug = 'shijo-dori' and g.slug = 'jsce-design-award';

update project_awards a set source_url = 'https://design-prize.sakura.ne.jp/archives/result/1430' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'shijo-dori' and g.slug = 'jsce-design-award' and a.source_url is null;

-- sheepath-park / jsce-design-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://design-prize.sakura.ne.jp/archives/result/2992', v.ord
  from projects p, award_programs g, (values
    ('activity', 'valued', '禁止の張り紙がなく、誰もが思い思いに過ごせる自由さがある', 0),
    ('management', 'valued', '遊具の貸出しや飲食の販売、数多くのイベントを官民連携で実現している', 1),
    ('detail', 'valued', '散策路を軸に点在する駐輪場や、縁と高低差を使った座りたくなる居場所', 2),
    ('green', 'valued', '日々の営みとともにある植栽の手入れが、活動の強弱を促している', 3),
    ('green', 'concern', '高木が少なく、夏は日陰と居場所が限られる', 4)
  ) as v(axis, stance, point, ord)
  where p.slug = 'sheepath-park' and g.slug = 'jsce-design-award';

update project_awards a set source_url = 'https://design-prize.sakura.ne.jp/archives/result/2992' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'sheepath-park' and g.slug = 'jsce-design-award' and a.source_url is null;

-- k-fd3784ad / osaka-landscape-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://www.pref.osaka.lg.jp/documents/79961/2021sakuhin10.pdf', v.ord
  from projects p, award_programs g, (values
    ('heritage', 'valued', '江戸時代から続くクロマツ並木を補い、道標風の園名柱や築地塀で街道の歴史を引き継いだ', 0),
    ('green', 'valued', 'クロマツと調和する中低木と地被植物が、四季を通じて彩りを添える', 1),
    ('context', 'valued', '道路拡幅で減る面積を水路の暗渠化で補い、広場を広げた', 2),
    ('activity', 'valued', '多くの市民が憩いながら行き交う、市のシンボルとなる風景', 3)
  ) as v(axis, stance, point, ord)
  where p.slug = 'k-fd3784ad' and g.slug = 'osaka-landscape-award';

update project_awards a set source_url = 'https://www.pref.osaka.lg.jp/documents/79961/2021sakuhin10.pdf' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'k-fd3784ad' and g.slug = 'osaka-landscape-award' and a.source_url is null;

-- k-499d5ce7 / osaka-landscape-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://www.pref.osaka.lg.jp/documents/79961/2021sakuhin10.pdf', v.ord
  from projects p, award_programs g, (values
    ('connect', 'valued', '周りの塀を取り払い、まちと隣の公園に開いた', 0),
    ('heritage', 'valued', '邸宅だった歴史を踏まえ、礎石や旧収蔵庫の部材を転用して昔と今をつないだ', 1),
    ('green', 'valued', '既存の樹木を残し自生種を使って、生きものの環境に配慮した', 2),
    ('detail', 'valued', '露地や枯山水など、庭の文化に親しめる庭園を新たにデザインした', 3)
  ) as v(axis, stance, point, ord)
  where p.slug = 'k-499d5ce7' and g.slug = 'osaka-landscape-award';

update project_awards a set source_url = 'https://www.pref.osaka.lg.jp/documents/79961/2021sakuhin10.pdf' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'k-499d5ce7' and g.slug = 'osaka-landscape-award' and a.source_url is null;

-- k-82af37f8 / osaka-landscape-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://www.pref.osaka.lg.jp/documents/79961/2021sakuhin10.pdf', v.ord
  from projects p, award_programs g, (values
    ('green', 'valued', '道路際のクスノキの列植が周りの喧騒をやわらげ、中央に広い芝生を確保した', 0),
    ('connect', 'valued', '歩道から玄関へ導く一筋の道で、利用者の動線を整えた', 1),
    ('detail', 'valued', '縁石に組み込んだ照明など、場を上質にする細部の配慮', 2),
    ('green', 'valued', '大きなヤマザクラを丁寧な養生で植え、囲むデッキベンチが根を守っている', 3)
  ) as v(axis, stance, point, ord)
  where p.slug = 'k-82af37f8' and g.slug = 'osaka-landscape-award';

update project_awards a set source_url = 'https://www.pref.osaka.lg.jp/documents/79961/2021sakuhin10.pdf' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'k-82af37f8' and g.slug = 'osaka-landscape-award' and a.source_url is null;

-- k-2c5f4dc4 / osaka-landscape-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://www.pref.osaka.lg.jp/documents/79961/2021sakuhin10.pdf', v.ord
  from projects p, award_programs g, (values
    ('activity', 'valued', '年代や体力に合わせた細やかなゾーニングと健康遊具が、さまざまな場面を生んでいる', 0),
    ('context', 'valued', '鉄道沿いの細長い敷地を生かした', 1),
    ('impact', 'valued', '「健康・医療のまちづくり」の一翼を担う先進的な取り組み', 2),
    ('management', 'concern', '医療機関などとの連携で、活動や担い手が育っていくことが期待された', 3)
  ) as v(axis, stance, point, ord)
  where p.slug = 'k-2c5f4dc4' and g.slug = 'osaka-landscape-award';

update project_awards a set source_url = 'https://www.pref.osaka.lg.jp/documents/79961/2021sakuhin10.pdf' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'k-2c5f4dc4' and g.slug = 'osaka-landscape-award' and a.source_url is null;

-- higashi-yuenchi / cla-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://www.cla.or.jp/wp-content/uploads/2024/04/2023CLAawardHIGASIYUUENTI.pdf', v.ord
  from projects p, award_programs g, (values
    ('integration', 'valued', 'ハードとソフトの両面にわたる高い総合力', 0),
    ('heritage', 'valued', '旧居留地との関わり、震災のモニュメント、市民の活動など、神戸の歴史的な遺産を引き継いだ', 1)
  ) as v(axis, stance, point, ord)
  where p.slug = 'higashi-yuenchi' and g.slug = 'cla-award';

update project_awards a set source_url = 'https://www.cla.or.jp/wp-content/uploads/2024/04/2023CLAawardHIGASIYUUENTI.pdf' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'higashi-yuenchi' and g.slug = 'cla-award' and a.source_url is null;

-- k-10cdb688 / cla-award
insert into project_evaluations (project_id, program_id, axis, stance, point_ja, source_url, sort_order)
select p.id, g.id, v.axis, v.stance, v.point, 'https://www.cla.or.jp/wp-content/uploads/2025/11/osakadoujimahama.pdf', v.ord
  from projects p, award_programs g, (values
    ('process', 'valued', '計画から工事監理までの役割を一貫して担い、完成につなげた', 0),
    ('detail', 'valued', '制約の多い空間で、曲線の歩行空間と樹木の選び方により静かな散策の小径をつくった', 1),
    ('green', 'valued', '高木の列植による緑の軸線と、透け感のある植栽と一体の休憩スペース', 2),
    ('activity', 'valued', '賑わいと遊びの場になる公園空間を生み出した', 3)
  ) as v(axis, stance, point, ord)
  where p.slug = 'k-10cdb688' and g.slug = 'cla-award';

update project_awards a set source_url = 'https://www.cla.or.jp/wp-content/uploads/2025/11/osakadoujimahama.pdf' from projects p, award_programs g
  where a.project_id = p.id and a.program_id = g.id and p.slug = 'k-10cdb688' and g.slug = 'cla-award' and a.source_url is null;
