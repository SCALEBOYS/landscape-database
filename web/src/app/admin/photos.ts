// 写真を Canvas に描き直して JPEG で書き出す。描き直すと EXIF（位置情報・撮影機材など）は一切残らない。
// 向きは createImageBitmap が EXIF の Orientation を反映してから描くので、回転は保たれる
const MAX_SIDE = 2400;
const QUALITY = 0.88;

export async function stripExif(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await decode(file);
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

// まずブラウザ自身で読む。Chrome などは iPhone の HEIC を読めないので、そのときはブラウザ内で変換する
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const { heicTo, isHeic } = await import("heic-to/next");
    if (!(await isHeic(file))) throw new Error(`${file.name} は読み込めない形式です（JPEG・PNG・WebP・HEIC に対応）`);
    return heicTo({ blob: file, type: "bitmap", options: { imageOrientation: "from-image" } });
  }
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

export type ShotLocation = { lat: number; lng: number; heading: number | null };

// EXIF を消す前に、撮影地点（GPS）と撮影した向きだけを読み取る。無ければ null
// 写真ファイルには残さず、地図に出すためにデータベースへ別に記録する
export async function readLocation(file: File): Promise<ShotLocation | null> {
  try {
    const exifr = (await import("exifr")).default;
    const tags = (await exifr.parse(file, { gps: true, pick: ["GPSLatitude", "GPSLatitudeRef", "GPSLongitude", "GPSLongitudeRef", "GPSImgDirection"] })) as
      | { latitude?: number; longitude?: number; GPSImgDirection?: number }
      | undefined;
    const lat = tags?.latitude;
    const lng = tags?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
    const dir = tags?.GPSImgDirection;
    return { lat, lng, heading: typeof dir === "number" && Number.isFinite(dir) ? ((dir % 360) + 360) % 360 : null };
  } catch {
    return null;
  }
}

// 撮影日（EXIF の DateTimeOriginal）を YYYY-MM-DD で返す。無ければ null
export async function readTakenOn(file: File): Promise<string | null> {
  try {
    const exifr = (await import("exifr")).default;
    const tags = (await exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate"] })) as { DateTimeOriginal?: Date; CreateDate?: Date } | undefined;
    const d = tags?.DateTimeOriginal ?? tags?.CreateDate;
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  } catch {
    return null;
  }
}
