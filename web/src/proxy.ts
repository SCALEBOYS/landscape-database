import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, hasLocale, LANG_COOKIE, locales } from "@/lib/i18n";

// 言語の付いていない URL を /ja か /en に振り分ける。保存済みの言語（cookie）→ ブラウザの言語 → 日本語 の順
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  const saved = request.cookies.get(LANG_COOKIE)?.value;
  const accept = request.headers.get("accept-language") ?? "";
  const locale = saved && hasLocale(saved) ? saved : /^en\b/i.test(accept) ? "en" : defaultLocale;

  request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
