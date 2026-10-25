import { createHash } from "node:crypto";

import { supabase } from "@/lib/data";

// 自動で巡回するプログラム（検索エンジンなど）は数えない
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|preview|monitor|curl|wget|python|axios/i;

// ページの表示を1件記録する。Cookie は使わず、IP アドレスも保存しない
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { path?: unknown; ref?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path.split("?")[0].slice(0, 300) : "";
  if (!/^\/(ja|en)(\/|$)/.test(path)) return new Response(null, { status: 204 });

  // 参照元は、サイトの外から来たときだけホスト名を残す
  let referrer_host: string | null = null;
  try {
    const host = typeof body?.ref === "string" && body.ref ? new URL(body.ref).hostname : "";
    if (host && host !== new URL(req.url).hostname && !host.endsWith("landscapedatabase.com")) referrer_host = host.replace(/^www\./, "").slice(0, 200);
  } catch {}

  const device = /ipad|tablet|(android(?!.*mobile))/i.test(ua) ? "tablet" : /mobi|iphone|android/i.test(ua) ? "mobile" : "desktop";
  const country = req.headers.get("x-vercel-ip-country")?.toUpperCase().match(/^[A-Z]{2}$/)?.[0] ?? null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  // 同じ日の同じ訪問者を数えるためのハッシュ（日付を混ぜるので、日をまたぐとつながらない）
  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const visitor = createHash("sha256").update(`${ip}|${ua}|${day}|${process.env.NEXT_PUBLIC_SUPABASE_URL}`).digest("hex").slice(0, 32);

  await supabase().from("page_views").insert({ path, referrer_host, country, device, lang: path.slice(1, 3), visitor });
  return new Response(null, { status: 204 });
}
