"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { createBrowserSupabase } from "@/lib/supabase-browser";

import { addPhoto } from "../actions";
import { photoPath, readLocation, readTakenOn, stripExif, type ShotLocation } from "../photos";

export type ProjectSpot = { id: string; slug: string; name: string; draft: boolean; lat: number | null; lng: number | null };

type Item = {
  key: string;
  file: File;
  preview: string;
  location: ShotLocation | null;
  takenOn: string | null;
  projectId: string; // "" は未振り分け
  distance: number | null; // 振り分け先までの距離（m）
  include: boolean;
  state: "ready" | "uploading" | "done" | "error";
  message?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

// 2点間の距離（m）
function meters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

export function BulkPhotos({ projects }: { projects: ProjectSpot[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [radius, setRadius] = useState(500);
  const [peopleChecked, setPeopleChecked] = useState(false);
  const [status, setStatus] = useState("");
  const [reading, setReading] = useState(false);
  const [pending, start] = useTransition();
  const located = useMemo(() => projects.filter((p): p is ProjectSpot & { lat: number; lng: number } => p.lat !== null && p.lng !== null), [projects]);
  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // 撮影地点から一番近い事例（半径の内側だけ）
  const nearest = (loc: ShotLocation | null, r: number) => {
    if (!loc) return { projectId: "", distance: null };
    let best: { id: string; d: number } | null = null;
    for (const p of located) {
      const d = meters(loc, p);
      if (!best || d < best.d) best = { id: p.id, d };
    }
    return best && best.d <= r ? { projectId: best.id, distance: best.d } : { projectId: "", distance: best?.d ?? null };
  };

  const add = async (files: File[]) => {
    setReading(true);
    const next: Item[] = [];
    for (const [i, file] of files.entries()) {
      setStatus(`写真を読んでいます（${i + 1}/${files.length}）…`);
      const [location, takenOn] = await Promise.all([readLocation(file), readTakenOn(file)]);
      const n = nearest(location, radius);
      next.push({ key: `${file.name}-${file.size}-${file.lastModified}`, file, preview: URL.createObjectURL(file), location, takenOn, ...n, include: true, state: "ready" });
    }
    setItems((xs) => [...xs, ...next.filter((n) => !xs.some((x) => x.key === n.key))]);
    setReading(false);
    const auto = next.filter((x) => x.projectId).length;
    setStatus(`${next.length} 枚を読みました。${auto} 枚を事例に振り分け、${next.length - auto} 枚は未振り分けです`);
  };

  // 半径を変えたら、手で選び直していない写真の振り分けをやり直す
  const reassign = (r: number) => {
    setRadius(r);
    setItems((xs) => xs.map((x) => (x.state === "ready" ? { ...x, ...nearest(x.location, r) } : x)));
  };
  const update = (key: string, patch: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const upload = () =>
    start(async () => {
      const supabase = createBrowserSupabase();
      const targets = items.filter((x) => x.include && x.projectId && x.state !== "done");
      for (const [n, x] of targets.entries()) {
        setStatus(`上げています（${n + 1}/${targets.length}）…`);
        update(x.key, { state: "uploading" });
        try {
          const project = byId.get(x.projectId)!;
          const { blob, width, height } = await stripExif(x.file);
          const path = photoPath(project.slug);
          const { error } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
          if (error) throw new Error(error.message);
          await addPhoto({ project_id: project.id, storage_path: path, taken_on: x.takenOn ?? today(), caption_ja: "", caption_en: "", width, height, people_checked: peopleChecked, location: x.location });
          update(x.key, { state: "done", message: undefined });
        } catch (e) {
          update(x.key, { state: "error", message: e instanceof Error ? e.message : String(e) });
        }
      }
      setStatus("上げ終わりました。各事例の画面で、カバー写真や公開の設定を確かめてください");
    });

  // 振り分け先ごとにまとめて見せる（未振り分けを先頭に）
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const x of items) m.set(x.projectId, [...(m.get(x.projectId) ?? []), x]);
    return [...m.entries()].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : (byId.get(a)?.name ?? "").localeCompare(byId.get(b)?.name ?? "", "ja")));
  }, [items, byId]);
  const ready = items.filter((x) => x.include && x.projectId && x.state !== "done").length;
  // 手で選ぶときの候補は、近い順（写真に位置がなければ名前順）
  const options = (x: Item) =>
    x.location ? [...([...located].sort((a, b) => meters(x.location!, a) - meters(x.location!, b)) as ProjectSpot[]), ...projects.filter((p) => p.lat === null)] : projects;

  return (
    <div className="grid gap-6 text-sm">
      <section className="grid gap-4 rounded-md border border-line bg-white p-5">
        <label
          className="grid cursor-pointer place-items-center gap-2 rounded-md border-2 border-dashed border-line px-6 py-10 text-center hover:border-accent"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            add([...e.dataTransfer.files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)));
          }}
        >
          <span className="text-base font-medium">写真をここにドラッグ、またはクリックして選ぶ</span>
          <span className="text-xs text-muted">何十枚でもまとめて選べます。JPEG・HEIC・PNG に対応。iPhone の写真は「位置情報を含める」で書き出すと自動で振り分けられます</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.heic,.heif"
            className="hidden"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              if (files.length) add(files);
            }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2">
            振り分ける範囲
            <select value={radius} onChange={(e) => reassign(Number(e.target.value))} className="rounded border border-line px-2 py-1">
              {[150, 300, 500, 1000, 2000].map((r) => (
                <option key={r} value={r}>{fmtDistance(r)}以内</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={peopleChecked} onChange={(e) => setPeopleChecked(e.target.checked)} />
            人物の写り込みを確認済み（外すと非公開で上がる）
          </label>
          <span className="text-xs text-muted">座標のない事例 {projects.length - located.length} 件には自動で振り分けられません</span>
        </div>
        {(status || reading) && <p className="text-muted">{status}</p>}
      </section>

      {items.length > 0 && (
        <section className="grid gap-5">
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-md border border-line bg-white/95 p-3 backdrop-blur">
            <span className="mr-auto">
              {items.length} 枚 · 上げる準備ができた写真 <b>{ready}</b> 枚
            </span>
            <button type="button" onClick={() => setItems([])} disabled={pending} className="text-muted hover:text-ink">すべて取り消す</button>
            <button type="button" disabled={!ready || pending} onClick={upload} className="rounded-md bg-accent px-4 py-2 text-white disabled:opacity-40">
              {ready} 枚を上げる
            </button>
          </div>

          {groups.map(([pid, xs]) => {
            const p = byId.get(pid);
            return (
              <div key={pid || "none"} className="rounded-md border border-line bg-white p-4">
                <h2 className="mb-3 flex flex-wrap items-baseline gap-2 font-medium">
                  {p ? (
                    <>
                      <Link href={`/admin/projects/${p.id}`} className="hover:underline">{p.name}</Link>
                      {p.draft && <span className="rounded bg-amber-100 px-1.5 text-[11px] text-amber-900">下書き</span>}
                    </>
                  ) : (
                    <span className="text-amber-800">未振り分け（近くに事例がない、または写真に位置情報がない）</span>
                  )}
                  <span className="text-xs font-normal text-muted">{xs.length} 枚</span>
                </h2>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {xs.map((x) => (
                    <li key={x.key} className={`grid content-start gap-1.5 text-xs ${x.include ? "" : "opacity-45"}`}>
                      <div className="relative aspect-[4/3] overflow-hidden rounded bg-placeholder">
                        {/* HEIC は Safari 以外では表示できないので、名前だけ出す */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={x.preview} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{x.file.name}</span>
                        {x.state !== "ready" && (
                          <span className={`absolute right-1 top-1 rounded px-1.5 py-0.5 text-[10px] text-white ${x.state === "done" ? "bg-accent" : x.state === "error" ? "bg-red-700" : "bg-ink"}`}>
                            {x.state === "done" ? "上げました" : x.state === "error" ? "失敗" : "上げています"}
                          </span>
                        )}
                      </div>
                      <span className="text-muted">
                        {x.takenOn ?? "撮影日なし"} · {x.location ? (x.distance !== null ? `事例まで ${fmtDistance(x.distance)}` : "位置あり") : "位置情報なし"}
                      </span>
                      <select
                        value={x.projectId}
                        disabled={x.state === "done" || x.state === "uploading"}
                        onChange={(e) => {
                          const target = byId.get(e.target.value);
                          update(x.key, { projectId: e.target.value, distance: target && x.location && target.lat !== null && target.lng !== null ? meters(x.location, { lat: target.lat, lng: target.lng }) : null });
                        }}
                        className="w-full rounded border border-line px-1 py-1"
                      >
                        <option value="">振り分けない</option>
                        {options(x).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                            {x.location && o.lat !== null && o.lng !== null ? `（${fmtDistance(meters(x.location, { lat: o.lat, lng: o.lng }))}）` : ""}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={x.include} disabled={x.state === "done"} onChange={(e) => update(x.key, { include: e.target.checked })} />
                        上げる
                      </label>
                      {x.message && <span className="text-red-700">{x.message}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
