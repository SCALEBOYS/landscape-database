// 写真を Canvas に描き直して JPEG で書き出す。描き直すと EXIF（位置情報・撮影機材など）は一切残らない。
// 向きは createImageBitmap が EXIF の Orientation を反映してから描くので、回転は保たれる
const MAX_SIDE = 2400;
const QUALITY = 0.88;

export async function stripExif(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas が使えません");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("画像を書き出せませんでした"))), "image/jpeg", QUALITY),
  );
  if (await hasExif(blob)) throw new Error("EXIF が残っています");
  return { blob, width, height };
}

// JPEG の APP1（Exif）セグメントが無いことを確かめる
async function hasExif(blob: Blob) {
  const bytes = new Uint8Array(await blob.slice(0, 65536).arrayBuffer());
  for (let i = 2; i + 3 < bytes.length; ) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    if (marker === 0xda) break; // 画像データ開始
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker === 0xe1 && String.fromCharCode(...bytes.slice(i + 4, i + 8)) === "Exif") return true;
    i += 2 + length;
  }
  return false;
}

export function photoPath(projectSlug: string) {
  return `${projectSlug}/${crypto.randomUUID()}.jpg`;
}
