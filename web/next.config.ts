import type { NextConfig } from "next";

// 応答に付けるセキュリティ用のヘッダー。読み込み先は、実際に使っているサービスだけを許可する
// （Supabase: データと写真、Mapbox: 地図、gstatic: 3D モデルの展開、Google: 管理画面の写真選択）
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://accounts.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https://*.supabase.co https://*.mapbox.com https://*.googleusercontent.com",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self' data: blob: https://*.supabase.co wss://*.supabase.co https://*.mapbox.com https://www.gstatic.com https://accounts.google.com https://*.googleapis.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  /* config options here */
  cacheComponents: true,
  // サイト内検索の「意味で探す」: 埋め込みモデルはサーバーの中で動かす（scripts/fetch-embed-model.mjs）
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  outputFileTracingIncludes: {
    // キーは glob なので [ ] をエスケープする
    "/\\[lang\\]/search": ["./models/ruri-v3-30m/**/*", "./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
  },
  // Vercel は Linux x64 なので、ほかの OS 向けの部品は載せない（関数の容量の上限のため）
  outputFileTracingExcludes: {
    "*": ["node_modules/onnxruntime-node/bin/napi-v3/darwin/**", "node_modules/onnxruntime-node/bin/napi-v3/win32/**", "node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**", "node_modules/onnxruntime-web/**"],
  },
  partialPrefetching: true,
  // 法令のページは RESEARCH から RULE タブへ移した
  async redirects() {
    return [
      { source: "/:lang(ja|en)/laws", destination: "/:lang/rule", permanent: true },
      { source: "/:lang(ja|en)/laws/:slug", destination: "/:lang/rule/:slug", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
