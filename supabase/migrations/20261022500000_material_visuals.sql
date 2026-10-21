-- 素材を見た目で探すための色・質感と、素材の写真（photos バケットの materials/ 以下）
-- 色・質感の初期値は一般的な見た目からの目安。管理画面の「素材の分類」で直せる
alter table component_categories
  add column colors text[] not null default '{}',
  add column textures text[] not null default '{}',
  add column photo_path text,
  add column photo_credit text;

alter table component_categories add constraint component_categories_colors_check
  check (colors <@ array['white','gray','black','beige','brown','red','green','blue']::text[]);
alter table component_categories add constraint component_categories_textures_check
  check (textures <@ array['smooth','rough','grainy','wood','soft','pattern','natural','metal','water']::text[]);

update component_categories c set colors = v.colors::text[], textures = v.textures::text[]
from (values
  ('interlocking-block', '{gray,beige,red}', '{pattern}'),
  ('clay-brick', '{red,brown,beige}', '{pattern}'),
  ('natural-stone', '{gray,beige,black}', '{rough,natural,pattern}'),
  ('exposed-aggregate', '{gray,beige}', '{grainy,rough}'),
  ('concrete', '{gray,white}', '{rough}'),
  ('asphalt', '{black,red,green}', '{smooth}'),
  ('resin-bound-aggregate', '{beige,brown,gray}', '{grainy}'),
  ('decomposed-granite', '{beige,brown}', '{soft,grainy}'),
  ('gravel', '{gray,white,beige}', '{grainy,natural}'),
  ('wood-deck', '{brown}', '{wood}'),
  ('rubber-chip', '{green,red,brown}', '{soft,grainy}'),
  ('lawn-paving', '{green,gray}', '{soft,pattern}'),
  ('retaining-wall', '{gray}', '{rough}'),
  ('stone-wall', '{gray,beige}', '{natural,rough}'),
  ('fence', '{black,gray}', '{metal}'),
  ('bench', '{brown,gray}', '{wood,smooth}'),
  ('table-set', '{brown,gray}', '{wood,metal}'),
  ('shelter', '{brown,gray}', '{wood,metal}'),
  ('bollard', '{gray,black}', '{metal}'),
  ('bicycle-rack', '{gray,black}', '{metal}'),
  ('planter', '{gray,brown}', '{smooth}'),
  ('pole-light', '{gray,black}', '{metal}'),
  ('bollard-light', '{gray,black}', '{metal}'),
  ('rooftop-intensive', '{green}', '{soft}'),
  ('rooftop-extensive', '{green}', '{soft}'),
  ('wall-climber', '{green}', '{soft}'),
  ('wall-module', '{green}', '{soft,pattern}'),
  ('fountain', '{blue}', '{water}'),
  ('pond', '{blue}', '{water}'),
  ('stream', '{blue}', '{water,natural}'),
  ('mist', '{white}', '{water}'),
  ('water-play', '{blue}', '{water}'),
  ('rain-garden', '{green,gray}', '{natural}'),
  ('sand-play', '{beige}', '{grainy,soft}')
) as v(slug, colors, textures)
where c.slug = v.slug;
