import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";
import { categoryLabels } from "@/lib/i18n";

import { AdminHeader, NotAdmin } from "./AdminHeader";
import { ProjectTable, type ProjectRow } from "./ProjectTable";
import { projectChecks, STATUS_SELECT, type ProjectStatusSource } from "@/lib/admin-checks";

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
    .select(`id, slug, name_ja, use_category, prefecture, municipality, status, updated_at, ${STATUS_SELECT}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const { data: points } = await supabase.from("project_points").select("id, lat");
  const located = new Set((points ?? []).filter((p) => p.lat !== null).map((p) => p.id));
  const rows: ProjectRow[] = projects.map((p) => ({
    id: p.id,
    name_ja: p.name_ja,
    slug: p.slug,
    use: categoryLabels[p.use_category]?.ja ?? p.use_category,
    place: `${p.prefecture}${p.municipality ?? ""}`,
    status: p.status as ProjectRow["status"],
    updated_at: p.updated_at,
    photos: (p.photos as unknown as { count: number }[])[0]?.count ?? 0,
    has: projectChecks(p as unknown as ProjectStatusSource, located.has(p.id)),
  }));

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">事例の一覧<span className="ml-2 text-sm font-normal text-muted">{projects.length}件</span></h1>
        <span className="flex gap-2">
          {/* ファイルのダウンロードなので、ページ移動の Link ではなく通常のリンクにする */}
          <a href="/admin/export" download className="rounded-md border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white">CSV で書き出す</a>
          <Link href="/admin/projects/new" className="rounded-md bg-accent px-4 py-2 text-sm text-white">
            新規登録
          </Link>
        </span>
      </div>
      <ProjectTable rows={rows} />

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
      <section className="rounded-md border border-line bg-white p-5 text-sm">
        <h2 className="mb-2 font-medium">AI の利用（直近30日）</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {Object.entries(AI_KINDS).map(([k, label]) => (
            <span key={k}>
              {label}: <b className="num">{aiByKind.get(k)?.n ?? 0}</b> 回<span className="text-muted">（約 ${(aiByKind.get(k)?.usd ?? 0).toFixed(2)}）</span>
            </span>
          ))}
        </div>
      </section>
      <section className="rounded-md border border-line bg-white p-5 text-sm">
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
      </div>
    </>
  );
}

// n 日前の日時（ISO 形式）
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString();
}
