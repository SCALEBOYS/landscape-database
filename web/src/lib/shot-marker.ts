// 撮影地点のマーカー（番号つきの点と、撮影した向きの扇形）。地図に置く DOM を作る
// 番号は事例ページのカルーセルの「n / 全体」と同じ
export function shotMarker(n: number | null, heading: number | null, active = false): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = "position:relative;width:0;height:0;cursor:pointer";
  if (heading !== null) {
    const cone = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    cone.setAttribute("viewBox", "-40 -40 80 80");
    cone.setAttribute("width", "80");
    cone.setAttribute("height", "80");
    cone.style.cssText = `position:absolute;left:-40px;top:-40px;transform:rotate(${heading}deg);pointer-events:none`;
    // 上（北）向きに開いた 50° の扇形。heading の分だけ回す
    cone.innerHTML = `<path d="M0 0 L${-38 * Math.sin(Math.PI / 7.2)} ${-38 * Math.cos(Math.PI / 7.2)} A38 38 0 0 1 ${38 * Math.sin(Math.PI / 7.2)} ${-38 * Math.cos(Math.PI / 7.2)} Z" fill="${active ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.5)"}" stroke="white" stroke-width="1"/>`;
    el.appendChild(cone);
  }
  const dot = document.createElement("div");
  dot.textContent = n === null ? "" : String(n);
  dot.style.cssText = `position:absolute;left:-12px;top:-12px;width:24px;height:24px;border-radius:999px;display:grid;place-items:center;font:600 11px/1 system-ui,sans-serif;color:white;background:${active ? "#e4572e" : "#111"};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.45)`;
  el.appendChild(dot);
  return el;
}
