import { ImageResponse } from "next/og";

// SNS で共有したときの既定の画像（事例ページは写真か航空写真を使う）
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Landscape Database";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "#0a0a0a", color: "#fff" }}>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 4, color: "rgba(255,255,255,.6)" }}>KANSAI · LANDSCAPE ARCHITECTURE</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 104, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>Landscape Database</div>
          <div style={{ marginTop: 28, fontSize: 36, color: "rgba(255,255,255,.75)" }}>Projects, plants, designers, regulations and research</div>
        </div>
        <div style={{ display: "flex", height: 10, width: 160, background: "#0d6b4e" }} />
      </div>
    ),
    size,
  );
}
