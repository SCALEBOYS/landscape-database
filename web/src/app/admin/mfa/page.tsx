import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createServerSupabase } from "@/lib/supabase-server";

import { MfaGate } from "./MfaGate";

export default function MfaPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Mfa />
    </Suspense>
  );
}

// パスワードでログインした後の2段階目。済んでいれば管理画面へ
async function Mfa() {
  await connection();
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect("/admin");
  return <MfaGate email={user.email ?? ""} />;
}
