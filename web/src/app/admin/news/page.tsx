import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";

export default function NewsAdminPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <NewsAdmin />
    </Suspense>
  );
}

async function NewsAdmin() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  const { data } = await supabase.from("posts").select("id, slug, kind, title_ja, status, published_at").order("published_at", { ascending: false });
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl">NEWS・特集</h1>
        <Link href="/admin/news/new" className="rounded-md bg-accent px-4 py-2 text-sm text-white">記事を書く</Link>
      </div>
      <p className="mb-4 text-sm text-muted">公開にした記事は、トップ（HOME）と NEWS のページに新しい順で出ます。「特集」は1件以上あるとトップに特集の欄ができます。</p>
      <ul className="divide-y divide-line rounded-md border border-line bg-white text-sm">
        {(data ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <span className={`rounded px-1.5 py-0.5 text-xs ${p.kind === "feature" ? "bg-ink text-white" : "bg-placeholder"}`}>{p.kind === "feature" ? "特集" : "NEWS"}</span>
            <Link href={`/admin/news/${p.id}`} className="min-w-0 flex-1 font-medium hover:underline">{p.title_ja}</Link>
            <span className="text-xs text-muted">{new Date(p.published_at).toLocaleDateString("ja-JP")}</span>
            <span className={`rounded px-2 py-0.5 text-xs ${p.status === "published" ? "bg-accent text-white" : "bg-amber-100 text-amber-900"}`}>{p.status === "published" ? "公開" : "下書き"}</span>
            {p.status === "published" && <Link href={`/ja/news/${p.slug}`} className="text-xs text-muted hover:text-ink">公開ページ</Link>}
          </li>
        ))}
      </ul>
    </>
  );
}
