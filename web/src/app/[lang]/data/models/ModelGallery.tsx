"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { ModelViewer } from "@/components/ModelViewer";
import type { Dictionary } from "@/lib/i18n";

export type GalleryModel = { src: string; name: string; project: string; slug: string; img: string | null };

// 3D は重いので、一度に1つだけ読み込んで表示する
export function ModelGallery({ lang, models, t }: { lang: string; models: GalleryModel[]; t: Dictionary["dataPage"] }) {
  const [cur, setCur] = useState(0);
  if (!models.length) return <p className="mt-8 text-sm text-muted">{t.noModels}</p>;
  const m = models[cur];
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid content-start gap-3">
        <div className="relative h-[clamp(320px,52vw,620px)] overflow-hidden rounded-sm bg-gradient-to-b from-[#f4f4f2] to-[#e4e4e0]">
          <ModelViewer key={m.src} src={m.src} alt={m.name} className="absolute inset-0" />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p>
            <span className="text-lg font-semibold">{m.project}</span>
            <span className="ml-2 text-sm text-muted">{m.name}</span>
          </p>
          <Link href={`/${lang}/projects/${m.slug}`} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">{t.openProject} <Icon name="arrow" className="ico !h-4 !w-4" /></Link>
        </div>
        <p className="text-xs text-muted">{t.modelHint}</p>
      </div>
      <ul className="grid content-start gap-2">
        {models.map((x, i) => (
          <li key={x.src}>
            <button type="button" onClick={() => setCur(i)} aria-pressed={i === cur} className={`flex w-full items-center gap-3 rounded-sm border p-2 text-left ${i === cur ? "border-ink" : "border-line hover:border-ink/50"}`}>
              <span className="h-14 w-20 flex-none overflow-hidden rounded-sm bg-soft">
                {x.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={x.img} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="grid min-w-0">
                <span className="truncate text-sm font-medium">{x.project}</span>
                <span className="truncate text-xs text-muted">{x.name}</span>
              </span>
              <Icon name="cube" className="ico ml-auto !h-4 !w-4 flex-none text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
