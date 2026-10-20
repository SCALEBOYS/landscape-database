"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deletePaper, savePaper, type PaperInput } from "./actions";

export type PaperFormData = PaperInput;
type Option = { id: string; label: string; sub?: string };

const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm";

export function PaperForm({ initial, methods, projects, species, categories }: { initial: PaperFormData; methods: Option[]; projects: Option[]; species: Option[]; categories: Option[] }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof PaperFormData>(k: K, v: PaperFormData[K]) => setF((x) => ({ ...x, [k]: v }));
  const text = (k: keyof PaperFormData, label: string, extra?: { placeholder?: string; area?: boolean }) => (
    <label className="text-sm">
      {label}
      {extra?.area ? (
        <textarea rows={6} value={f[k] as string} onChange={(e) => set(k, e.target.value as never)} className={input} />
      ) : (
        <input value={f[k] as string} placeholder={extra?.placeholder} onChange={(e) => set(k, e.target.value as never)} className={input} />
      )}
    </label>
  );

  const save = () =>
    start(async () => {
      const r = await savePaper(f);
      setMsg(r.message);
      if (r.ok && !f.id && r.id) router.replace(`/admin/research/papers/${r.id}`);
      else if (r.ok) router.refresh();
    });

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-md border border-line bg-white p-5 sm:grid-cols-2">
        <h2 className="font-medium sm:col-span-2">書誌情報</h2>
        {text("title", "原題*")}
        {text("title_ja", "訳題（原題が日本語でなければ）")}
        {text("authors", "著者*（原文どおり。例: Ulrich, R. S.; Simons, R. F.）")}
        {text("venue", "掲載誌・発行元*")}
        <div className="grid grid-cols-4 gap-2">
          {text("year", "発行年*")}
          {text("volume", "巻")}
          {text("issue", "号")}
          {text("pages", "ページ")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            種類
            <select value={f.kind} onChange={(e) => set("kind", e.target.value as PaperFormData["kind"])} className={input}>
              <option value="article">論文</option>
              <option value="report">報告書</option>
              <option value="book">書籍</option>
            </select>
          </label>
          <label className="text-sm">
            言語
            <select value={f.language} onChange={(e) => set("language", e.target.value as PaperFormData["language"])} className={input}>
              <option value="ja">日本語</option>
              <option value="en">英語</option>
              <option value="other">その他</option>
            </select>
          </label>
        </div>
        {text("doi", "DOI", { placeholder: "10.1126/science.6143402" })}
        {text("url", "原文の URL（DOI がないとき）")}
        {text("slug", "slug*（URL。例: ulrich-1984-window-view）")}
      </section>

      <section className="grid gap-4 rounded-md border border-line bg-white p-5">
        <h2 className="font-medium">要約</h2>
        <p className="text-xs text-muted">抄録などをもとに、自分の言葉で短くまとめてください。本文の転載はしないでください。</p>
        {text("summary_ja", "要約（日本語）*", { area: true })}
        {text("summary_en", "要約（英語）", { area: true })}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.review_status === "reviewed"} onChange={(e) => set("review_status", e.target.checked ? "reviewed" : "draft")} />
          原文と照らして確認済み（外すと公開サイトで「確認前の下書き」と表示）
        </label>
      </section>

      <section className="grid gap-5 rounded-md border border-line bg-white p-5">
        <h2 className="font-medium">つながり</h2>
        <Checks label="手法" options={methods} value={f.method_ids} onChange={(v) => set("method_ids", v)} />
        <Checks label="関係する事例" options={projects} value={f.project_ids} onChange={(v) => set("project_ids", v)} searchable />
        <Checks label="関係する樹種" options={species} value={f.species_ids} onChange={(v) => set("species_ids", v)} searchable />
        <Checks label="関係する素材" options={categories} value={f.category_ids} onChange={(v) => set("category_ids", v)} searchable />
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" disabled={pending} onClick={save} className="rounded-md bg-accent px-5 py-2 text-white disabled:opacity-50">保存</button>
        {f.id &&
          (confirm ? (
            <span className="flex gap-2 text-sm">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deletePaper(f.id!);
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

// 選んだものを上に出し、多いときは文字で絞り込む
function Checks({ label, options, value, onChange, searchable }: { label: string; options: Option[]; value: string[]; onChange: (v: string[]) => void; searchable?: boolean }) {
  const [q, setQ] = useState("");
  const chosen = options.filter((o) => value.includes(o.id));
  const rest = options.filter((o) => !value.includes(o.id) && (!q || o.label.includes(q) || o.sub?.toLowerCase().includes(q.toLowerCase())));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className="font-medium">{label}</span>
        {searchable && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="絞り込む" className="w-48 rounded-md border border-line px-2 py-1 text-xs" />}
      </div>
      <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
        {[...chosen, ...(searchable && !q ? rest.slice(0, 30) : rest)].map((o) => (
          <label key={o.id} className={`flex cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-1 text-xs ${value.includes(o.id) ? "border-accent bg-accent/10" : "border-line"}`}>
            <input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} />
            {o.label}
            {o.sub && <span className="text-muted">{o.sub}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}
