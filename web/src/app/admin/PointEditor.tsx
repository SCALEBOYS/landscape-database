"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addPhotoPoint, deletePhotoPoint } from "./actions";
import { guessPhotoPoints, type PhotoCandidate } from "./ai-actions";

export type AdminPoint = { id: string; x: number; y: number; species_id: string | null; category_id: string | null; note_ja: string | null };
// ポイントに結びつけられる候補（この事例に登録済みの植栽と構成要素）
export type PointOption = { kind: "species" | "category"; id: string; label: string };

// 写真をクリックした位置にポイントを置き、樹種か素材を結びつける
export function PointEditor({ photoId, src, points, options, onClose }: { photoId: string; src: string; points: AdminPoint[]; options: PointOption[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [choice, setChoice] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [guessing, startGuess] = useTransition();
  const [candidates, setCandidates] = useState<PhotoCandidate[] | null>(null);
  const has = (c: PhotoCandidate) => options.some((o) => o.kind === c.kind && o.id === c.id);
  const guess = () =>
    startGuess(async () => {
      setError("");
      const r = await guessPhotoPoints(photoId);
      if (r.ok) setCandidates(r.candidates);
      else setError(r.message);
    });

  const labelOf = (p: AdminPoint) =>
    options.find((o) => (o.kind === "species" ? o.id === p.species_id : o.id === p.category_id))?.label ?? "（この事例から外れた項目）";

  const place = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDraft({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) });
    setError("");
  };

  const run = (fn: () => Promise<void>, after?: () => void) =>
    start(async () => {
      try {
        await fn();
        after?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });

  const save = () => {
    if (!draft || !choice) return;
    const [kind, id] = choice.split(":");
    run(
      () => addPhotoPoint({ photo_id: photoId, x: draft.x, y: draft.y, species_id: kind === "species" ? id : null, category_id: kind === "category" ? id : null, note_ja: note }),
      () => {
        setDraft(null);
        setChoice("");
        setNote("");
      },
    );
  };

  return (
    <div className="mt-5 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">ポイントの編集</h3>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink">閉じる</button>
      </div>
      {!options.length && (
        <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-amber-900">
          この事例に植栽・構成要素がまだ登録されていません。先に上の「植栽」「構成要素」に入れて保存すると、ここで選べるようになります。
        </p>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted">写真の上をクリックすると、その位置にポイントを置けます。</p>
        <button type="button" disabled={guessing} onClick={guess} className="ml-auto rounded-md border border-accent px-3 py-1 text-xs text-accent hover:bg-accent hover:text-white disabled:opacity-50">
          {guessing ? "AI が写真を見ています…" : "✦ AI で樹種・素材の候補を出す"}
        </button>
      </div>
      <div className="relative cursor-crosshair overflow-hidden rounded" onClick={place}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="block w-full select-none" draggable={false} />
        {points.map((p, i) => (
          <span key={p.id} className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-ink text-[11px] font-medium text-white shadow" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
            {i + 1}
          </span>
        ))}
        {candidates?.map((c, i) => (
          <span key={`c${i}`} className="pointer-events-none absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-dashed border-white bg-accent/70 text-[10px] font-medium text-white shadow" style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}>
            {String.fromCharCode(65 + i)}
          </span>
        ))}
        {draft && (
          <span className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-white bg-accent shadow" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }} />
        )}
      </div>

      {draft && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1.3fr_1fr_auto]">
          <select value={choice} onChange={(e) => setChoice(e.target.value)} className="rounded-md border border-line bg-white px-2 py-1.5">
            <option value="">何のポイントかを選ぶ</option>
            <optgroup label="樹種（植栽）">
              {options.filter((o) => o.kind === "species").map((o) => <option key={o.id} value={`species:${o.id}`}>{o.label}</option>)}
            </optgroup>
            <optgroup label="素材（構成要素）">
              {options.filter((o) => o.kind === "category").map((o) => <option key={o.id} value={`category:${o.id}`}>{o.label}</option>)}
            </optgroup>
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="補足（任意。例: 株立ち、目地は砂）" className="rounded-md border border-line bg-white px-2 py-1.5" />
          <span className="flex gap-2">
            <button type="button" disabled={!choice || pending} onClick={save} className="rounded-md bg-accent px-3 py-1.5 text-white disabled:opacity-50">置く</button>
            <button type="button" onClick={() => setDraft(null)} className="text-muted">やめる</button>
          </span>
        </div>
      )}
      {error && <p className="mt-2 text-red-700">失敗しました: {error}</p>}

      {candidates && (
        <div className="mt-4 rounded-md bg-white p-3">
          <p className="mb-2 text-xs text-muted">AI の候補です（写真の上の A・B…）。確かめてから「置く」を押してください。事例の植栽・構成要素にないものは、先に事例へ登録すると置けます。</p>
          {candidates.length === 0 && <p className="text-muted">候補は見つかりませんでした。</p>}
          <ol className="grid gap-1.5">
            {candidates.map((c, i) => (
              <li key={i} className="grid grid-cols-[20px_1fr_auto] items-start gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] text-white">{String.fromCharCode(65 + i)}</span>
                <span>
                  {c.label}
                  <span className="ml-2 text-xs text-muted">{c.kind === "species" ? "樹種" : "素材"}・確からしさ {({ high: "高", medium: "中", low: "低" } as const)[c.confidence]}</span>
                  <span className="block text-xs text-muted">{c.reason}</span>
                </span>
                {has(c) ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => addPhotoPoint({ photo_id: photoId, x: c.x, y: c.y, species_id: c.kind === "species" ? c.id : null, category_id: c.kind === "category" ? c.id : null, note_ja: "" }),
                        () => setCandidates((list) => list?.filter((x) => x !== c) ?? null),
                      )
                    }
                    className="rounded-md bg-accent px-3 py-1 text-xs text-white disabled:opacity-50"
                  >
                    置く
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-700">事例に未登録</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {points.length > 0 && (
        <ol className="mt-4 grid gap-1">
          {points.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-ink text-[10px] text-white">{i + 1}</span>
              <span>{labelOf(p)}</span>
              {p.note_ja && <span className="text-muted">— {p.note_ja}</span>}
              <button type="button" disabled={pending} onClick={() => run(() => deletePhotoPoint(p.id))} className="ml-auto text-red-700">外す</button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
