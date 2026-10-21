"use client";

import { useSyncExternalStore } from "react";

import { COMPARE_MAX, parseCompare, readCompareRaw, subscribeCompare, writeCompare } from "@/lib/compare";

// 比較に入れた事例の一覧と、出し入れの操作
export function useCompare() {
  const raw = useSyncExternalStore(subscribeCompare, readCompareRaw, () => "[]");
  const slugs = parseCompare(raw);
  return {
    slugs,
    full: slugs.length >= COMPARE_MAX,
    has: (slug: string) => slugs.includes(slug),
    // 続けて押されても取りこぼさないよう、押したときの最新の内容から変える
    toggle: (slug: string) => {
      const cur = parseCompare(readCompareRaw());
      writeCompare(cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug].slice(-COMPARE_MAX));
    },
    remove: (slug: string) => writeCompare(parseCompare(readCompareRaw()).filter((s) => s !== slug)),
    clear: () => writeCompare([]),
  };
}
