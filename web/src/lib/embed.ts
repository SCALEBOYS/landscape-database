import "server-only";

import { createHash } from "node:crypto";
import { join } from "node:path";

import type { FeatureExtractionPipeline } from "@huggingface/transformers";

// 文章を「意味のベクトル」に変える（日本語の埋め込みモデル ruri-v3-30m をサーバーの中で動かす）。
// 外部の AI は使わないので、使うたびの料金はかからない。モデルは scripts/fetch-embed-model.mjs で models/ に用意する
const MODEL = "ruri-v3-30m";

let loading: Promise<FeatureExtractionPipeline> | null = null;
function model() {
  loading ??= (async () => {
    const { env, pipeline } = await import("@huggingface/transformers");
    // models/ はプロジェクト（web/）の直下。Vercel はプロジェクトを作業フォルダにして動く。
    // 手元で別のフォルダから起動するときは EMBED_MODEL_DIR で場所を指定する
    env.localModelPath = process.env.EMBED_MODEL_DIR || join(process.cwd(), "models/");
    env.allowRemoteModels = false;
    return pipeline("feature-extraction", MODEL, { dtype: "int8" });
  })().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

async function embed(texts: string[]): Promise<number[][]> {
  const m = await model();
  const out: number[][] = [];
  // 長い文章が多いと時間がかかるので、少しずつ
  for (let i = 0; i < texts.length; i += 32) {
    const t = await m(texts.slice(i, i + 32), { pooling: "mean", normalize: true });
    out.push(...(t.tolist() as number[][]));
  }
  return out;
}

// 検索される側の文章のベクトルは、同じ中身なら作り直さない（サーバーが動いている間だけ覚えておく）
const docCache = new Map<string, number[]>();
const key = (s: string) => createHash("sha1").update(s).digest("base64");

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const prepared = texts.map((t) => `検索文書: ${t.slice(0, 1000)}`);
  const keys = prepared.map(key);
  const missing = [...new Set(keys.map((k, i) => (docCache.has(k) ? -1 : i)).filter((i) => i >= 0))];
  if (missing.length) {
    const vecs = await embed(missing.map((i) => prepared[i]));
    missing.forEach((i, j) => docCache.set(keys[i], vecs[j]));
  }
  // 消えたページの分が溜まり続けないよう、今の一覧にないものは捨てる
  if (docCache.size > keys.length * 2) {
    const live = new Set(keys);
    for (const k of docCache.keys()) if (!live.has(k)) docCache.delete(k);
  }
  return keys.map((k) => docCache.get(k)!);
}

export async function embedQuery(text: string): Promise<number[]> {
  return (await embed([`検索クエリ: ${text}`]))[0];
}

export const cosine = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
