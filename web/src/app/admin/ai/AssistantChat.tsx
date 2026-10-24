"use client";

import type Anthropic from "@anthropic-ai/sdk";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { AnswerText } from "@/components/ai/AnswerText";

import { applyProposal, assistantTurn, type Proposal } from "./actions";

type Item =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string; steps: string[] }
  | { kind: "error"; text: string }
  | { kind: "proposal"; p: Proposal; state: "open" | "applied" | "dismissed"; message?: string };

const FIELD: Record<string, string> = {
  name_en: "名称（英語）",
  summary_ja: "説明文（日本語）",
  summary_en: "説明文（英語）",
  completed_year: "竣工年",
  completion_note: "竣工の補足",
  site_area_m2: "敷地面積（m²）",
  municipality: "市区町村",
  address_ja: "住所",
};

const EXAMPLES = [
  "説明文がまだない下書きの事例を一覧にして",
  "英訳が未確認の公開中の事例に、英語の説明文の案を作って",
  "竣工年が入っていない事例を、出典から確かめて埋める案を出して",
  "座標がない事例はどれ？",
];

// 管理用 AI アシスタント。事例を調べたり、直す案を出したりする。案は「反映」を押すまで保存しない
export function AssistantChat() {
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<Anthropic.MessageParam[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const [applying, startApply] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || pending) return;
    setInput("");
    setItems((x) => [...x, { kind: "user", text: t }]);
    start(async () => {
      const r = await assistantTurn(history, t);
      if (!r.ok) {
        setItems((x) => [...x, { kind: "error", text: r.message }]);
        return;
      }
      setHistory(r.history);
      setItems((x) => [...x, { kind: "assistant", text: r.reply, steps: r.steps }, ...r.proposals.map((p) => ({ kind: "proposal" as const, p, state: "open" as const }))]);
      setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    });
  };

  const setProposal = (id: string, patch: Partial<Extract<Item, { kind: "proposal" }>>) =>
    setItems((x) => x.map((it) => (it.kind === "proposal" && it.p.id === id ? { ...it, ...patch } : it)));

  return (
    <div className="grid gap-5">
      {items.length === 0 && (
        <div className="grid gap-2">
          <p className="text-xs text-muted">たとえば</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => send(ex)} className="rounded-full border border-line bg-white px-3.5 py-2 text-left text-[13px] hover:border-ink">
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {items.map((it, i) => {
          if (it.kind === "user") return <p key={i} className="max-w-[85%] justify-self-end whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-white">{it.text}</p>;
          if (it.kind === "error") return <p key={i} className="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-800">{it.text}</p>;
          if (it.kind === "assistant")
            return (
              <div key={i} className="grid max-w-[72ch] gap-2 text-sm">
                {it.steps.length > 0 && <p className="text-xs text-muted">✦ {[...new Set(it.steps)].join("・")}</p>}
                <AnswerText text={it.text} />
              </div>
            );
          const { p } = it;
          return (
            <div key={i} className={`grid gap-3 rounded-md border bg-white p-4 text-sm ${it.state === "open" ? "border-accent/50" : "border-line opacity-70"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  直す案: <Link href={`/admin/projects/${p.project_id}`} className="text-accent hover:underline">{p.project_name}</Link>
                </p>
                <span className="text-xs text-muted">{p.reason}</span>
              </div>
              <dl className="grid gap-2">
                {Object.entries(p.changes).map(([k, v]) => (
                  <div key={k} className="grid gap-1 sm:grid-cols-[130px_1fr]">
                    <dt className="text-muted">{FIELD[k] ?? k}</dt>
                    <dd className="whitespace-pre-wrap">{String(v)}</dd>
                  </div>
                ))}
              </dl>
              {it.state === "open" ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() =>
                      startApply(async () => {
                        const r = await applyProposal(p.project_id, p.changes);
                        setProposal(p.id, r.ok ? { state: "applied", message: r.message } : { message: r.message });
                      })
                    }
                    className="rounded-md bg-accent px-4 py-1.5 text-white disabled:opacity-50"
                  >
                    反映する
                  </button>
                  <button type="button" onClick={() => setProposal(p.id, { state: "dismissed" })} className="text-muted hover:text-ink">見送る</button>
                  {it.message && <span className="text-red-700">{it.message}</span>}
                </div>
              ) : (
                <p className="text-xs text-muted">{it.state === "applied" ? "✓ 反映しました（英語の説明文は「機械翻訳の下書き」として保存）" : "見送りました"}</p>
              )}
            </div>
          );
        })}
        {pending && <p className="animate-pulse text-sm text-muted">✦ AI が作業しています…（長いと1分ほど）</p>}
        <div ref={end} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-3 flex items-end gap-2 rounded-md border-2 border-ink bg-white p-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="AI に頼みたいことを書いてください（Shift + Enter で改行）"
          className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
        />
        <button type="submit" disabled={pending || !input.trim()} className="rounded-md bg-ink px-4 py-2.5 text-sm text-white disabled:opacity-40">送る</button>
      </form>
      {items.length > 0 && !pending && (
        <button type="button" onClick={() => { setItems([]); setHistory([]); }} className="justify-self-start text-xs text-muted underline hover:text-ink">
          会話をやり直す
        </button>
      )}
    </div>
  );
}
