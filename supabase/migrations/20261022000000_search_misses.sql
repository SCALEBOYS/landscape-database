-- 0件になった検索の記録（何が探されているのに無いかを知るため）。個人を特定する情報（IP など）は持たない
create table search_misses (
  id bigint generated always as identity primary key,
  q text not null default '' check (length(q) <= 200),
  filters jsonb not null default '{}'::jsonb check (pg_column_size(filters) <= 4000),
  path text not null check (length(path) <= 300),
  lang text not null check (lang in ('ja', 'en')),
  created_at timestamptz not null default now()
);
create index search_misses_created_idx on search_misses (created_at desc);

alter table search_misses enable row level security;
-- 誰でも記録はできるが、読めるのは管理者だけ
create policy search_misses_insert on search_misses for insert to anon, authenticated with check (true);
create policy search_misses_admin_read on search_misses for select using (is_admin());
create policy search_misses_admin_delete on search_misses for delete using (is_admin());
