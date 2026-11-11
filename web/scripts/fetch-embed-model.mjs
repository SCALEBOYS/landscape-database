// サイト内検索の「意味で探す」に使う日本語の埋め込みモデル（ruri-v3-30m）を models/ に用意する。
// ビルドのたびに Hugging Face から取り直さないよう、ファイルがあれば何もしない。版は固定し、ハッシュで中身を確かめる
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "models", "ruri-v3-30m");
const ONNX = "https://huggingface.co/onnx-community/ruri-v3-30m-ONNX/resolve/1b41a27f31213fc55a9c4653c067770e39406408";
const ORIG = "https://huggingface.co/cl-nagoya/ruri-v3-30m/resolve/24899e5de370b56d179604a007c0d727bf144504";
const FILES = [
  ["config.json", `${ONNX}/config.json`],
  ["onnx/model_int8.onnx", `${ONNX}/onnx/model_int8.onnx`],
  ["tokenizer.json", `${ORIG}/tokenizer.json`],
  ["tokenizer_config.json", `${ORIG}/tokenizer_config.json`],
  ["special_tokens_map.json", `${ORIG}/special_tokens_map.json`],
];
const SHA256 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "embed-model.sha256.json"), "utf8"));

for (const [name, url] of FILES) {
  const path = join(ROOT, name);
  const check = (buf) => {
    const h = createHash("sha256").update(buf).digest("hex");
    if (SHA256[name] && SHA256[name] !== h) throw new Error(`${name} のハッシュが違います（${h}）`);
    return h;
  };
  if (existsSync(path)) {
    check(readFileSync(path));
    continue;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name} を取得できませんでした（${res.status}）`);
  const buf = Buffer.from(await res.arrayBuffer());
  const h = check(buf);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log(`取得: ${name} ${(buf.length / 1e6).toFixed(1)}MB ${h}`);
}
