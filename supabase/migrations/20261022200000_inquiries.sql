-- 問い合わせ・訂正依頼・削除依頼・調査の依頼。フォームから誰でも送れ、読めるのは管理者だけ
create type inquiry_topic as enum ('general', 'correction', 'removal', 'rights', 'request');

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  topic inquiry_topic not null,
  name text not null check (length(trim(name)) between 1 and 100),
  email text not null check (length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  organization text check (length(organization) <= 200),
  page_url text check (length(page_url) <= 500),
  message text not null check (length(trim(message)) between 1 and 5000),
  lang text not null default 'ja' check (lang in ('ja', 'en')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index inquiries_created_idx on inquiries (created_at desc);

alter table inquiries enable row level security;
create policy inquiries_insert on inquiries for insert to anon, authenticated with check (status = 'new' and handled_at is null);
create policy inquiries_admin on inquiries for all using (is_admin()) with check (is_admin());
