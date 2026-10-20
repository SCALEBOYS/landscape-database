-- 管理者として書き込めるのは、2段階認証（aal2）を済ませたセッションだけにする
-- パスワードだけのセッション（aal1）では、管理画面の入口を迂回しても書き込めない
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;
