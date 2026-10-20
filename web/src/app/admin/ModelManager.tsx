"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ModelViewer } from "@/components/ModelViewer";
import { createBrowserSupabase } from "@/lib/supabase-browser";

import { addModel, deleteModel, updateModel, type ModelPlacement } from "./actions";

export type AdminModel = ModelPlacement & { id: string; storage_path: string; file_name: string; size_bytes: number };

const MAX_BYTES = 50 * 1024 * 1024;
const input = "mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm";
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

// glTF（.gltf）は、別ファイルの画像やバイナリを参照していると1ファイルでは表示できない
async function checkFile(file: File) {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".glb") && !name.endsWith(".gltf")) throw new Error("GLB（.glb）か glTF（.gltf）のファイルを選んでください");
  if (file.size > MAX_BYTES) throw new Error(`ファイルが大きすぎます（${mb(file.size)}）。50 MB 以下にしてください。書き出し時に Draco 圧縮やテクスチャの縮小を使うと小さくなります`);
  if (name.endsWith(".gltf")) {
    const json = JSON.parse(await file.text()) as { buffers?: { uri?: string }[]; images?: { uri?: string }[] };
    const external = [...(json.buffers ?? []), ...(json.images ?? [])].some((x) => x.uri && !x.uri.startsWith("data:"));
    if (external) throw new Error("この glTF は別ファイル（.bin や画像）を参照しています。1ファイルにまとまる GLB で書き出してください");
  }
  return name.endsWith(".glb") ? "model/gltf-binary" : "model/gltf+json";
}

export function ModelManager({ projectId, projectSlug, models, supabaseUrl }: { projectId: string; projectSlug: string; models: AdminModel[]; supabaseUrl: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  const [edits, setEdits] = useState<Record<string, Partial<ModelPlacement>>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const urlOf = (m: AdminModel) => `${supabaseUrl}/storage/v1/object/public/models/${m.storage_path}`;

  const upload = () =>
    start(async () => {
      if (!file) return;
      try {
        const contentType = await checkFile(file);
        setStatus("アップロード中…");
        const path = `${projectSlug}/${crypto.randomUUID()}${file.name.toLowerCase().endsWith(".glb") ? ".glb" : ".gltf"}`;
        const { error } = await createBrowserSupabase().storage.from("models").upload(path, file, { contentType });
        if (error) throw new Error(error.message);
        await addModel({ project_id: projectId, storage_path: path, file_name: file.name, size_bytes: file.size, caption_ja: caption });
        setStatus("追加しました");
        setFile(null);
        setCaption("");
        router.refresh();
      } catch (e) {
        setStatus(`失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

  const value = <K extends keyof ModelPlacement>(m: AdminModel, k: K) => (edits[m.id]?.[k] ?? m[k]) as ModelPlacement[K];
  const edit = (m: AdminModel, patch: Partial<ModelPlacement>) => setEdits((e) => ({ ...e, [m.id]: { ...e[m.id], ...patch } }));
  const run = (id: string, fn: () => Promise<void>, ok: string) =>
    start(async () => {
      try {
        await fn();
        setMessages((x) => ({ ...x, [id]: ok }));
        setEdits((e) => ({ ...e, [id]: {} }));
        setConfirmId(null);
        router.refresh();
      } catch (e) {
        setMessages((x) => ({ ...x, [id]: `失敗しました: ${e instanceof Error ? e.message : String(e)}` }));
      }
    });
  const num = (m: AdminModel, k: "offset_east_m" | "offset_north_m" | "altitude_m" | "rotation_deg" | "scale", label: string, step: string) => (
    <label className="text-xs">
      {label}
      <input type="number" step={step} className={input} value={String(value(m, k))} onChange={(e) => edit(m, { [k]: e.target.value === "" ? 0 : Number(e.target.value) })} />
    </label>
  );

  return (
    <section className="mt-6 rounded-md border border-line bg-white p-5">
      <h2 className="mb-1 font-medium">3D モデル</h2>
      <p className="mb-4 text-xs text-muted">
        GLB（.glb）か、1ファイルにまとまった glTF（.gltf）を上げます。50 MB まで。単位はメートル、原点は事例の座標（緯度・経度）に合わせて作ると、地図の上にそのまま置けます。
      </p>
      <div className="grid gap-3 rounded-md bg-placeholder/60 p-4 text-sm sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
        <label>
          モデルファイル
          <input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setStatus(""); }} className="mt-1 block w-full" />
        </label>
        <label>
          キャプション（任意）
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="例: 竣工時の全体模型" className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" />
        </label>
        <button type="button" disabled={!file || pending} onClick={upload} className="rounded-md bg-accent px-4 py-2 text-white disabled:opacity-50">
          {file ? `${mb(file.size)} を上げる` : "ファイルを選んでください"}
        </button>
        {status && <p className={`sm:col-span-3 ${status.startsWith("失敗") ? "text-red-700" : "text-muted"}`}>{status}</p>}
      </div>

      {models.map((m) => (
        <div key={m.id} className="mt-5 grid gap-4 border-t border-line pt-5 lg:grid-cols-[1fr_1.1fr]">
          <ModelViewer src={urlOf(m)} alt={m.file_name} className="h-64 rounded bg-placeholder" />
          <div className="grid content-start gap-3 text-sm">
            <p className="text-xs text-muted">{m.file_name} · {mb(m.size_bytes)}</p>
            <label className="text-xs">
              キャプション
              <input className={input} value={value(m, "caption_ja") ?? ""} onChange={(e) => edit(m, { caption_ja: e.target.value })} />
            </label>
            <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <legend className="mb-1 text-xs font-medium">地図に置く位置（上部の 3D 地図）</legend>
              {num(m, "rotation_deg", "向き（度・時計回り）", "1")}
              {num(m, "scale", "倍率", "0.01")}
              {num(m, "altitude_m", "高さ（m）", "0.1")}
              {num(m, "offset_east_m", "東へずらす（m）", "0.5")}
              {num(m, "offset_north_m", "北へずらす（m）", "0.5")}
              <label className="flex items-end gap-2 pb-2 text-xs">
                <input type="checkbox" checked={value(m, "show_on_map")} onChange={(e) => edit(m, { show_on_map: e.target.checked })} />
                地図に置く
              </label>
            </fieldset>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={pending || !Object.keys(edits[m.id] ?? {}).length} onClick={() => run(m.id, () => updateModel(m.id, { ...pick(m), ...edits[m.id] }), "保存しました")} className="rounded bg-ink px-3 py-1.5 text-white disabled:opacity-30">
                保存
              </button>
              {confirmId === m.id ? (
                <span className="flex gap-2">
                  <button type="button" disabled={pending} onClick={() => run(m.id, () => deleteModel(m.id, m.storage_path), "削除しました")} className="rounded bg-red-700 px-2 py-1.5 text-white">本当に削除する</button>
                  <button type="button" onClick={() => setConfirmId(null)} className="text-muted">やめる</button>
                </span>
              ) : (
                <button type="button" disabled={pending} onClick={() => setConfirmId(m.id)} className="text-red-700">削除</button>
              )}
              {messages[m.id] && <span className={messages[m.id].startsWith("失敗") ? "text-red-700" : "text-accent"}>{messages[m.id]}</span>}
            </div>
            <p className="text-xs text-muted">保存後、公開ページ上部の「3D」表示で位置を確かめてください。</p>
          </div>
        </div>
      ))}
    </section>
  );
}

const pick = (m: AdminModel): ModelPlacement => ({
  caption_ja: m.caption_ja,
  offset_east_m: m.offset_east_m,
  offset_north_m: m.offset_north_m,
  altitude_m: m.altitude_m,
  rotation_deg: m.rotation_deg,
  scale: m.scale,
  show_on_map: m.show_on_map,
});
