"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { draftPost } from "../ai-actions";
import { deletePost, savePost, type PostInput } from "./actions";

const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm";

export function PostForm({ initial, projects }: { initial: PostInput; projects: { id: string; name_ja: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof PostInput>(k: K, v: PostInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const text = (k: keyof PostInput, label: string, rows?: number, placeholder?: string) => (
    <label className="text-sm">
      {label}
      {rows ? (
        <textarea rows={rows} value={f[k] as string} placeholder={placeholder} onChange={(e) => set(k, e.target.value as never)} className={input} />
      ) : (
        <input value={f[k] as string} placeholder={placeholder} onChange={(e) => set(k, e.target.value as never)} className={input} />
      )}
    </label>
  );

  // 箇条書きのメモから AI が記事の下書きを作る（保存はしない）
  const [memo, setMemo] = useState("");
  const [drafting, startDraft] = useTransition();
  const [aiMsg, setAiMsg] = useState("");
  const draft = () =>
    startDraft(async () => {
      setAiMsg("");
      const r = await draftPost(memo, f.kind);
      if (!r.ok) return setAiMsg(r.message);
      setF((x) => ({ ...x, ...r.draft, slug: x.slug || r.draft.slug }));
      setAiMsg("下書きを入力欄に入れました。内容を確かめてから保存してください。");
    });

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-md border border-accent/40 bg-accent/5 p-5 text-sm">
        <h2 className="font-medium">✦ メモから AI で下書き</h2>
        <p className="text-xs text-muted">伝えたいことを箇条書きで書くと、下の「種類」に合わせて、タイトル・要約・本文（日本語・英語）の下書きを入れます。保存はされません。</p>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={4} placeholder={"例:\n- 大阪の事例を10件追加した\n- 樹種から探すで写真が見られるようになった"} className="w-full rounded-md border border-line bg-white px-3 py-2" />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={drafting || !memo.trim()} onClick={draft} className="rounded-md bg-accent px-4 py-2 text-white disabled:opacity-50">
            {drafting ? "書いています…" : "下書きを作る"}
          </button>
          {aiMsg && <span className="text-xs text-ink">{aiMsg}</span>}
        </div>
      </section>
      <section className="grid gap-4 rounded-md border border-line bg-white p-5 sm:grid-cols-2">
        <label className="text-sm">
          種類
          <select value={f.kind} onChange={(e) => set("kind", e.target.value as PostInput["kind"])} className={input}>
            <option value="news">NEWS（お知らせ）</option>
            <option value="feature">特集</option>
          </select>
        </label>
        <label className="text-sm">
          日付
          <input type="date" value={f.published_at} onChange={(e) => set("published_at", e.target.value)} className={input} />
        </label>
        {text("title_ja", "タイトル*")}
        {text("title_en", "タイトル（英語）")}
        {text("slug", "slug*（URL。例: 2026-cla-award）")}
        <label className="text-sm">
          関係する事例（画像にも使う）
          <select value={f.project_id} onChange={(e) => set("project_id", e.target.value)} className={input}>
            <option value="">なし</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name_ja}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2">{text("link_url", "関連するページの URL（任意）", undefined, "https://")}</div>
      </section>
      <section className="grid gap-4 rounded-md border border-line bg-white p-5">
        {text("summary_ja", "要約（一覧に出る短い文）", 2)}
        <p className="text-xs text-muted">本文: 段落は空行で区切ります。「- 」で始まる行は箇条書きになり、その前の1行は小見出しになります。</p>
        {text("body_ja", "本文", 12)}
        {text("summary_en", "要約（英語）", 2)}
        {text("body_en", "本文（英語）", 6)}
      </section>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.status === "published"} onChange={(e) => set("status", e.target.checked ? "published" : "draft")} />
          公開する
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await savePost(f);
              setMsg(r.message);
              if (r.ok && !f.id && r.id) router.replace(`/admin/news/${r.id}`);
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
              <button type="button" disabled={pending} onClick={() => start(async () => { const r = await deletePost(f.id!); if (r.ok) router.push("/admin/news"); else setMsg(r.message); })} className="rounded bg-red-700 px-2 py-1 text-white">本当に削除する</button>
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
