-- 管理画面の AI（下書き・写真の候補）の利用も記録する
create policy ai_usage_admin_insert on ai_usage for insert with check (is_admin() and kind in ('draft', 'photo'));
