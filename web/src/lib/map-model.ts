// Mapbox の model レイヤーが読める形に GLB を組み直す
// 地図側のローダーは、三角形の部品ごとに 16 ビットの頂点番号（インデックス）がある前提で読む。
// three.js などの書き出しでは、番号なしの部品や 65,535 頂点を超える部品があり、そのままだと読み込みに失敗する。
// 元のデータは残し、組み直した部品の分だけバッファの後ろに足す（画像や材質はそのまま使える）。

type Accessor = { bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string; normalized?: boolean; min?: number[]; max?: number[] };
type BufferView = { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number; target?: number };
type Primitive = { attributes: Record<string, number>; indices?: number; mode?: number; material?: number; extensions?: unknown; targets?: unknown };
type Gltf = { meshes?: { primitives: Primitive[] }[]; accessors: Accessor[]; bufferViews: BufferView[]; buffers: { byteLength: number }[] };

const MAX_VERTS = 65535;
const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const BYTES: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const GLB_MAGIC = 0x46546c67;

const fits = (g: Gltf, p: Primitive) =>
  (p.mode ?? 4) !== 4 || !!p.extensions || (p.indices !== undefined && g.accessors[p.indices].componentType !== 5125 && g.accessors[p.attributes.POSITION].count <= MAX_VERTS);

// 組み直しが要らなければ null を返す
export function mapReadyGlb(glb: ArrayBuffer): ArrayBuffer | null {
  const dv = new DataView(glb);
  if (dv.getUint32(0, true) !== GLB_MAGIC) return null;
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, jsonLen))) as Gltf;
  const binStart = 20 + jsonLen + 8;
  if (binStart > glb.byteLength) return null;
  const bin = new Uint8Array(glb, binStart, dv.getUint32(20 + jsonLen, true));
  if ((json.meshes ?? []).every((m) => m.primitives.every((p) => fits(json, p)))) return null;

  const extra: Uint8Array[] = [];
  let tail = bin.byteLength;
  const push = (bytes: Uint8Array, target: number) => {
    const pad = (4 - (tail % 4)) % 4;
    if (pad) extra.push(new Uint8Array(pad));
    tail += pad;
    json.bufferViews.push({ buffer: 0, byteOffset: tail, byteLength: bytes.byteLength, target });
    extra.push(bytes);
    tail += bytes.byteLength;
    return json.bufferViews.length - 1;
  };
  const elementOf = (a: Accessor) => {
    const size = COMPONENTS[a.type] * BYTES[a.componentType];
    const view = json.bufferViews[a.bufferView!];
    return { size, stride: view.byteStride || size, start: (view.byteOffset ?? 0) + (a.byteOffset ?? 0) };
  };
  const indexOf = (a: Accessor) => {
    const { start } = elementOf(a);
    const read = a.componentType === 5125 ? (i: number) => dv.getUint32(binStart + start + i * 4, true) : a.componentType === 5123 ? (i: number) => dv.getUint16(binStart + start + i * 2, true) : (i: number) => bin[start + i];
    return read;
  };

  for (const mesh of json.meshes ?? []) {
    const out: Primitive[] = [];
    for (const p of mesh.primitives) {
      if (fits(json, p) || Object.values(p.attributes).some((i) => json.accessors[i].bufferView === undefined)) {
        out.push(p);
        continue;
      }
      const vertexCount = json.accessors[p.attributes.POSITION].count;
      const triCount = Math.floor((p.indices !== undefined ? json.accessors[p.indices].count : vertexCount) / 3);
      const index = p.indices !== undefined ? indexOf(json.accessors[p.indices]) : (i: number) => i;

      // 三角形を順に詰め、頂点が 65,535 を超える手前で次の部品に分ける
      let t = 0;
      while (t < triCount) {
        const local = new Map<number, number>();
        const order: number[] = [];
        const tris: number[] = [];
        for (; t < triCount; t++) {
          const v = [index(t * 3), index(t * 3 + 1), index(t * 3 + 2)];
          const fresh = v.filter((x, k) => !local.has(x) && v.indexOf(x) === k).length;
          if (order.length + fresh > MAX_VERTS) break;
          for (const x of v) {
            if (!local.has(x)) {
              local.set(x, order.length);
              order.push(x);
            }
            tris.push(local.get(x)!);
          }
        }
        const attributes: Record<string, number> = {};
        for (const [name, ai] of Object.entries(p.attributes)) {
          const a = json.accessors[ai];
          const { size, stride, start } = elementOf(a);
          const bytes = new Uint8Array(order.length * size);
          order.forEach((x, k) => bytes.set(bin.subarray(start + x * stride, start + x * stride + size), k * size));
          const acc: Accessor = { bufferView: push(bytes, 34962), componentType: a.componentType, count: order.length, type: a.type, ...(a.normalized ? { normalized: true } : {}) };
          if (name === "POSITION") Object.assign(acc, bounds(bytes));
          json.accessors.push(acc);
          attributes[name] = json.accessors.length - 1;
        }
        json.accessors.push({ bufferView: push(new Uint8Array(new Uint16Array(tris).buffer), 34963), componentType: 5123, count: tris.length, type: "SCALAR" });
        out.push({ attributes, indices: json.accessors.length - 1, mode: 4, ...(p.material !== undefined ? { material: p.material } : {}) });
      }
    }
    mesh.primitives = out;
  }

  json.buffers[0].byteLength = tail;
  const binPad = (4 - (tail % 4)) % 4;
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4;
  const total = 12 + 8 + jsonBytes.byteLength + jsonPad + 8 + tail + binPad;
  const result = new Uint8Array(total);
  const w = new DataView(result.buffer);
  w.setUint32(0, GLB_MAGIC, true);
  w.setUint32(4, 2, true);
  w.setUint32(8, total, true);
  w.setUint32(12, jsonBytes.byteLength + jsonPad, true);
  w.setUint32(16, 0x4e4f534a, true);
  result.set(jsonBytes, 20);
  result.fill(0x20, 20 + jsonBytes.byteLength, 20 + jsonBytes.byteLength + jsonPad);
  let o = 20 + jsonBytes.byteLength + jsonPad;
  w.setUint32(o, tail + binPad, true);
  w.setUint32(o + 4, 0x004e4942, true);
  o += 8;
  result.set(bin, o);
  o += bin.byteLength;
  for (const e of extra) {
    result.set(e, o);
    o += e.byteLength;
  }
  return result.buffer;
}

function bounds(bytes: Uint8Array) {
  const f = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < f.length; i += 3)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], f[i + k]);
      max[k] = Math.max(max[k], f[i + k]);
    }
  return { min, max };
}

// 地図に渡す URL。組み直したときは blob: の URL になる（使い終わったら revoke する）
export async function mapModelUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const fixed = mapReadyGlb(await res.arrayBuffer());
    return fixed ? URL.createObjectURL(new Blob([fixed], { type: "model/gltf-binary" })) : url;
  } catch {
    return url;
  }
}
