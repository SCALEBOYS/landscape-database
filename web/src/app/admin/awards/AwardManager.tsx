"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteProgram, saveProgram, type ProgramInput } from "./actions";

export type ProgramRow = ProgramInput & { id: string; used: number };

const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm";
const EMPTY: ProgramInput = { id: null, name_ja: "", name_en: "", organizer_ja: "", url: "", aliases: "", prizes: "" };

function ProgramForm({ initial, used, onDone }: { initial: ProgramInput; used?: number; onDone?: () => void }) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const f = (k: Exclude<keyof ProgramInput, "id">) => ({
    value: p[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP({ ...p, [k]: e.target.value }),
  });
  return (
    <div className="grid gap-3 text-sm md:grid-cols-2">
      <label>
        賞の名前（正式名称）
        <input className={input} {...f("name_ja")} />
      </label>
      <label>
        英語名
        <input className={input} {...f("name_en")} />
      </label>
      <label>
        主催
        <input className={input} {...f("organizer_ja")} />
      </label>
      <label>
        公式ページ
        <input className={input} placeholder="https://" {...f("url")} />
      </label>
      <label>
        別名（1行に1つ。旧名・略称など）
        <textarea rows={3} className={input} {...f("aliases")} />
      </label>
      <label>
        賞の種類（1行に1つ。例: 最優秀賞）
        <textarea rows={3} className={input} {...f("prizes")} />
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button
          type="button"
          disabled={pending}
          className="rounded-md bg-ink px-4 py-2 text-white disabled:opacity-50"
          onClick={() =>
            start(async () => {
              const r = await saveProgram(p);
              setMsg(r);
              if (r.ok) {
                if (!p.id) setP(EMPTY);
                onDone?.();
                router.refresh();
              }
            })
          }
        >
          {p.id ? "保存" : "追加"}
        </button>
        {p.id && !used ? (
          <button
            type="button"
            disabled={pending}
            className="text-muted underline"
            onClick={() => {
              if (!confirm(`「${p.name_ja}」を消しますか？`)) return;
              start(async () => {
                const r = await deleteProgram(p.id!);
                setMsg(r);
                if (r.ok) router.refresh();
              });
            }}
          >
            消す
          </button>
        ) : null}
        {msg ? <span className={msg.ok ? "text-accent" : "text-[#b42318]"}>{msg.message}</span> : null}
      </div>
    </div>
  );
}

export function AwardManager({ rows }: { rows: ProgramRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      <details className="rounded-md border border-line bg-white p-4">
        <summary className="cursor-pointer font-medium">＋ 新しい賞を登録</summary>
        <div className="mt-3">
          <ProgramForm initial={EMPTY} />
        </div>
      </details>
      {rows.map((r) => (
        <div key={r.id} className="rounded-md border border-line bg-white p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-medium">{r.name_ja}</h2>
            {r.name_en ? <span className="text-xs text-muted">{r.name_en}</span> : null}
            <span className="text-xs text-muted">{r.used} 件の事例</span>
            <button type="button" className="ml-auto text-sm text-accent" onClick={() => setOpen(open === r.id ? null : r.id)}>
              {open === r.id ? "閉じる" : "編集"}
            </button>
          </div>
          {open !== r.id ? (
            <p className="mt-1 text-xs text-muted">
              {r.organizer_ja ? `主催: ${r.organizer_ja}　` : ""}
              {r.prizes ? `賞の種類: ${r.prizes.split("\n").join("・")}　` : ""}
              {r.aliases ? `別名: ${r.aliases.split("\n").join("・")}` : ""}
            </p>
          ) : (
            <div className="mt-3">
              <ProgramForm initial={r} used={r.used} onDone={() => setOpen(null)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
