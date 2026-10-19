"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import type { Map as MapboxMap } from "mapbox-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/Icon";
import { cardImage } from "@/components/ProjectCard";
import type { BrowseItem } from "@/lib/browse";
import type { BrowseText } from "@/lib/i18n";
import { MAPBOX_TOKEN, SATELLITE_CONFIG, STANDARD_CONFIG, STYLE_MAP, STYLE_SATELLITE } from "@/lib/mapbox";

// マーカーの外枠（DOM）だけ mapbox に渡し、中のピンは React で描く
type Pin = { item: BrowseItem; el: HTMLElement };

// 地図で探す画面の地図。ピンは事例の用途アイコン。地図を動かすたびに表示範囲内の事例を親へ知らせる
export function ExploreMap({
  lang,
  items,
  shown,
  hovered,
  onHover,
  onBounds,
  t,
  interactive = true,
}: {
  lang: string;
  items: BrowseItem[];
  shown?: Set<string>;
  hovered?: string | null;
  onHover?: (slug: string | null) => void;
  onBounds?: (slugs: Set<string>) => void;
  t: BrowseText;
  interactive?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [satellite, setSatellite] = useState(false);
  const router = useRouter();
  // 地図は一度だけ作るので、最新のコールバックは ref 経由で呼ぶ
  const cb = useRef({ onHover, onBounds, router });
  useEffect(() => {
    cb.current = { onHover, onBounds, router };
  });

  useEffect(() => {
    if (!box.current || !MAPBOX_TOKEN) return;
    let map: MapboxMap | undefined;
    let cancelled = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !box.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const located = items.filter((it) => it.lat !== null && it.lng !== null);
      map = new mapboxgl.Map({
        container: box.current,
        style: STYLE_MAP,
        config: STANDARD_CONFIG,
        // language を付けるとこのトークンでは地図データが 403 になる。日本国内の地名はそのままで日本語
        center: [135.5, 34.75],
        zoom: 8.3,
        interactive,
        cooperativeGestures: !interactive,
      });
      const m = map;
      if (interactive) m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      const bounds = new mapboxgl.LngLatBounds();
      const made = located.map((it) => {
        const el = document.createElement("div");
        const popup = new mapboxgl.Popup({ offset: 22, maxWidth: "260px" }).setDOMContent(popupContent(lang, it, (href) => cb.current.router.push(href)));
        new mapboxgl.Marker({ element: el }).setLngLat([it.lng!, it.lat!]).setPopup(popup).addTo(m);
        bounds.extend([it.lng!, it.lat!]);
        return { item: it, el };
      });
      if (located.length > 1) m.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 0 });
      else if (located.length === 1) m.jumpTo({ center: [located[0].lng!, located[0].lat!], zoom: 14 });
      const report = () => {
        const b = m.getBounds();
        if (b) cb.current.onBounds?.(new Set(located.filter((it) => b.contains([it.lng!, it.lat!])).map((it) => it.slug)));
      };
      m.on("moveend", report);
      m.once("load", report);
      mapRef.current = m;
      setPins(made);
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      setPins([]);
    };
  }, [items, lang, interactive]);

  const switchStyle = (sat: boolean) => {
    setSatellite(sat);
    // マーカーは DOM 要素なので、スタイルを差し替えても残る（型定義では font 系が必須になっているが省略できる）
    mapRef.current?.setStyle(sat ? STYLE_SATELLITE : STYLE_MAP, { config: sat ? SATELLITE_CONFIG : STANDARD_CONFIG } as unknown as Parameters<MapboxMap["setStyle"]>[1]);
  };

  if (!MAPBOX_TOKEN) return <div className="map-missing">{t.noToken}</div>;

  return (
    <div className="relative h-full w-full">
      {/* mapbox の CSS が地図要素を position: relative にするので、配置は外側の要素で行う */}
      <div className="absolute inset-0">
        <div ref={box} className="h-full w-full" />
      </div>
      {interactive && (
        <div className="mstyle" role="group" aria-label={t.viewLabel}>
          <button type="button" aria-pressed={!satellite} onClick={() => switchStyle(false)}>
            {t.styleMap}
          </button>
          <button type="button" aria-pressed={satellite} onClick={() => switchStyle(true)}>
            {t.styleSatellite}
          </button>
        </div>
      )}
      {pins.map(({ item: it, el }) =>
        !shown || shown.has(it.slug)
          ? createPortal(
              <button
                type="button"
                className={`pin ${hovered === it.slug ? "hl" : ""}`}
                aria-label={it.name}
                onMouseEnter={() => onHover?.(it.slug)}
                onMouseLeave={() => onHover?.(null)}
                onClick={() => {
                  const m = mapRef.current;
                  m?.flyTo({ center: [it.lng!, it.lat!], zoom: Math.max(m.getZoom(), 12.5), duration: 800 });
                }}
              >
                <Icon name={it.use} />
              </button>,
              el,
              it.slug,
            )
          : null,
      )}
    </div>
  );
}

function popupContent(lang: string, it: BrowseItem, go: (href: string) => void) {
  const href = `/${lang}/projects/${it.slug}`;
  const a = document.createElement("a");
  a.href = href;
  a.className = "mpop";
  a.addEventListener("click", (e) => {
    e.preventDefault();
    go(href);
  });
  const src = cardImage({ cover: it.photo, lat: it.lat, lng: it.lng });
  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    a.append(img);
  }
  const text = document.createElement("span");
  const name = document.createElement("b");
  name.textContent = it.name;
  text.append(name, [it.useLabel, it.muni || it.prefLabel, it.year].filter(Boolean).join(" · "));
  a.append(text);
  return a;
}
