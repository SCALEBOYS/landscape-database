"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LANG_COOKIE, locales, type Locale } from "@/lib/i18n";

export function LangSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(ja|en)(?=\/|$)/, "");
  return (
    <div className="flex gap-1 text-sm">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          onClick={() => {
            document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
          }}
          aria-current={l === current ? "true" : undefined}
          className={`rounded px-2 py-1 ${l === current ? "bg-accent text-white" : "text-muted hover:text-ink"}`}
        >
          {l === "ja" ? "日本語" : "English"}
        </Link>
      ))}
    </div>
  );
}
