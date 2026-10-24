import "server-only";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_TEXT = 60000;

// 出典のページ（HTML か PDF）を取ってきて、Claude に渡せる形にする
export async function readSource(url: string) {
  const u = new URL(url);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("http(s) の URL を入れてください");
  const res = await fetch(u, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "LandscapeDatabaseBot/1.0 (+https://landscapedatabase.com/ja/about)" } });
  if (!res.ok) throw new Error(`ページを読めませんでした（${res.status}）`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("ファイルが大きすぎます（15MB まで）");
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("pdf") || u.pathname.toLowerCase().endsWith(".pdf")) {
    return { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: buf.toString("base64") } };
  }
  const text = buf
    .toString("utf8")
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  if (text.length < 50) throw new Error("ページから文章を読み取れませんでした");
  return { type: "text" as const, text: `出典 ${url} の本文:\n${text.slice(0, MAX_TEXT)}` };
}
