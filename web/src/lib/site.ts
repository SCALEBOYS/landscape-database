// 公開サイトの URL（canonical・サイトマップ・OGP で使う）。Vercel の環境変数で上書きできる
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://landscapedatabase.com").replace(/\/$/, "");
// 本公開までは検索エンジンに載せない。Vercel で NEXT_PUBLIC_SITE_INDEXABLE=true にすると解除
export const INDEXABLE = process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true";

// ページの正式な URL（canonical）と、日本語・英語の対応ページ。path は言語を除いた部分（例: "/projects/foo"）
export function alternates(lang: string, path: string) {
  return { canonical: `/${lang}${path}`, languages: { ja: `/ja${path}`, en: `/en${path}`, "x-default": `/ja${path}` } };
}

// 構造化データ（JSON-LD）を <script> に入れる文字列。</script> で途切れないようにする
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
