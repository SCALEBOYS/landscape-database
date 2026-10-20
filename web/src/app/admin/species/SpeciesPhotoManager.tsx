"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { createBrowserSupabase } from "@/lib/supabase-browser";

import { stripExif } from "../photos";
import { setSpeciesCredit, setSpeciesPhoto } from "./actions";

export type SpeciesRow = { id: string; slug: string; name_ja: string; scientific_name: string; photo_path: string | null; photo_credit: string | null };

export function SpeciesPhotoManager({ species, supabaseUrl }: { species: SpeciesRow[]; supabaseUrl: string }) {
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return species.filter((s) => (!onlyMissing || !s.photo_path) && (!k || s.name_ja.includes(k) || s.scientific_name.toLowerCase().includes(k) || s.slug.includes(k)));
  }, [species, q, onlyMissing]);
  const done = species.filter((s) => s.photo_path).length;

  return (
    <div className="rounded-md border border-line bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 text-sm">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="和名・学名で絞り込む" className="w-64 rounded-md border border-line px-3 py-1.5" />
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          写真がないものだけ
        </label>
        <span className="ml-auto text-muted">写真あり {done} / {species.length} 種</span>
      </div>
      <ul className="divide-y divide-line">
        {list.map((s) => (
          <Row key={s.id} s={s} supabaseUrl={supabaseUrl} />
        ))}
      </ul>
    </div>
  );
}

function Row({ s, supabaseUrl }: { s: SpeciesRow; supabaseUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [credit, setCredit] = useState(s.photo_credit ?? "");
  const [status, setStatus] = useState("");
  const [confirm, setConfirm] = useState(false);

  const run = (fn: () => Promise<void>, ok: string) =>
    start(async () => {
      try {
        await fn();
        setStatus(ok);
        setConfirm(false);
        router.refresh();
      } catch (e) {
        setStatus(`失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

  const upload = (file: File) =>
    run(async () => {
      setStatus("写真を処理中…");
      const { blob } = await stripExif(file);
      const path = `species/${s.slug}-${crypto.randomUUID().slice(0, 8)}.jpg`;
      const { error } = await createBrowserSupabase().storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw new Error(error.message);
      await setSpeciesPhoto(s.id, path, credit);
    }, "写真を入れました");

  return (
    <li className="flex flex-wrap items-center gap-4 p-4 text-sm">
      <div className="h-16 w-16 flex-none overflow-hidden rounded-sm bg-placeholder">
        {s.photo_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${supabaseUrl}/storage/v1/object/public/photos/${s.photo_path}`} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="w-48">
        <p className="font-medium">{s.name_ja}</p>
        <p className="text-xs italic text-muted">{s.scientific_name}</p>
      </div>
      <label className="text-xs">
        出典・撮影者（任意）
        <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="例: 自分で撮影 / Wikimedia Commons, CC BY-SA 4.0" className="mt-1 block w-72 rounded-md border border-line px-2 py-1.5 text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className={`cursor-pointer rounded-md px-3 py-1.5 text-white ${pending ? "bg-accent/50" : "bg-accent"}`}>
          {s.photo_path ? "差し替える" : "写真を選ぶ"}
          <input
            type="file"
            accept="image/*,.heic,.heif"
            disabled={pending}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
        </label>
        {s.photo_path && credit !== (s.photo_credit ?? "") && (
          <button type="button" disabled={pending} onClick={() => run(() => setSpeciesCredit(s.id, credit), "保存しました")} className="rounded bg-ink px-3 py-1.5 text-white">
            出典を保存
          </button>
        )}
        {s.photo_path &&
          (confirm ? (
            <span className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => run(() => setSpeciesPhoto(s.id, null, ""), "写真を外しました")} className="rounded bg-red-700 px-2 py-1.5 text-white">本当に外す</button>
              <button type="button" onClick={() => setConfirm(false)} className="text-muted">やめる</button>
            </span>
          ) : (
            <button type="button" disabled={pending} onClick={() => setConfirm(true)} className="text-red-700">外す</button>
          ))}
        {status && <span className={status.startsWith("失敗") ? "text-red-700" : "text-muted"}>{status}</span>}
      </div>
    </li>
  );
}
