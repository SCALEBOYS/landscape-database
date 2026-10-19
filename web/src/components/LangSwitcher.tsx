"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LANG_COOKIE, type Locale } from "@/lib/i18n";

// 黒いヘッダーの右端。いまと違う言語だけを「EN」「日本語」として出す
export function LangSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(ja|en)(?=\/|$)/, "");
  const other: Locale = current === "ja" ? "en" : "ja";
  return (
    <Link
      href={`/${other}${rest}`}
      hrefLang={other}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${other}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="opacity-55 hover:opacity-100"
    >
      {other === "en" ? "EN" : "日本語"}
    </Link>
  );
}
