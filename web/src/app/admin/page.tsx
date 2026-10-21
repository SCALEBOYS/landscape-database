import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";
import { categoryLabels } from "@/lib/i18n";

import { AdminHeader, NotAdmin } from "./AdminHeader";

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <ProjectList />
    </Suspense>
  );
}

async function ProjectList() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, slug, name_ja, use_category, prefecture, municipality, status, updated_at, photos(count)")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  // 直近30日の0件検索を、同じ条件ごとにまとめて多い順に
  const since = daysAgo(30);
  const { data: misses } = await supabase.from("search_misses").select("q, filters, path, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(500);
  const missGroups = [...(misses ?? []).reduce((m, r) => {
    const label = [r.q && `「${r.q}」`, ...Object.entries(r.filters as Record<string, unknown>).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(",") : String(v)}`)].filter(Boolean).join(" / ") || "（条件なし）";
    const cur = m.get(label);
    m.set(label, { label, n: (cur?.n ?? 0) + 1, last: cur?.last ?? r.created_at });
    return m;
  }, new Map<string, { label: string; n: number; last: string }>()).values()].sort((a, b) => b.n - a.n).slice(0, 15);

  // AI の利用（直近30日）。料金は Claude Opus 5.5 の単価（入力 $4・出力 $20 / 100万トークン）で概算
  const { data: aiRows } = await supabase.from("ai_usage").select("kind, input_tokens, output_tokens").gte("created_at", since).limit(10000);
  const aiByKind = new Map<string, { n: number; usd: number }>();
  for (const r of aiRows ?? []) {
    const cur = aiByKind.get(r.kind) ?? { n: 0, usd: 0 };
    aiByKind.set(r.kind, { n: cur.n + 1, usd: cur.usd + ((r.input_tokens ?? 0) * 4 + (r.output_tokens ?? 0) * 20) / 1e6 });
  }
  const AI_KINDS: Record<string, string> = { search: "文章で探す", ask: "AIに聞く", draft: "出典から下書き", photo: "写真の候補" };

  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <section className="mb-6 rounded-md border border-line bg-white p-4 text-sm">
        <h2 className="mb-2 font-medium">AI の利用（直近30日）</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {Object.entries(AI_KINDS).map(([k, label]) => (
            <span key={k}>
              {label}: <b className="num">{aiByKind.get(k)?.n ?? 0}</b> 回<span className="text-muted">（約 ${(aiByKind.get(k)?.usd ?? 0).toFixed(2)}）</span>
            </span>
          ))}
        </div>
      </section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl">物件（{projects.length}件）</h1>
        <Link href="/admin/projects/new" className="rounded-md bg-accent px-4 py-2 text-sm text-white">
          新規登録
        </Link>
      </div>
      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="p-2">名称</th>
            <th className="p-2">用途</th>
            <th className="p-2">所在地</th>
            <th className="p-2">写真</th>
            <th className="p-2">状態</th>
            <th className="p-2">更新</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b border-line">
              <td className="p-2">
                <Link href={`/admin/projects/${p.id}`} className="text-accent hover:underline">{p.name_ja}</Link>
                <div className="text-xs text-muted">{p.slug}</div>
              </td>
              <td className="p-2">{categoryLabels[p.use_category]?.ja ?? p.use_category}</td>
              <td className="p-2">{p.prefecture}{p.municipality ?? ""}</td>
              <td className="p-2">{(p.photos as unknown as { count: number }[])[0]?.count ?? 0}</td>
              <td className="p-2">
                <span className={`rounded px-2 py-0.5 text-xs ${p.status === "published" ? "bg-accent text-white" : "bg-placeholder"}`}>
                  {p.status === "published" ? "公開" : "下書き"}
                </span>
              </td>
              <td className="p-2 text-xs text-muted">{new Date(p.updated_at).toLocaleDateString("ja-JP")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-10 rounded-md border border-line bg-white p-5 text-sm">
        <h2 className="mb-1 font-medium">0件になった検索（直近30日）</h2>
        <p className="mb-3 text-xs text-muted">探されているのに事例がない条件です。事例を足す順番の参考にしてください。</p>
        {missGroups.length ? (
          <ol className="grid gap-1.5">
            {missGroups.map((g) => (
              <li key={g.label} className="flex gap-3">
                <span className="num w-8 flex-none text-right text-muted">{g.n}</span>
                <span className="min-w-0 flex-1 truncate">{g.label}</span>
                <span className="flex-none text-xs text-muted">{new Date(g.last).toLocaleDateString("ja-JP")}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted">まだ記録はありません</p>
        )}
      </section>
    </>
  );
}

// n 日前の日時（ISO 形式）
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString();
}
