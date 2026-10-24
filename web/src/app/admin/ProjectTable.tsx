"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Icon } from "@/components/Icon";
import { CHECKS, type CheckKey } from "@/lib/admin-checks";

export type ProjectRow = {
  id: string;
  name_ja: string;
  slug: string;
  use: string;
  place: string;
  status: "draft" | "published";
  updated_at: string;
  has: Record<CheckKey, boolean>;
  photos: number;
};


// 事例の一覧。名前で探す・公開状態・足りない項目で絞り込み、選んだ事例を AI でまとめて下書きへ送れる
export function ProjectTable({ rows }: { rows: ProjectRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [missing, setMissing] = useState<CheckKey | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!k || r.name_ja.toLowerCase().includes(k) || r.slug.includes(k) || r.place.includes(k)) &&
        (status === "all" || r.status === status) &&
        (!missing || !r.has[missing]),
    );
  }, [rows, q, status, missing]);
  const missCount = (key: CheckKey) => rows.filter((r) => (status === "all" || r.status === status) && !r.has[key]).length;
  const done = (r: ProjectRow) => CHECKS.filter((c) => r.has[c.key]).length;
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`;
  const allPicked = list.length > 0 && list.every((r) => picked.has(r.id));

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-md border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-line px-3 py-1.5">
            <Icon name="search" className="ico !h-4 !w-4 opacity-50" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="名前・slug・所在地で探す" className="w-full bg-transparent text-sm outline-none" />
          </label>
          {(["all", "draft", "published"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} className={chip(status === s)}>
              {{ all: "すべて", draft: "下書き", published: "公開" }[s]}（{s === "all" ? rows.length : rows.filter((r) => r.status === s).length}）
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 text-muted">足りない項目:</span>
          {CHECKS.map((c) => (
            <button key={c.key} type="button" onClick={() => setMissing(missing === c.key ? null : c.key)} className={chip(missing === c.key)}>
              {c.label}なし <span className="num opacity-70">{missCount(c.key)}</span>
            </button>
          ))}
        </div>
      </div>

      {picked.size > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-3 rounded-md bg-ink px-4 py-2.5 text-sm text-white lg:top-2">
          <span>{picked.size} 件を選択中</span>
          <button type="button" onClick={() => router.push(`/admin/ai/bulk?ids=${[...picked].join(",")}`)} className="rounded-md bg-accent px-3 py-1.5">
            ✦ AI でまとめて下書き
          </button>
          <button type="button" onClick={() => setPicked(new Set())} className="ml-auto text-white/70 hover:text-white">選択を外す</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="w-8 p-2">
                <input type="checkbox" aria-label="表示中の事例をすべて選ぶ" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(list.map((r) => r.id)))} />
              </th>
              <th className="p-2">名称</th>
              <th className="p-2">状態</th>
              <th className="p-2">入力状況</th>
              <th className="p-2">更新</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className={`border-b border-line last:border-0 hover:bg-soft/60 ${picked.has(r.id) ? "bg-accent/5" : ""}`}>
                <td className="p-2 align-top">
                  <input
                    type="checkbox"
                    aria-label={`${r.name_ja} を選ぶ`}
                    checked={picked.has(r.id)}
                    onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })}
                  />
                </td>
                <td className="p-2">
                  <Link href={`/admin/projects/${r.id}`} className="font-medium text-ink hover:text-accent hover:underline">{r.name_ja}</Link>
                  <div className="text-xs text-muted">{r.use}・{r.place}</div>
                </td>
                <td className="p-2 align-top">
                  <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs ${r.status === "published" ? "bg-accent text-white" : "bg-placeholder"}`}>
                    {r.status === "published" ? "公開" : "下書き"}
                  </span>
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {CHECKS.map((c) => (
                      <span
                        key={c.key}
                        title={`${c.label}: ${r.has[c.key] ? "あり" : "なし"}`}
                        className={`rounded px-1.5 py-0.5 text-[11px] ${r.has[c.key] ? "bg-accent/10 text-accent" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"}`}
                      >
                        {c.label}{c.key === "photos" && r.photos ? ` ${r.photos}` : ""}
                      </span>
                    ))}
                    <span className="ml-1 text-[11px] text-muted">{done(r)}/{CHECKS.length}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap p-2 align-top text-xs text-muted">{new Date(r.updated_at).toLocaleDateString("ja-JP")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-6 text-center text-sm text-muted">条件に合う事例はありません。</p>}
      </div>
    </div>
  );
}
