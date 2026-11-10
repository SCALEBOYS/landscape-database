"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { checkProjects, type CheckIssue } from "../../ai-actions";

type P = { id: string; name_ja: string; status: "draft" | "published" };
const BATCH = 10;
const SEVERITY = { high: { label: "誤り", cls: "bg-red-700 text-white" }, medium: { label: "食い違いの疑い", cls: "bg-amber-100 text-amber-900" }, low: { label: "表記", cls: "bg-placeholder text-ink" } } as const;

// 事例を10件ずつ AI に送り、見つかったところを事例ごとにまとめて出す
export function CheckRunner({ projects, ai }: { projects: P[]; ai: boolean }) {
  const [scope, setScope] = useState<"all" | "published" | "draft">("all");
  const [issues, setIssues] = useState<CheckIssue[] | null>(null);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [minSeverity, setMinSeverity] = useState<"low" | "medium" | "high">("low");
  const targets = projects.filter((p) => scope === "all" || p.status === scope);
  const stopper = useRef(false);

  const run = async () => {
    setBusy(true);
    setError("");
    setIssues([]);
    setHidden(new Set());
    setDone(0);
    setTotal(targets.length);
    stopper.current = false;
    for (let i = 0; i < targets.length; i += BATCH) {
      if (stopper.current) break;
      const r = await checkProjects(targets.slice(i, i + BATCH).map((p) => p.id));
      if (!r.ok) {
        setError(r.message);
        break;
      }
      setIssues((cur) => [...(cur ?? []), ...r.issues]);
      setDone(Math.min(targets.length, i + BATCH));
    }
    setBusy(false);
  };

  const rank = { high: 0, medium: 1, low: 2 } as const;
  const shown = (issues ?? []).filter((x, i) => !hidden.has(`${x.project_id}:${i}`) && rank[x.severity] <= rank[minSeverity]);
  const groups = new Map<string, { name: string; items: { x: CheckIssue; key: string }[] }>();
  (issues ?? []).forEach((x, i) => {
    const key = `${x.project_id}:${i}`;
    if (hidden.has(key) || rank[x.severity] > rank[minSeverity]) return;
    const g = groups.get(x.project_id) ?? { name: x.name_ja, items: [] };
    g.items.push({ x, key });
    groups.set(x.project_id, g);
  });
  const sorted = [...groups.entries()].sort((a, b) => Math.min(...a[1].items.map((i) => rank[i.x.severity])) - Math.min(...b[1].items.map((i) => rank[i.x.severity])));
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`;

  if (!ai) return <p className="rounded-md bg-placeholder/60 p-4 text-sm">AI の機能は準備中です（ANTHROPIC_API_KEY が未設定）。</p>;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-white p-4 text-sm">
        <span className="text-muted">対象:</span>
        {(["all", "published", "draft"] as const).map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => setScope(s)} className={chip(scope === s)}>
            {{ all: "すべて", published: "公開", draft: "下書き" }[s]}（{s === "all" ? projects.length : projects.filter((p) => p.status === s).length}）
          </button>
        ))}
        {busy ? (
          <button type="button" onClick={() => (stopper.current = true)} className="ml-auto rounded-md border border-line px-4 py-2 hover:border-ink">止める</button>
        ) : (
          <button type="button" disabled={!targets.length} onClick={() => void run()} className="ml-auto rounded-md bg-accent px-4 py-2 text-white disabled:opacity-40">
            ✦ {targets.length}件をチェック
          </button>
        )}
      </div>
      <p className="-mt-3 text-xs text-muted">10件ごとに1回 AI を使います（{targets.length}件で約{Math.ceil(targets.length / BATCH)}回）。</p>

      {(busy || total > 0) && (
        <div>
          <div className="h-1.5 overflow-hidden rounded bg-placeholder">
            <div className="h-full bg-accent transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {busy ? `読んでいます… ${done}/${total}件` : `${done}/${total}件を読みました`}
            {issues && ` · 見つかったところ ${issues.length}件`}
          </p>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {issues && issues.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">表示:</span>
          {(["high", "medium", "low"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setMinSeverity(s)} className={chip(minSeverity === s)}>
              {{ high: "誤りだけ", medium: "食い違いの疑いまで", low: "表記まで" }[s]}
            </button>
          ))}
          <span className="ml-auto text-muted">{shown.length}件</span>
        </div>
      )}

      {sorted.map(([id, g]) => (
        <section key={id} className="rounded-md border border-line bg-white p-4 text-sm">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-medium">{g.name}</h2>
            <Link href={`/admin/projects/${id}`} target="_blank" className="ml-auto text-xs text-accent hover:underline">編集画面を開く ↗</Link>
          </div>
          <ul className="grid gap-2">
            {g.items.map(({ x, key }) => (
              <li key={key} className="grid gap-1 border-t border-line pt-2 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded px-1.5 py-0.5 ${SEVERITY[x.severity].cls}`}>{SEVERITY[x.severity].label}</span>
                  <code className="text-muted">{x.field}</code>
                  <button type="button" onClick={() => setHidden((h) => new Set(h).add(key))} className="ml-auto text-muted hover:text-ink">済み・問題なし</button>
                </div>
                <p>{x.problem}</p>
                {x.suggestion && <p className="text-xs text-muted">案: {x.suggestion}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {issues && !busy && !error && total > 0 && issues.length === 0 && <p className="text-sm text-muted">食い違いは見つかりませんでした。</p>}
    </div>
  );
}
