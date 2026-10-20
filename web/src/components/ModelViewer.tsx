"use client";

import { useEffect, useRef } from "react";

// GLB / glTF を回転・拡大して見る表示枠（Google の model-viewer を使う）
// カスタム要素なので、読み込み後に DOM で組み立てる
export function ModelViewer({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let el: HTMLElement | null = null;
    import("@google/model-viewer").then(() => {
      if (cancelled || !box.current) return;
      el = document.createElement("model-viewer");
      const attrs: Record<string, string> = {
        src,
        alt,
        "camera-controls": "",
        "auto-rotate": "",
        "auto-rotate-delay": "1500",
        "rotation-per-second": "12deg",
        "shadow-intensity": "1",
        "shadow-softness": "0.8",
        exposure: "1",
        "environment-image": "neutral",
        "interaction-prompt": "none",
        "touch-action": "pan-y",
      };
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.background = "transparent";
      box.current.replaceChildren(el);
    });
    return () => {
      cancelled = true;
      el?.remove();
    };
  }, [src, alt]);

  return <div ref={box} className={className} />;
}
