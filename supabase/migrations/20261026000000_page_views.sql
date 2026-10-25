-- 公開サイトのアクセスの記録（管理画面のアクセス解析に使う）
-- Cookie は使わず、IP アドレスも保存しない。visitor は「IP・ブラウザ・日付」から作るハッシュで、日ごとに変わる（同じ日の訪問者を数えるためだけ）
create table page_views (
  id bigint generated always as identity primary key,
  path text not null check (length(path) between 1 and 300),
  referrer_host text check (length(referrer_host) <= 200),
  country text check (country ~ '^[A-Z]{2}$'),
  device text not null check (device in ('mobile', 'tablet', 'desktop')),
  lang text check (lang in ('ja', 'en')),
  visitor text not null check (length(visitor) <= 64),
  created_at timestamptz not null default now()
);
create index page_views_created_idx on page_views (created_at desc);

alter table page_views enable row level security;
-- 記録はサーバー（/api/pv）から。読めるのは管理者だけ
create policy page_views_insert on page_views for insert to anon, authenticated with check (true);
create policy page_views_admin_read on page_views for select using (is_admin());
create policy page_views_admin_delete on page_views for delete using (is_admin());

-- 期間（日数）を指定して、管理画面に出す集計をまとめて返す（管理者だけ）
create or replace function analytics_summary(p_days integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz := date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo' - make_interval(days => greatest(1, least(p_days, 366)) - 1);
  v jsonb;
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  with v_rows as (select * from page_views where created_at >= v_since)
  select jsonb_build_object(
    'since', v_since,
    'views', (select count(*) from v_rows),
    'visitors', (select count(distinct visitor) from v_rows),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'views', coalesce(x.views, 0), 'visitors', coalesce(x.visitors, 0)) order by d.day)
      from generate_series((v_since at time zone 'Asia/Tokyo')::date, (now() at time zone 'Asia/Tokyo')::date, interval '1 day') as d(day)
      left join (
        select (created_at at time zone 'Asia/Tokyo')::date as day, count(*) as views, count(distinct visitor) as visitors
        from v_rows group by 1
      ) x on x.day = d.day::date
    ), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(t) from (select path, count(*) as views, count(distinct visitor) as visitors from v_rows group by path order by views desc limit 30) t), '[]'::jsonb),
    'referrers', coalesce((select jsonb_agg(t) from (select coalesce(referrer_host, '') as host, count(*) as views from v_rows group by 1 order by views desc limit 15) t), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(t) from (select coalesce(country, '') as country, count(*) as views from v_rows group by 1 order by views desc limit 15) t), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(t) from (select device, count(*) as views from v_rows group by 1 order by views desc) t), '[]'::jsonb),
    'langs', coalesce((select jsonb_agg(t) from (select coalesce(lang, '') as lang, count(*) as views from v_rows group by 1 order by views desc) t), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;
revoke all on function analytics_summary(integer) from public;
grant execute on function analytics_summary(integer) to authenticated;
