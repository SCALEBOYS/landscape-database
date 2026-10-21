"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { MATERIAL_COLORS, MATERIAL_TEXTURES, swatchStyle } from "@/lib/material-visual";
import { createBrowserSupabase } from "@/lib/supabase-browser";

import { stripExif } from "../photos";
import { deleteCategory, saveCategory, setMaterialPhoto, type CategoryInput, type CategoryResult } from "./actions";

export type Category = { id: string; kind: string; slug: string; name_ja: string; name_en: string; sort_order: number; used: number; colors: string[]; textures: string[]; photo_path: string | null; photo_credit: string | null };
type Kind = { key: string; label: string };

const input = "w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm";

// 英語名から slug の案を作る（英小文字・数字・ハイフンだけにする）
const slugFrom = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function MaterialManager({ kinds, categories, supabaseUrl }: { kinds: Kind[]; categories: Category[]; supabaseUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ id: string; r: CategoryResult } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryInput>({ id: null, kind: kinds[0].key, slug: "", name_ja: "", name_en: "", sort_order: "", colors: [], textures: [] });
  const [slugTouched, setSlugTouched] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<CategoryInput>>>({});

  const run = (id: string, fn: () => Promise<CategoryResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMessage({ id, r });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });

  const add = () =>
    run("new", () => saveCategory(draft), () => {
      setDraft((d) => ({ ...d, slug: "", name_ja: "", name_en: "", sort_order: "" }));
      setSlugTouched(false);
    });

  const field = (c: Category, key: "name_ja" | "name_en" | "sort_order") => (edits[c.id]?.[key] ?? String(c[key])) as string;
  const picked = (c: Category, key: "colors" | "textures") => edits[c.id]?.[key] ?? c[key];
  const toggle = (c: Category, key: "colors" | "textures", v: string) => {
    const cur = picked(c, key);
    edit(c, { [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const edit = (c: Category, patch: Partial<CategoryInput>) => setEdits((e) => ({ ...e, [c.id]: { ...e[c.id], ...patch } }));
  const dirty = (c: Category) => Object.keys(edits[c.id] ?? {}).length > 0;
  const save = (c: Category) =>
    run(c.id, () => saveCategory({ id: c.id, kind: c.kind, slug: c.slug, name_ja: field(c, "name_ja"), name_en: field(c, "name_en"), sort_order: field(c, "sort_order"), colors: picked(c, "colors"), textures: picked(c, "textures") }), () =>
      setEdits((e) => {
        const { [c.id]: _gone, ...rest } = e;
        void _gone;
        return rest;
      }),
    );

  return (
    <div className="grid gap-8">
      <section className="rounded-md border border-line bg-white p-5">
        <h2 className="mb-3 font-medium">分類を追加</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1.2fr_1.2fr_90px_auto]">
          <label>種別
            <select className={input} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
              {kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </label>
          <label>名前（日本語）*
            <input className={input} value={draft.name_ja} placeholder="例: 再生材デッキ" onChange={(e) => setDraft({ ...draft, name_ja: e.target.value })} />
          </label>
          <label>名前（英語）*
            <input
              className={input}
              value={draft.name_en}
              placeholder="例: Recycled wood deck"
              onChange={(e) => setDraft({ ...draft, name_en: e.target.value, slug: slugTouched ? draft.slug : slugFrom(e.target.value) })}
            />
          </label>
          <label>slug*（URL・識別用）
            <input className={input} value={draft.slug} placeholder="recycled-wood-deck" onChange={(e) => { setSlugTouched(true); setDraft({ ...draft, slug: e.target.value }); }} />
          </label>
          <label>並び順
            <input className={input} inputMode="numeric" value={draft.sort_order} placeholder="100" onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} />
          </label>
          <div className="flex items-end">
            <button type="button" disabled={pending} onClick={add} className="rounded-md bg-accent px-4 py-2 text-white disabled:opacity-50">追加</button>
          </div>
        </div>
        {message?.id === "new" && <p className={`mt-3 text-sm ${message.r.ok ? "text-accent" : "text-red-700"}`}>{message.r.message}</p>}
        <p className="mt-3 text-xs text-muted">slug は英語名から自動で入ります。保存後は変えられません。並び順は小さい数ほど先に出ます（空欄なら末尾）。</p>
      </section>

      {kinds.map((k) => {
        const list = categories.filter((c) => c.kind === k.key);
        if (!list.length) return null;
        return (
          <section key={k.key}>
            <h2 className="mb-2 border-b border-ink pb-1 font-medium">{k.label}<span className="ml-2 text-xs font-normal text-muted">{list.length}</span></h2>
            <div className="grid gap-1.5">
              {list.map((c) => (
                <div key={c.id} className="grid items-center gap-2 text-sm md:grid-cols-[1.2fr_1.2fr_80px_70px_auto]">
                  <input className={input} aria-label="名前（日本語）" value={field(c, "name_ja")} onChange={(e) => edit(c, { name_ja: e.target.value })} />
                  <input className={input} aria-label="名前（英語）" value={field(c, "name_en")} onChange={(e) => edit(c, { name_en: e.target.value })} />
                  <input className={input} aria-label="並び順" inputMode="numeric" value={field(c, "sort_order")} onChange={(e) => edit(c, { sort_order: e.target.value })} />
                  <span className="text-xs text-muted" title={c.slug}>{c.used} 件で使用</span>
                  <span className="flex items-center gap-3">
                    <button type="button" disabled={pending || !dirty(c)} onClick={() => save(c)} className="rounded bg-ink px-3 py-1 text-white disabled:opacity-30">保存</button>
                    {confirmId === c.id ? (
                      <span className="flex gap-2">
                        <button type="button" disabled={pending} onClick={() => run(c.id, () => deleteCategory(c.id), () => setConfirmId(null))} className="rounded bg-red-700 px-2 py-1 text-white">本当に削除</button>
                        <button type="button" onClick={() => setConfirmId(null)} className="text-muted">やめる</button>
                      </span>
                    ) : (
                      <button type="button" disabled={pending} onClick={() => setConfirmId(c.id)} className="text-red-700">削除</button>
                    )}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 text-xs md:col-span-5">
                    <MaterialPhoto c={c} supabaseUrl={supabaseUrl} onDone={(r) => { setMessage({ id: c.id, r }); if (r.ok) router.refresh(); }} />
                    <span className="text-muted">色</span>
                    {Object.entries(MATERIAL_COLORS).map(([k, v]) => (
                      <label key={k} className="inline-flex cursor-pointer items-center gap-1">
                        <input type="checkbox" checked={picked(c, "colors").includes(k)} onChange={() => toggle(c, "colors", k)} />
                        <span className="h-3 w-3 rounded-full ring-1 ring-black/15" style={{ background: v.hex }} />
                        {v.ja}
                      </label>
                    ))}
                    <span className="ml-2 text-muted">質感</span>
                    {Object.entries(MATERIAL_TEXTURES).map(([k, v]) => (
                      <label key={k} className="inline-flex cursor-pointer items-center gap-1">
                        <input type="checkbox" checked={picked(c, "textures").includes(k)} onChange={() => toggle(c, "textures", k)} />
                        {v.ja}
                      </label>
                    ))}
                  </div>
                  {message?.id === c.id && <p className={`md:col-span-5 ${message.r.ok ? "text-accent" : "text-red-700"}`}>{message.r.message}</p>}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// 素材の写真（一覧のカードに出す）。写真がなければ色と質感の見本を出す
function MaterialPhoto({ c, supabaseUrl, onDone }: { c: Category; supabaseUrl: string; onDone: (r: CategoryResult) => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const { blob } = await stripExif(file);
      const path = `materials/${c.slug}-${crypto.randomUUID().slice(0, 8)}.jpg`;
      const { error } = await createBrowserSupabase().storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
      onDone(error ? { ok: false, message: error.message } : await setMaterialPhoto(c.id, path, c.photo_credit ?? ""));
    } catch (e) {
      onDone({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-10 w-14 overflow-hidden rounded-sm ring-1 ring-line" style={c.photo_path ? undefined : swatchStyle(c.colors, c.textures[0])}>
        {c.photo_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${supabaseUrl}/storage/v1/object/public/photos/${c.photo_path}`} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <label className={`cursor-pointer rounded px-2 py-1 text-white ${busy ? "bg-accent/50" : "bg-accent"}`}>
        {busy ? "処理中…" : c.photo_path ? "写真を差し替え" : "写真を入れる"}
        <input type="file" accept="image/*,.heic,.heif" disabled={busy} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
      </label>
      {c.photo_path && (
        <button type="button" disabled={busy} className="text-red-700" onClick={async () => { setBusy(true); onDone(await setMaterialPhoto(c.id, null, "")); setBusy(false); }}>
          写真を外す
        </button>
      )}
    </span>
  );
}
