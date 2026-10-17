"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef } from "react";

export type MapPoint = { slug: string; name: string; sub: string; lat: number; lng: number };

// 地図タイルは OpenFreeMap（API キー不要・本番利用可）
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function ProjectMap({ lang, points, height = 560 }: { lang: string; points: MapPoint[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;
    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !ref.current) return;
      // バンドラ経由だと worker の URL が解決できないため、public にコピーしたものを使う（package.json の prebuild）
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const m = new maplibregl.Map({ container: ref.current, style: STYLE, center: [135.5, 34.7], zoom: 8 });
      map = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      const bounds = new maplibregl.LngLatBounds();
      for (const p of points) {
        const popup = new maplibregl.Popup({ offset: 18 }).setDOMContent(popupContent(lang, p));
        new maplibregl.Marker({ color: "#2f5d46" }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(m);
        bounds.extend([p.lng, p.lat]);
      }
      if (points.length > 1) m.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
      else if (points.length === 1) m.jumpTo({ center: [points[0].lng, points[0].lat], zoom: 15 });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lang, points]);

  return <div ref={ref} style={{ height }} className="w-full overflow-hidden rounded-md border border-line" />;
}

function popupContent(lang: string, p: MapPoint) {
  const a = document.createElement("a");
  a.href = `/${lang}/projects/${p.slug}`;
  a.className = "block text-ink";
  const title = document.createElement("strong");
  title.textContent = p.name;
  const sub = document.createElement("div");
  sub.textContent = p.sub;
  sub.className = "text-xs text-muted";
  a.append(title, sub);
  return a;
}
