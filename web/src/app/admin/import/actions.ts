"use server";

import { createHash } from "node:crypto";

import { updateTag } from "next/cache";

import type { ImportRow } from "@/lib/import-projects";
import { requireUser } from "@/lib/supabase-server";

async function adminClient() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  return supabase;
}

// 設計の slug は既存と同じ規則（社名の sha1 先頭10桁）
const partySlug = (name: string) => "p-" + createHash("sha1").update(name, "utf8").digest("hex").slice(0, 10);
const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
const projectSlug = (r: ImportRow) => {
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug)) return r.slug;
  return slugify(r.name_en) || "k-" + createHash("sha1").update(r.name_ja, "utf8").digest("hex").slice(0, 8);
};

const PREF_CODES: Record<string, string> = { 三重県: "24", 滋賀県: "25", 京都府: "26", 大阪府: "27", 兵庫県: "28", 奈良県: "29", 和歌山県: "30" };

export type GeoHit = { lat: number; lng: number; label: string; via: "gsi" | "osm" } | null;

// 住所か名称から座標を探す。国土地理院の住所・地名検索 → 見つからなければ OpenStreetMap
export async function geocode(row: { name_ja: string; prefecture: string; municipality: string; address: string }): Promise<GeoHit> {
  await adminClient();
  // 住所はそのまま、名称は都道府県コード（市区町村コードの先頭2桁）で同名の別の場所を除く
  const pref = PREF_CODES[row.prefecture];
  const names = nameVariants(row.name_ja);
  // 地理院は地区名・川の名前にも当たるので、先頭の語だけの形（「中之島」など）は使わない
  const queries: [string, boolean][] = [[row.address, true], ...names.slice(0, -1).flatMap((n): [string, boolean][] => [[`${row.municipality}${n}`, false], [n, false]])];
  // 地理院への問い合わせはまとめて送り、優先順の早いものから採る
  const answers = await Promise.all(
    queries.map(async ([q, isAddress]) => {
      if (!q.trim()) return null;
      try {
        const res = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(6000) });
        const hits = (await res.json()) as { geometry: { coordinates: [number, number] }; properties: { title: string; addressCode?: string } }[];
        return (isAddress ? hits[0] : hits.find((h) => !pref || h.properties.addressCode?.startsWith(pref))) ?? null;
      } catch {
        return null;
      }
    }),
  );
  const gsi = answers.find(Boolean);
  if (gsi) {
    const [lng, lat] = gsi.geometry.coordinates;
    return { lat, lng, label: gsi.properties.title, via: "gsi" };
  }
  // OpenStreetMap は3回まで: 元の名称、言葉を外した名称、先頭の語だけ
  const osm = [...new Set([names[0], names[1], names[names.length - 1]].filter(Boolean))];
  for (const [i, n] of osm.entries()) {
    // OpenStreetMap は1秒に1回までの約束なので間をあける
    if (i) await new Promise((r) => setTimeout(r, 1100));
    const hit = await nominatim([n, row.municipality.split("・")[0], row.prefecture].filter(Boolean).join(" "));
    if (hit) return hit;
  }
  return null;
}

// 事例名には「再整備」などの言葉や括弧書きが付いていて、地図の地名と一致しないことが多い。外した形でも探す
function nameVariants(name: string) {
  const inParens = [...name.matchAll(/[（(「]([^）)」]+)[）)」]/g)].map((m) => m[1]);
  const base = name.replace(/[（(「][^）)」]*[）)」]/g, " ").trim();
  const trimmed = base.replace(/\s*(再整備|リニューアル|リノベーション|整備|再生|改修)$/, "").trim();
  const head = trimmed.split(/\s+/)[0];
  // 最後の要素は先頭の語だけの形（OpenStreetMap でだけ使う）
  const out = [...new Set([name, trimmed, ...inParens].map((x) => x.trim()).filter((x) => x.length >= 2))];
  return [...out, head && !out.includes(head) ? head : out[out.length - 1]];
}

async function nominatim(q: string): Promise<GeoHit> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=jp&q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "LandscapeDatabase/1.0 (https://landscapedatabase.com)" },
      signal: AbortSignal.timeout(6000),
    });
    const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    if (hit) return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name, via: "osm" };
  } catch {
    // 見つからなかった
  }
  return null;
}

export type ImportResult = { line: number; ok: boolean; message: string; id?: string };

// 事例を非公開の下書きとして入れる。同じ名称の事例がすでにあれば入れない
export async function importProjects(rows: ImportRow[]): Promise<ImportResult[]> {
  const supabase = await adminClient();
  const { data: existing } = await supabase.from("projects").select("name_ja, slug");
  const names = new Set((existing ?? []).map((p) => p.name_ja));
  const slugs = new Set((existing ?? []).map((p) => p.slug));
  const results: ImportResult[] = [];

  for (const r of rows) {
    if (r.errors.length) {
      results.push({ line: r.line, ok: false, message: r.errors.join("、") });
      continue;
    }
    if (names.has(r.name_ja)) {
      results.push({ line: r.line, ok: false, message: "同じ名称の事例がすでにあります" });
      continue;
    }
    let slug = projectSlug(r);
    for (let n = 2; slugs.has(slug); n++) slug = `${projectSlug(r)}-${n}`;

    const { data, error } = await supabase
      .from("projects")
      .insert({
        slug,
        name_ja: r.name_ja,
        name_en: r.name_en || null,
        use_category: r.use_category,
        other_uses: r.other_uses,
        prefecture: r.prefecture,
        municipality: r.municipality || null,
        address_ja: r.address || null,
        location: r.lat !== null && r.lng !== null ? `SRID=4326;POINT(${r.lng} ${r.lat})` : null,
        completed_year: r.completed_year,
        completed_on: r.completed_on,
        completed_precision: r.completed_precision,
        site_area_m2: r.site_area_m2,
        summary_ja: r.summary_ja || null,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) {
      results.push({ line: r.line, ok: false, message: error.message });
      continue;
    }
    const id = data.id as string;
    names.add(r.name_ja);
    slugs.add(slug);

    const designers = [...new Set(r.designers)];
    if (designers.length) {
      const { data: parties, error: e1 } = await supabase
        .from("parties")
        .upsert(designers.map((name) => ({ slug: partySlug(name), name_ja: name })), { onConflict: "slug" })
        .select("id, slug");
      if (!e1 && parties) {
        const bySlug = new Map(parties.map((x) => [x.slug, x.id]));
        await supabase.from("project_credits").insert(designers.map((name, i) => ({ project_id: id, party_id: bySlug.get(partySlug(name)), role: "landscape_design", sort_order: i })));
      }
    }
    if (r.awards.length) await supabase.from("project_awards").insert(r.awards.map((a) => ({ project_id: id, award_name: a.name, award_year: a.year })));
    const urls = [...new Set(r.sources)];
    if (urls.length) await supabase.from("sources").insert(urls.map((url) => ({ project_id: id, url, kind: r.awards.length ? "award" : "other" })));
    results.push({ line: r.line, ok: true, message: "下書きで取り込みました", id });
  }
  updateTag("projects");
  return results;
}
