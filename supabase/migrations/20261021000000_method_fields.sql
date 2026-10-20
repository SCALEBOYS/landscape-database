-- 手法の分野（研究ページでの絞り込みと色分けに使う）。分野の名前・色は web/src/lib/research-fields.ts
alter table methods add column field text not null default 'perception'
  check (field in ('perception', 'behavior', 'imagery', 'spatial', 'environment', 'design'));

update methods set field = v.field from (values
  ('scenic-beauty', 'perception'),
  ('restorative-environments', 'perception'),
  ('behavior-mapping', 'behavior'),
  ('ppgis', 'behavior'),
  ('green-view', 'imagery'),
  ('street-imagery', 'imagery'),
  ('space-syntax', 'spatial'),
  ('landscape-metrics', 'spatial'),
  ('microclimate-simulation', 'environment'),
  ('urban-forest-ecosystem-services', 'environment'),
  ('research-through-design', 'design')
) as v(slug, field)
where methods.slug = v.slug;
