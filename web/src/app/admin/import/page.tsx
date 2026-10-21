import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";
import { ImportTool } from "./ImportTool";

// 座標の検索は外部サービスに何度か問い合わせるので、時間の上限を延ばす
export const maxDuration = 60;

export default function ImportPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Import />
    </Suspense>
  );
}

async function Import() {
  const { user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-1 text-xl">事例の一括取り込み</h1>
      <p className="mb-6 text-sm text-muted">
        Google スプレッドシートで範囲を選んでコピーし、下の欄に貼り付けてください（1行目は列名）。CSV ファイルでも取り込めます。取り込んだ事例は非公開の下書きになるので、内容を確かめてから各事例の画面で「公開」にしてください。
      </p>
      <ImportTool />
    </>
  );
}
