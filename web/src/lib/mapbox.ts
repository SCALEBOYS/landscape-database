// Mapbox の公開トークン（pk.）。URL 制限付きで、ブラウザに渡ってよい値
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// 一覧・探索の地図。Standard を淡いモノクロにして、事例のピンを主役にする
export const STYLE_MAP = "mapbox://styles/mapbox/standard";
export const STYLE_SATELLITE = "mapbox://styles/mapbox/standard-satellite";
export const STANDARD_CONFIG = {
  basemap: { theme: "monochrome", lightPreset: "day", showPointOfInterestLabels: false, showTransitLabels: false, show3dObjects: false },
};
// 事例詳細の 3D 表示。建物・樹木と、対応している場所ではランドマークの詳細な 3D モデルを出す
export const MODEL_CONFIG = {
  basemap: { lightPreset: "day", show3dObjects: true, showPointOfInterestLabels: false, showTransitLabels: false },
};
// 航空写真でも店舗などのアイコンは消して、事例のピンだけを目立たせる
export const SATELLITE_CONFIG = {
  basemap: { showPointOfInterestLabels: false, showTransitLabels: false },
};

// 自分の写真がまだない事例は、代わりに航空写真の静止画を出す（Static Images API）
// 既定は事例カードの縦長 3:4
export function satelliteImage(lat: number, lng: number, { w = 480, h = 640, zoom = 16 } = {}) {
  if (!MAPBOX_TOKEN) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${zoom},0/${w}x${h}@2x?access_token=${MAPBOX_TOKEN}`;
}
