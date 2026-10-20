"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteMethod, saveMethod, type MethodInput } from "./actions";

const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm";

export function MethodForm({ initial }: { initial: MethodInput }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const field = (k: keyof MethodInput, label: string, rows?: number) => (
    <label className="text-sm">
      {label}
      {rows ? (
        <textarea rows={rows} value={f[k] as string} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className={input} />
      ) : (
        <input value={f[k] as string} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className={input} />
      )}
    </label>
  );

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-md border border-line bg-white p-5 sm:grid-cols-2">
        {field("name_ja", "名前（日本語）*")}
        {field("name_en", "名前（英語）*")}
        {field("slug", "slug*（URL。例: behavior-mapping）")}
        {field("sort_order", "並び順（小さいほど先）")}
      </section>
      <section className="grid gap-4 rounded-md border border-line bg-white p-5">
        {field("summary_ja", "概要（日本語）*", 3)}
        {field("summary_en", "概要（英語）", 3)}
        <p className="text-xs text-muted">解説: 段落は空行で区切ります。「- 」で始まる行は箇条書きになり、その前の1行は小見出しになります。</p>
        {field("body_ja", "解説（日本語）", 16)}
        {field("body_en", "解説（英語）", 8)}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.review_status === "reviewed"} onChange={(e) => setF((x) => ({ ...x, review_status: e.target.checked ? "reviewed" : "draft" }))} />
          内容を確認済み（外すと公開サイトで「確認前の下書き」と表示）
        </label>
      </section>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveMethod(f);
              setMsg(r.message);
              if (r.ok && !f.id && r.id) router.replace(`/admin/research/methods/${r.id}`);
              else if (r.ok) router.refresh();
            })
          }
          className="rounded-md bg-accent px-5 py-2 text-white disabled:opacity-50"
        >
          保存
        </button>
        {f.id &&
          (confirm ? (
            <span className="flex gap-2 text-sm">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteMethod(f.id!);
                    if (r.ok) router.push("/admin/research");
                    else setMsg(r.message);
                  })
                }
                className="rounded bg-red-700 px-2 py-1 text-white"
              >
                本当に削除する
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="text-muted">やめる</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="text-sm text-red-700">削除</button>
          ))}
        {msg && <span className={`text-sm ${msg === "保存しました" ? "text-accent" : "text-red-700"}`}>{msg}</span>}
      </div>
    </div>
  );
}
