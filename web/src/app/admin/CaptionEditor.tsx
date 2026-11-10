"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updatePhoto } from "./actions";
import { draftPhotoCaption } from "./ai-actions";

type Photo = { id: string; src: string; caption_ja: string | null; caption_en: string | null };
type Row = { ja: string; en: string; note: string; drafted: boolean };

// 選んだ写真の説明文（日本語・英語）をまとめて直す。「AI で下書き」で案を入れ、確かめてから保存する
export function CaptionEditor({ projectId, photos, onClose }: { projectId: string; photos: Photo[]; onClose: () => void }) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(photos.map((ph) => [ph.id, { ja: ph.caption_ja ?? "", en: ph.caption_en ?? "", note: "", drafted: false }])),
  );
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const set = (id: string, patch: Partial<Row>) => setRows((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } }));
  const changed = photos.filter((ph) => rows[ph.id].ja.trim() !== (ph.caption_ja ?? "") || rows[ph.id].en.trim() !== (ph.caption_en ?? ""));

  // 1枚ずつ順に下書きする（同時に送ると時間の上限にかかりやすいため）
  const draft = async (targets: Photo[]) => {
    setStatus("");
    for (const [i, ph] of targets.entries()) {
      setBusy(`AI が写真を見ています（${i + 1}/${targets.length}）…`);
      const r = await draftPhotoCaption(ph.id);
      if (r.ok) set(ph.id, { ja: r.caption_ja, en: r.caption_en, note: "", drafted: true });
      else {
        set(ph.id, { note: r.message });
        if (/準備中|混み合/.test(r.message)) break;
      }
    }
    setBusy("");
  };

  const save = async () => {
    setBusy("保存しています…");
    try {
      for (const ph of changed) await updatePhoto(ph.id, projectId, { caption_ja: rows[ph.id].ja, caption_en: rows[ph.id].en });
      setStatus(`${changed.length}枚の説明文を保存しました`);
      setRows((cur) => Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, { ...v, drafted: false }])));
      router.refresh();
    } catch (e) {
      setStatus(`保存できませんでした: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  };

  const empty = photos.filter((ph) => !rows[ph.id].ja.trim());
  return (
    <div className="mt-5 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-medium">写真の説明文（{photos.length}枚）</h3>
        <span className="ml-auto flex flex-wrap gap-2">
          <button type="button" disabled={!!busy || !empty.length} onClick={() => void draft(empty)} className="rounded-md border border-accent px-3 py-1.5 text-accent hover:bg-accent hover:text-white disabled:opacity-40">
            ✦ 空欄を AI で下書き（{empty.length}）
          </button>
          <button type="button" disabled={!!busy} onClick={() => void draft(photos)} className="rounded-md border border-line bg-white px-3 py-1.5 hover:border-ink disabled:opacity-40">
            ✦ すべて AI で書き直す
          </button>
          <button type="button" onClick={onClose} className="px-2 text-muted hover:text-ink">閉じる</button>
        </span>
      </div>
      <p className="mb-3 text-xs text-muted">
        AI は写真と、写真に付けた樹種・素材の印を見て書きます。案は保存されていません。確かめて直してから「保存」を押してください。説明文は公開ページで写真の説明と代替テキストに使われます。
      </p>
      <ul className="grid gap-3">
        {photos.map((ph) => {
          const r = rows[ph.id];
          return (
            <li key={ph.id} className="grid gap-3 rounded-md bg-white p-3 sm:grid-cols-[160px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.src} alt="" className="aspect-[4/3] w-full rounded object-cover" />
              <div className="grid content-start gap-2">
                <label className="grid gap-1 text-xs text-muted">
                  日本語
                  <input value={r.ja} onChange={(e) => set(ph.id, { ja: e.target.value })} maxLength={120} className={`rounded-md border px-3 py-2 text-sm text-ink ${r.drafted ? "border-accent" : "border-line"}`} />
                </label>
                <label className="grid gap-1 text-xs text-muted">
                  English
                  <input value={r.en} onChange={(e) => set(ph.id, { en: e.target.value })} maxLength={240} className={`rounded-md border px-3 py-2 text-sm text-ink ${r.drafted ? "border-accent" : "border-line"}`} />
                </label>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <button type="button" disabled={!!busy} onClick={() => void draft([ph])} className="text-accent hover:underline disabled:opacity-40">✦ この写真を AI で下書き</button>
                  {r.drafted && <span className="text-accent">AI の案（未保存）</span>}
                  {r.note && <span className="text-red-700">{r.note}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!!busy || !changed.length} onClick={() => void save()} className="rounded-md bg-accent px-4 py-2 text-white disabled:opacity-40">
          {changed.length ? `変更した${changed.length}枚を保存` : "変更はありません"}
        </button>
        {busy && <span className="text-muted">{busy}</span>}
        {!busy && status && <span className="text-muted">{status}</span>}
      </div>
    </div>
  );
}
