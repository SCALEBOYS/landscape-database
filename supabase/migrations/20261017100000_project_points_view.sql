-- 物件の緯度経度を数値で返すビュー（geography は API 経由だと WKB の16進文字列になるため）
-- security_invoker で呼び出し側の RLS を効かせる（匿名なら公開物件だけ）
create or replace view project_points with (security_invoker = true) as
select id, slug, st_y(location::geometry) as lat, st_x(location::geometry) as lng
from projects
where location is not null;

grant select on project_points to anon, authenticated;
