import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, hasLocale, LANG_COOKIE, locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

// 本番の vercel.app の URL は、独自ドメインへ恒久転送する（検索エンジンに同じページが二重に載らないように）
const LEGACY_HOST = "landscape-database.vercel.app";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.headers.get("host") === LEGACY_HOST) {
    return NextResponse.redirect(new URL(pathname + request.nextUrl.search, SITE_URL), 308);
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return refreshSession(request);
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  // 言語の付いていない URL を /ja か /en に振り分ける。保存済みの言語（cookie）→ ブラウザの言語 → 日本語 の順
  const saved = request.cookies.get(LANG_COOKIE)?.value;
  const accept = request.headers.get("accept-language") ?? "";
  const locale = saved && hasLocale(saved) ? saved : /^en\b/i.test(accept) ? "en" : defaultLocale;

  request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

// 管理画面: Supabase のログインセッションを更新して cookie に書き戻す
async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // /api は言語の振り分けをしない
  matcher: ["/((?!_next|api/|favicon.ico|.*\\..*).*)"],
};
