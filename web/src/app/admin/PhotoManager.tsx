"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createBrowserSupabase } from "@/lib/supabase-browser";

import { addPhoto, deletePhoto, updatePhoto } from "./actions";
import { photoPath, stripExif } from "./photos";

export type AdminPhoto = {
  id: string;
  storage_path: string;
  taken_on: string;
  caption_ja: string | null;
  caption_en: string | null;
  people_checked: boolean;
  is_cover: boolean;
  sort_order: number;
};

const today = () => new Date().toISOString().slice(0, 10);

export function PhotoManager({
  projectId,
  projectSlug,
  photos,
  supabaseUrl,
}: {
  projectId: string;
  projectSlug: string;
  photos: AdminPhoto[];
  supabaseUrl: string;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [takenOn, setTakenOn] = useState(today());
  const [caption, setCaption] = useState("");
  const [peopleChecked, setPeopleChecked] = useState(false);
  const [status, setStatus] = useState("");
  // 削除は画面内で2段階で確かめる（ブラウザの確認ダイアログは環境によって出ないため）
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<{ id: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const upload = () =>
    startTransition(async () => {
      const supabase = createBrowserSupabase();
      try {
        for (const [i, file] of files.entries()) {
          setStatus(`${i + 1}/${files.length} 枚目: 位置情報などを消しています…`);
          const { blob, width, height } = await stripExif(file);
          const path = photoPath(projectSlug);
          setStatus(`${i + 1}/${files.length} 枚目: アップロード中…`);
          const { error } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
          if (error) throw new Error(error.message);
          await addPhoto({ project_id: projectId, storage_path: path, taken_on: takenOn, caption_ja: caption, caption_en: "", width, height, people_checked: peopleChecked });
        }
        setStatus(`${files.length} 枚を追加しました（EXIF は削除済み）`);
        setFiles([]);
        setCaption("");
        router.refresh();
      } catch (e) {
        setStatus(`失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

  const run = (id: string, fn: () => Promise<void>) =>
    startTransition(async () => {
      setPhotoError(null);
      try {
        await fn();
        setConfirmId(null);
        router.refresh();
      } catch (e) {
        setPhotoError({ id, message: `失敗しました: ${e instanceof Error ? e.message : String(e)}` });
      }
    });

  return (
    <section className="mt-6 rounded-md border border-line bg-white p-5">
      <h2 className="mb-1 font-medium">写真</h2>
      <p className="mb-4 text-xs text-muted">
        自分で撮影した写真だけを使います。アップロード時にブラウザ上で位置情報などの EXIF を削除し、長辺2400pxの JPEG にします。
        「人物の写り込みを確認済み」にした写真だけが公開サイトに出ます。
      </p>

      <div className="grid gap-3 rounded-md bg-placeholder/60 p-4 text-sm sm:grid-cols-2">
        <label className="sm:col-span-2">
          写真ファイル
          <input type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.heic,.heif" multiple onChange={(e) => setFiles([...(e.target.files ?? [])])} className="mt-1 block w-full" />
        </label>
        <label>
          撮影日*
          <input type="date" required value={takenOn} onChange={(e) => setTakenOn(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" />
        </label>
        <label>
          キャプション（任意）
          <input value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={peopleChecked} onChange={(e) => setPeopleChecked(e.target.checked)} />
          これから上げる写真は、人物の写り込みを確認済み（顔が判別できる人が写っていない）
        </label>
        <div className="sm:col-span-2">
          <button type="button" disabled={!files.length || !takenOn || pending} onClick={upload} className="rounded-md bg-accent px-4 py-2 text-white disabled:opacity-50">
            {files.length ? `${files.length}枚をアップロード` : "ファイルを選んでください"}
          </button>
          {status && <span className="ml-3 text-muted">{status}</span>}
        </div>
      </div>

      {photos.length > 0 && (
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((ph) => (
            <li key={ph.id} className="text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${supabaseUrl}/storage/v1/object/public/photos/${ph.storage_path}`} alt={ph.caption_ja ?? ""} className="aspect-[4/3] w-full rounded object-cover" />
              <div className="mt-1 text-muted">{ph.taken_on}{ph.caption_ja ? ` · ${ph.caption_ja}` : ""}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 ${ph.people_checked ? "bg-accent text-white" : "bg-amber-100 text-amber-900"}`}>
                  {ph.people_checked ? "公開中" : "非公開（人物未確認）"}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(ph.id, () => updatePhoto(ph.id, projectId, { people_checked: !ph.people_checked }))}
                  className="text-accent underline-offset-2 hover:underline"
                >
                  {ph.people_checked ? "非公開に戻す" : "人物確認済みにして公開"}
                </button>
              </div>
              <div className="mt-1 flex gap-3">
                {ph.is_cover ? (
                  <span className="text-accent">カバー写真</span>
                ) : (
                  <button type="button" disabled={pending} onClick={() => run(ph.id, () => updatePhoto(ph.id, projectId, { is_cover: true }))} className="text-accent">カバーにする</button>
                )}
                {confirmId === ph.id ? (
                  <span className="flex gap-2">
                    <button type="button" disabled={pending} onClick={() => run(ph.id, () => deletePhoto(ph.id, ph.storage_path))} className="rounded bg-red-700 px-2 text-white">
                      {pending ? "削除中…" : "本当に削除する"}
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} className="text-muted">やめる</button>
                  </span>
                ) : (
                  <button type="button" disabled={pending} onClick={() => setConfirmId(ph.id)} className="text-red-700">
                    削除
                  </button>
                )}
              </div>
              {photoError?.id === ph.id && <p className="mt-1 text-red-700">{photoError.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
