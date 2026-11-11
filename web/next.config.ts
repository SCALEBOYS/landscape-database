import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // サイト内検索の「意味で探す」: 埋め込みモデルはサーバーの中で動かす（scripts/fetch-embed-model.mjs）
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  outputFileTracingIncludes: {
    "/[lang]/search": ["./models/ruri-v3-30m/**/*", "./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*"],
  },
  // Vercel は Linux x64 なので、ほかの OS 向けの部品は載せない（関数の容量の上限のため）
  outputFileTracingExcludes: {
    "*": ["./node_modules/onnxruntime-node/bin/napi-v3/{darwin,win32}/**/*", "./node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**/*", "./node_modules/onnxruntime-web/**/*"],
  },
  partialPrefetching: true,
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
