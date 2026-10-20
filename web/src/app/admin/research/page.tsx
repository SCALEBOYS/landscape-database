import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";
import { ReviewToggle } from "./ReviewToggle";

export default function ResearchAdminPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <ResearchAdmin />
    </Suspense>
  );
}

async function ResearchAdmin() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  const [{ data: methods }, { data: papers }] = await Promise.all([
    supabase.from("methods").select("id, slug, name_ja, review_status, papers:paper_methods(paper_id)").order("sort_order"),
    supabase.from("papers").select("id, slug, title, title_ja, authors, year, review_status").order("year", { ascending: false }),
  ]);
  const drafts = [...(methods ?? []), ...(papers ?? [])].filter((x) => x.review_status === "draft").length;

  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-1 text-xl">研究（手法・論文）</h1>
      <p className="mb-6 text-sm text-muted">
        要約・解説を原文と照らして確かめたら「確認済みにする」を押してください。下書きのものは、公開サイトで「確認前の下書き」と表示されます。未確認 {drafts} 件。
      </p>

      <section className="mb-8 rounded-md border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="font-medium">論文（{papers?.length ?? 0}）</h2>
          <Link href="/admin/research/papers/new" className="rounded-md bg-accent px-3 py-1.5 text-sm text-white">論文を追加</Link>
        </div>
        <ul className="divide-y divide-line text-sm">
          {(papers ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <Link href={`/admin/research/papers/${p.id}`} className="min-w-0 flex-1 hover:underline">
                <span className="font-medium">{p.title_ja ?? p.title}</span>
                <span className="ml-2 text-xs text-muted">{p.authors} · {p.year}</span>
              </Link>
              <Link href={`/ja/research/papers/${p.slug}`} className="text-xs text-muted hover:text-ink">公開ページ</Link>
              <ReviewToggle table="papers" id={p.id} reviewed={p.review_status === "reviewed"} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-md border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="font-medium">手法（{methods?.length ?? 0}）</h2>
          <Link href="/admin/research/methods/new" className="rounded-md bg-accent px-3 py-1.5 text-sm text-white">手法を追加</Link>
        </div>
        <ul className="divide-y divide-line text-sm">
          {(methods ?? []).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-4">
              <Link href={`/admin/research/methods/${m.id}`} className="min-w-0 flex-1 font-medium hover:underline">{m.name_ja}</Link>
              <span className="text-xs text-muted">論文 {m.papers.length} 本</span>
              <Link href={`/ja/research/methods/${m.slug}`} className="text-xs text-muted hover:text-ink">公開ページ</Link>
              <ReviewToggle table="methods" id={m.id} reviewed={m.review_status === "reviewed"} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
