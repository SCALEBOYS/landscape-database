-- AI の利用記録と上限（公開側の検索・質問窓口の使いすぎを防ぐ）
-- 端末の識別は IP アドレスのハッシュだけを持ち、IP そのものは保存しない
create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('search', 'ask', 'draft', 'photo')),
  client_hash text not null check (length(client_hash) <= 80),
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
create index ai_usage_created_idx on ai_usage (created_at desc);
create index ai_usage_client_idx on ai_usage (client_hash, created_at desc);

alter table ai_usage enable row level security;
create policy ai_usage_admin_read on ai_usage for select using (is_admin());

-- 上限に収まっていれば記録して id を返す。超えていれば null（1時間あたり端末ごと・1日あたり全体）
create or replace function ai_take_quota(p_kind text, p_client text, p_per_hour integer, p_per_day integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_kind not in ('search', 'ask') then
    return null;
  end if;
  -- 同じ端末の同時リクエストで上限をすり抜けないよう、端末ごとに直列にする
  perform pg_advisory_xact_lock(hashtext(p_client));
  if (select count(*) from ai_usage where client_hash = p_client and created_at > now() - interval '1 hour') >= least(p_per_hour, 100) then
    return null;
  end if;
  if (select count(*) from ai_usage where kind in ('search', 'ask') and created_at > now() - interval '1 day') >= least(p_per_day, 5000) then
    return null;
  end if;
  insert into ai_usage (kind, client_hash) values (p_kind, left(p_client, 80)) returning id into v_id;
  return v_id;
end;
$$;

-- 使ったトークン数を後から書き込む（記録したばかりの行だけ）
create or replace function ai_record_tokens(p_id uuid, p_in integer, p_out integer)
returns void
language sql
security definer
set search_path = public
as $$
  update ai_usage set input_tokens = greatest(p_in, 0), output_tokens = greatest(p_out, 0)
  where id = p_id and input_tokens is null and created_at > now() - interval '10 minutes';
$$;

revoke all on function ai_take_quota(text, text, integer, integer) from public;
revoke all on function ai_record_tokens(uuid, integer, integer) from public;
grant execute on function ai_take_quota(text, text, integer, integer) to anon, authenticated;
grant execute on function ai_record_tokens(uuid, integer, integer) to anon, authenticated;
