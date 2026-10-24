import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";
import { AssistantChat } from "./AssistantChat";

// AI が事例を調べたり出典を読んだりするので、時間の上限を延ばす
export const maxDuration = 60;

export default function AiPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Assistant />
    </Suspense>
  );
}

async function Assistant() {
  const { user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <div className="max-w-3xl">
        <h1 className="text-xl font-medium">✦ AI アシスタント</h1>
        <p className="mb-6 mt-1 text-sm text-muted">
          登録済みの事例を調べたり、出典を読んで直す案を出したりします。案は「反映する」を押すまで保存されません。AI が直せるのは、英語名・説明文・竣工年・敷地面積・所在地の項目です。
        </p>
        <AssistantChat />
      </div>
    </>
  );
}
