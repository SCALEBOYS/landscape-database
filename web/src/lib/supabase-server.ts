import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

// ログイン中のユーザーとして Supabase に接続する（RLS により管理者だけが書き込める）
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Server Component からは書き込めない。セッション更新は proxy が行う
        }
      },
    },
  });
}

// 管理画面の入口。未ログインならログイン画面へ、管理者でなければ null の isAdmin を返す
export async function requireUser() {
  // 管理画面は常にリクエスト時に描画する（Supabase クライアントが内部で現在時刻を使うため、事前描画させない）
  await connection();
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return { supabase, user, isAdmin: isAdmin === true };
}
