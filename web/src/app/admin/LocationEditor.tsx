"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

import { MAPBOX_TOKEN, SATELLITE_CONFIG, STYLE_SATELLITE } from "@/lib/mapbox";
import { shotMarker } from "@/lib/shot-marker";

import type { PhotoLocationInput } from "./actions";

// 撮影地点を航空写真の上で入れる・直す。クリックで地点、スライダーで向き
export function LocationEditor({
  src,
  initial,
  center,
  pending,
  onSave,
  onClose,
}: {
  src: string;
  initial: PhotoLocationInput | null;
  center: { lat: number; lng: number } | null;
  pending: boolean;
  onSave: (loc: PhotoLocationInput) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [heading, setHeading] = useState<number | null>(initial?.heading ?? null);
  const start = initial ?? center;

  useEffect(() => {
    if (!box.current || !MAPBOX_TOKEN) return;
    let cancelled = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !box.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const m = new mapboxgl.Map({
        container: box.current,
        style: STYLE_SATELLITE,
        config: SATELLITE_CONFIG,
        center: start ? [start.lng, start.lat] : [135.5, 34.69],
        zoom: start ? 18 : 9,
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      m.getCanvas().style.cursor = "crosshair";
      m.on("click", (e) => setPos({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
      mapRef.current = m;
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // 地図は開いたときに一度だけ作る
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 地点・向きが変わるたびにマーカーを置き直す
  useEffect(() => {
    let cancelled = false;
    markerRef.current?.remove();
    markerRef.current = null;
    if (!pos) return;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      const m = mapRef.current;
      if (cancelled || !m) return;
      markerRef.current = new mapboxgl.Marker({ element: shotMarker(null, heading, true) }).setLngLat([pos.lng, pos.lat]).addTo(m);
    });
    return () => {
      cancelled = true;
    };
  }, [pos, heading]);

  return (
    <div className="mt-5 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">撮影地点の入力</h3>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink">閉じる</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <p className="mb-2 text-xs text-muted">航空写真の上で、写真を撮った場所をクリックしてください。</p>
          <div ref={box} className="relative h-80 overflow-hidden rounded" />
        </div>
        <div className="grid content-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="aspect-[16/9] w-full rounded object-cover" />
          <p className="text-xs text-muted">{pos ? `地点: ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` : "地点はまだ選ばれていません"}</p>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={heading !== null} onChange={(e) => setHeading(e.target.checked ? 0 : null)} />
            撮影した向きを入れる
          </label>
          {heading !== null && (
            <label className="text-xs">
              向き {Math.round(heading)}°（北が0、時計回り。東 90・南 180・西 270）
              <input type="range" min={0} max={359} value={Math.round(heading)} onChange={(e) => setHeading(Number(e.target.value))} className="mt-1 block w-full" />
            </label>
          )}
          <button type="button" disabled={!pos || pending} onClick={() => pos && onSave({ lat: pos.lat, lng: pos.lng, heading })} className="justify-self-start rounded-md bg-accent px-4 py-2 text-white disabled:opacity-50">
            この地点で保存
          </button>
        </div>
      </div>
    </div>
  );
}
