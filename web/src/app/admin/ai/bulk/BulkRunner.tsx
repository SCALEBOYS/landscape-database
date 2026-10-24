"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { draftFromSource } from "../../ai-actions";
import { applyProposal, translateSummary, type Proposal } from "../actions";

type Field = "name_en" | "municipality" | "address_ja" | "completed_year" | "site_area_m2" | "summary_ja" | "summary_en";
export type BulkProject = { id: string; name_ja: string; source: string; current: Record<Field, string> };
type Result = { state: "waiting" | "running" | "done" | "error" | "applied"; message?: string; values?: Partial<Record<Field, string>>; picked?: Set<Field>; caution?: string };

const LABEL: Record<Field, string> = {
  name_en: "名称（英語）",
  municipality: "市区町村",
  address_ja: "住所",
  completed_year: "竣工年",
  site_area_m2: "敷地面積",
  summary_ja: "説明文（日本語）",
  summary_en: "説明文（英語）",
};

const TASKS = {
  source: { label: "出典を読んで下書き", desc: "各事例の最初の出典を読み、英語名・所在地・竣工年・面積・説明文（日本語・英語）の案を作ります。" },
  translate: { label: "英訳だけ作る", desc: "日本語の説明文から、英語名と英語の説明文の案を作ります。" },
} as const;

// 選んだ事例に、AI の下書きを1件ずつ作り、項目を選んで反映する
export function BulkRunner({ projects }: { projects: BulkProject[] }) {
  const [task, setTask] = useState<keyof typeof TASKS>("source");
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, start] = useTransition();
  const [applying, startApply] = useTransition();
  const set = (id: string, patch: Partial<Result>) => setResults((r) => ({ ...r, [id]: { ...r[id], ...patch } as Result }));

  const run = () =>
    start(async () => {
      setResults(Object.fromEntries(projects.map((p) => [p.id, { state: "waiting" } as Result])));
      for (const p of projects) {
        set(p.id, { state: "running" });
        if (task === "translate") {
          const r = await translateSummary(p.id);
          if (!r.ok) { set(p.id, { state: "error", message: r.message }); continue; }
          const values: Partial<Record<Field, string>> = { summary_en: r.summary_en, ...(p.current.name_en ? {} : { name_en: r.name_en }) };
          set(p.id, { state: "done", values, picked: new Set(Object.keys(values) as Field[]) });
          continue;
        }
        if (!p.source) { set(p.id, { state: "error", message: "出典の URL がありません" }); continue; }
        const r = await draftFromSource(p.source, p.name_ja, [], []);
        if (!r.ok) { set(p.id, { state: "error", message: r.message }); continue; }
        const d = r.draft;
        const values: Partial<Record<Field, string>> = {};
        if (d.name_en) values.name_en = d.name_en;
        if (d.municipality) values.municipality = d.municipality;
        if (d.address_ja) values.address_ja = d.address_ja;
        if (d.completed_year) values.completed_year = String(d.completed_year);
        if (d.site_area_m2) values.site_area_m2 = String(d.site_area_m2);
        if (d.summary_ja) values.summary_ja = d.summary_ja;
        if (d.summary_en) values.summary_en = d.summary_en;
        // 今が空の項目だけ、はじめから選んでおく
        const picked = new Set((Object.keys(values) as Field[]).filter((k) => !p.current[k]));
        set(p.id, { state: "done", values, picked, caution: d.caution });
      }
    });

  const toggle = (id: string, f: Field) =>
    setResults((r) => {
      const cur = new Set(r[id].picked);
      if (cur.has(f)) cur.delete(f);
      else cur.add(f);
      return { ...r, [id]: { ...r[id], picked: cur } };
    });

  const applyAll = () =>
    startApply(async () => {
      for (const p of projects) {
        const r = results[p.id];
        if (r?.state !== "done" || !r.picked?.size) continue;
        const changes = Object.fromEntries([...r.picked].map((f) => [f, r.values![f]!])) as Proposal["changes"];
        const res = await applyProposal(p.id, changes);
        set(p.id, res.ok ? { state: "applied", message: `${r.picked.size} 項目を反映しました` } : { message: res.message });
      }
    });

  const ready = projects.filter((p) => results[p.id]?.state === "done" && results[p.id].picked?.size).length;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-md border border-line bg-white p-4 text-sm">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TASKS) as (keyof typeof TASKS)[]).map((k) => (
            <button key={k} type="button" disabled={running} onClick={() => setTask(k)} className={`rounded-full border px-3.5 py-1.5 ${task === k ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
              {TASKS[k].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{TASKS[task].desc} 1件あたり数十秒かかります。</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={running || applying} onClick={run} className="rounded-md bg-accent px-4 py-2 text-white disabled:opacity-50">
            {running ? "作業中…（画面を閉じないでください）" : `${projects.length} 件の下書きを作る`}
          </button>
          {ready > 0 && (
            <button type="button" disabled={running || applying} onClick={applyAll} className="rounded-md bg-ink px-4 py-2 text-white disabled:opacity-50">
              {applying ? "反映しています…" : `印を付けた項目を ${ready} 件に反映`}
            </button>
          )}
        </div>
      </div>

      <ol className="grid gap-3">
        {projects.map((p) => {
          const r = results[p.id];
          return (
            <li key={p.id} className="rounded-md border border-line bg-white p-4 text-sm">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/admin/projects/${p.id}`} className="font-medium hover:text-accent hover:underline">{p.name_ja}</Link>
                <span className={`text-xs ${r?.state === "error" ? "text-red-700" : r?.state === "applied" ? "text-accent" : "text-muted"}`}>
                  {!r ? (p.source ? "出典あり" : "出典なし") : { waiting: "順番待ち", running: "AI が作業中…", done: "下書きができました", error: r.message, applied: `✓ ${r.message}` }[r.state]}
                </span>
              </div>
              {r?.state === "done" && r.values && (
                <div className="grid gap-1.5">
                  {(Object.keys(r.values) as Field[]).map((f) => (
                    <label key={f} className="grid cursor-pointer grid-cols-[20px_120px_1fr] items-start gap-2 rounded bg-soft/60 p-2">
                      <input type="checkbox" className="mt-1" checked={r.picked?.has(f) ?? false} onChange={() => toggle(p.id, f)} />
                      <span className="text-muted">
                        {LABEL[f]}
                        {p.current[f] && <span className="block text-[11px] text-amber-700">入力済みを置き換え</span>}
                      </span>
                      <span className="whitespace-pre-wrap">{r.values![f]}</span>
                    </label>
                  ))}
                  {Object.keys(r.values).length === 0 && <p className="text-muted">出典から読み取れる項目はありませんでした。</p>}
                  {r.caution && <p className="text-xs text-amber-700">確かめたい点: {r.caution}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
