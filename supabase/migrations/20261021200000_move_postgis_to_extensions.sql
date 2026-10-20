-- PostGIS を public から extensions スキーマへ移す
-- PostGIS が public に作る座標系の参照表 spatial_ref_sys は RLS が無効で、anon / authenticated に書き込み権限が付いていた
-- （Supabase のセキュリティ診断 rls_disabled_in_public）。表の持ち主は supabase_admin のため権限も RLS も変えられないので、
-- API に公開されない extensions スキーマへ拡張機能ごと移す。PostGIS は場所を移せない拡張機能なので、入れ直す
-- 事例の座標（projects.location）はいったん退避して戻し、件数と値が一致することを確かめる

create temporary table location_backup on commit drop as
select id, st_y(location::geometry) as lat, st_x(location::geometry) as lng
from projects where location is not null;

drop view project_points;
alter table projects drop column location;  -- 索引 projects_location_idx も一緒に消える
drop extension postgis;
create extension postgis with schema extensions;

alter table projects add column location extensions.geography (point, 4326);
update projects p
set location = extensions.st_setsrid(extensions.st_makepoint(b.lng, b.lat), 4326)::extensions.geography
from location_backup b
where b.id = p.id;
create index projects_location_idx on projects using gist (location);

-- 物件の緯度経度を数値で返すビュー（geography は API 経由だと WKB の16進文字列になるため）
-- security_invoker で呼び出し側の RLS を効かせる（匿名なら公開物件だけ）
create view project_points with (security_invoker = true) as
select id, slug, extensions.st_y(location::extensions.geometry) as lat, extensions.st_x(location::extensions.geometry) as lng
from projects
where location is not null;
grant select on project_points to anon, authenticated;

do $$
declare
  missing int;
begin
  select count(*) into missing
  from location_backup b
  left join project_points v on v.id = b.id
  where v.id is null or abs(v.lat - b.lat) > 1e-9 or abs(v.lng - b.lng) > 1e-9;
  if missing > 0 then
    raise exception '座標の移し替えで % 件が一致しません', missing;
  end if;
end $$;
