-- 設計（会社・人）の別名。旧名・略称・英名・人名入りの表記などで探しても見つかるようにする
create table party_aliases (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references parties (id) on delete cascade,
  alias text not null check (length(trim(alias)) between 1 and 200),
  note text, -- 根拠（例: 公式サイトの会社概要）
  created_at timestamptz not null default now(),
  unique (party_id, alias)
);
create index party_aliases_party_idx on party_aliases (party_id);

alter table party_aliases enable row level security;
create policy party_aliases_public_read on party_aliases for select using (true);
create policy party_aliases_admin on party_aliases for all using (is_admin()) with check (is_admin());

-- 「E-DESIGN（忽那裕樹）」はどの事例にも付いていない同じ事務所の表記なので、E-DESIGN の別名にして消す
insert into party_aliases (party_id, alias, note)
select keep.id, '忽那裕樹', '代表者名で探しても見つかるように'
from parties keep where keep.name_ja = 'E-DESIGN'
on conflict do nothing;
delete from parties p
where p.name_ja = 'E-DESIGN（忽那裕樹）'
  and not exists (select 1 from project_credits pc where pc.party_id = p.id);
