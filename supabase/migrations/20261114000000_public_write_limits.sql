-- ログインなしで書き込める 3 つの表（アクセス記録・検索の空振り・問い合わせ）に、件数の上限を付ける
-- サイトを通さず DB の公開窓口へ直接大量に送られても、DB が埋まらないようにする
-- 上限は全体での件数（送り主は見分けられないため）。超えた分は受け付けない
create or replace function public_write_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_per_minute integer := tg_argv[0]::integer;
  v_per_day integer := tg_argv[1]::integer;
  v_minute bigint;
  v_day bigint;
begin
  execute format('select count(*) from %I where created_at > now() - interval ''1 minute''', tg_table_name) into v_minute;
  if v_minute >= v_per_minute then
    raise exception 'too many requests' using errcode = 'P0001';
  end if;
  execute format('select count(*) from %I where created_at > now() - interval ''1 day''', tg_table_name) into v_day;
  if v_day >= v_per_day then
    raise exception 'too many requests' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- 今の実績は、アクセス記録が全部で数百件、検索の空振りが十数件、問い合わせが 0 件。ふだんの利用では届かない値にしている
drop trigger if exists page_views_write_limit on page_views;
create trigger page_views_write_limit before insert on page_views
  for each row execute function public_write_limit('300', '20000');

drop trigger if exists search_misses_write_limit on search_misses;
create trigger search_misses_write_limit before insert on search_misses
  for each row execute function public_write_limit('30', '2000');

drop trigger if exists inquiries_write_limit on inquiries;
create trigger inquiries_write_limit before insert on inquiries
  for each row execute function public_write_limit('5', '100');

-- 外から直接呼ぶ必要のない関数は、呼べないようにする
-- （トリガー用の関数は、呼び出しの権限がなくてもトリガーとして動く）
revoke execute on function public_write_limit() from public, anon, authenticated;
revoke execute on function photo_comments_rate_limit() from public, anon, authenticated;
revoke execute on function rls_auto_enable() from public, anon, authenticated;
-- アクセス集計は管理画面（ログイン済み）からだけ。関数の中でも管理者かどうかを確かめている
revoke execute on function analytics_summary(integer) from public, anon;
grant execute on function analytics_summary(integer) to authenticated;
