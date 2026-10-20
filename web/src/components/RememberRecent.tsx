"use client";

import { useEffect } from "react";

import { rememberRecent, type RecentKind } from "@/lib/recent";

// 樹種・設計者のページを開いたら「最近探したもの」に加える
export function RememberRecent({ kind, slug }: { kind: RecentKind; slug: string }) {
  useEffect(() => rememberRecent(kind, [slug]), [kind, slug]);
  return null;
}
