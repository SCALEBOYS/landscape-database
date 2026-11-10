import Link from "next/link";
import { Suspense } from "react";

import { aiEnabled } from "@/lib/ai";
import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../../AdminHeader";
import { CheckRunner } from "./CheckRunner";

// 10件ずつ AI に読ませるので、時間の上限を延ばす
export const maxDuration = 60;

export default function CheckPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Check />
    </Suspense>
  );
}

async function Check() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  const { data } = await supabase.from("projects").select("id, name_ja, status").order("updated_at", { ascending: false });
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <div className="max-w-4xl">
        <h1 className="text-xl font-medium">✦ 入力のチェック</h1>
        <p className="mb-6 mt-1 text-sm text-muted">
          AI が事例の入力を読み、説明文と項目の食い違い・日英の違い・所在地と座標のずれ・ありえない値などを挙げます。直すのは事例の編集画面で行ってください。未入力の項目は
          <Link href="/admin" className="mx-1 text-accent hover:underline">事例の一覧</Link>
          の「足りない項目」で絞り込めます。
        </p>
        <CheckRunner projects={(data ?? []).map((p) => ({ id: p.id, name_ja: p.name_ja, status: p.status as "draft" | "published" }))} ai={aiEnabled()} />
      </div>
    </>
  );
}
