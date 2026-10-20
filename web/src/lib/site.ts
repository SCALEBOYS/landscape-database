// 公開サイトの URL（canonical・サイトマップ・OGP で使う）。Vercel の環境変数で上書きできる
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://landscapedatabase.com").replace(/\/$/, "");
// 本公開までは検索エンジンに載せない。Vercel で NEXT_PUBLIC_SITE_INDEXABLE=true にすると解除
export const INDEXABLE = process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true";
