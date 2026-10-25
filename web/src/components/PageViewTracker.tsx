"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// ページが表示されたら、アクセスの記録（/api/pv）に送る。ページを移るたびに1回
export function PageViewTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    // 手元の開発環境では数えない
    if (process.env.NODE_ENV !== "production" || location.hostname === "localhost") return;
    const ref = first.current ? document.referrer : "";
    first.current = false;
    const body = JSON.stringify({ path: pathname, ref });
    if (!navigator.sendBeacon?.("/api/pv", new Blob([body], { type: "application/json" }))) {
      fetch("/api/pv", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  }, [pathname]);
  return null;
}
