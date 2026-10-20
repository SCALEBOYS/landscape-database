"use client";

import { useRef, useState } from "react";

import { ModelViewer } from "./ModelViewer";

export type ViewerModel = { src: string; name: string; caption?: string };

// 事例ページの 3D モデル。複数あれば切り替えて見る
export function ModelSection({ models, labels }: { models: ViewerModel[]; labels: { title: string; hint: string; fullscreen: string } }) {
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const cur = models[Math.min(i, models.length - 1)];

  return (
    <section className="grid gap-3 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink pt-3">
        <h2 className="text-[13px] font-medium tracking-[.1em] text-muted">{labels.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {models.length > 1 &&
            models.map((m, k) => (
              <button key={m.src} type="button" aria-pressed={k === i} onClick={() => setI(k)} className="chip">
                {m.caption || m.name}
              </button>
            ))}
          <button type="button" onClick={() => box.current?.requestFullscreen?.().catch(() => {})} className="text-xs text-muted hover:text-ink">
            {labels.fullscreen}
          </button>
        </div>
      </div>
      <div ref={box} className="relative h-[clamp(360px,51vw,600px)] overflow-hidden rounded-sm bg-gradient-to-b from-[#f4f4f2] to-[#e4e4e0]">
        <ModelViewer key={cur.src} src={cur.src} alt={cur.caption || cur.name} className="absolute inset-0" />
      </div>
      <p className="flex flex-wrap justify-between gap-3 text-xs text-muted">
        <span>{cur.caption}</span>
        <span>{labels.hint}</span>
      </p>
    </section>
  );
}
