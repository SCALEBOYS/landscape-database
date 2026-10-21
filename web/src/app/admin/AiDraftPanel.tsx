"use client";

import { useState, useTransition } from "react";

import { layerLabels } from "@/lib/i18n";

import type { ProjectPayload } from "./actions";
import { draftFromSource, type DraftData } from "./ai-actions";

type Master = { id: string; label: string };
type Key = "name_en" | "municipality" | "address_ja" | "completed_year" | "site_area_m2" | "designers" | "awards" | "summary_ja" | "summary_en" | "plantings" | "components";

const LABELS: Record<Key, string> = {
  name_en: "名称（英語）",
  municipality: "市区町村",
  address_ja: "住所",
  completed_year: "竣工年",
  site_area_m2: "敷地面積",
  designers: "設計",
  awards: "受賞",
  summary_ja: "説明文（日本語）",
  summary_en: "説明文（英語）",
  plantings: "植栽",
  components: "構成要素",
};

// 出典の URL から AI が入力欄の下書きを作る。項目を選んで反映し、確かめてから保存する
export function AiDraftPanel({ p, apply, species, categories }: { p: ProjectPayload; apply: (patch: Partial<ProjectPayload>) => void; species: Master[]; categories: Master[] }) {
  const [url, setUrl] = useState(p.sources.find((s) => s.trim()) ?? "");
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Set<Key>>(new Set());

  const name = (list: Master[], id: string) => list.find((x) => x.id === id)?.label ?? id;
  // 下書きの値を、入力欄の形にそろえる（空のものは出さない）
  const values = (d: DraftData): Partial<Record<Key, { show: string; patch: Partial<ProjectPayload> }>> => {
    const v: Partial<Record<Key, { show: string; patch: Partial<ProjectPayload> }>> = {};
    if (d.name_en) v.name_en = { show: d.name_en, patch: { name_en: d.name_en } };
    if (d.municipality) v.municipality = { show: d.municipality, patch: { municipality: d.municipality } };
    if (d.address_ja) v.address_ja = { show: d.address_ja, patch: { address_ja: d.address_ja } };
    if (d.completed_year) v.completed_year = { show: String(d.completed_year), patch: { completed_year: String(d.completed_year) } };
    if (d.site_area_m2) v.site_area_m2 = { show: `${d.site_area_m2} m²`, patch: { site_area_m2: String(d.site_area_m2) } };
    if (d.designers.length) v.designers = { show: d.designers.join("、"), patch: { designers: d.designers } };
    if (d.awards.length)
      v.awards = { show: d.awards.map((a) => `${a.award_name}${a.award_year ? `（${a.award_year}）` : ""}`).join("、"), patch: { awards: d.awards.map((a) => ({ award_name: a.award_name, award_year: a.award_year ? String(a.award_year) : "" })) } };
    if (d.summary_ja) v.summary_ja = { show: d.summary_ja, patch: { summary_ja: d.summary_ja } };
    if (d.summary_en) v.summary_en = { show: d.summary_en, patch: { summary_en: d.summary_en, summary_en_status: "machine_draft" } };
    if (d.plantings.length)
      v.plantings = { show: d.plantings.map((x) => `${name(species, x.species_id)}（${layerLabels[x.layer]?.ja}）`).join("、"), patch: { plantings: d.plantings } };
    if (d.component_ids.length)
      v.components = { show: d.component_ids.map((id) => name(categories, id)).join("、"), patch: { components: d.component_ids.map((category_id) => ({ category_id, product_name: "", maker_name: "" })) } };
    return v;
  };

  // 今の入力が空の項目だけを、はじめから選んでおく
  const isEmpty = (k: Key) => {
    const cur = k === "components" ? p.components : k === "plantings" ? p.plantings : k === "awards" ? p.awards : k === "designers" ? p.designers.filter((x) => x.trim()) : String(p[k] ?? "").trim();
    return Array.isArray(cur) ? cur.length === 0 : cur === "";
  };

  const run = () =>
    start(async () => {
      setError("");
      setDraft(null);
      const r = await draftFromSource(url, p.name_ja, species, categories);
      if (!r.ok) return setError(r.message);
      setDraft(r.draft);
      setPicked(new Set((Object.keys(values(r.draft)) as Key[]).filter(isEmpty)));
    });

  const v = draft ? values(draft) : {};
  const keys = Object.keys(v) as Key[];

  return (
    <section className="rounded-md border border-accent/40 bg-accent/5 p-5">
      <h2 className="mb-1 font-medium">✦ 出典から AI で下書き</h2>
      <p className="mb-3 text-xs text-muted">出典のページ（HTML・PDF）を AI が読み、入力欄の下書きを作ります。反映しても保存はされません。内容を確かめてから「保存」してください。</p>
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          // 事例のフォームの中にあるので、Enter で保存されないようにする
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (url.trim() && !pending) run(); } }} placeholder="https://…（出典の URL）" className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm" />
        <button type="button" disabled={pending || !url.trim()} onClick={run} className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50">
          {pending ? "読んでいます…（1分ほど）" : "下書きを作る"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {draft && (
        <div className="mt-4 grid gap-2 text-sm">
          {keys.length === 0 && <p className="text-muted">出典から読み取れる項目がありませんでした。</p>}
          {keys.map((k) => (
            <label key={k} className="grid cursor-pointer grid-cols-[20px_110px_1fr] items-start gap-2 rounded-md bg-white p-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={picked.has(k)}
                onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
              />
              <span className="text-muted">{LABELS[k]}{!isEmpty(k) && <span className="block text-[11px] text-amber-700">入力済みを置き換え</span>}</span>
              <span className="whitespace-pre-wrap">{v[k]!.show}</span>
            </label>
          ))}
          {draft.unknown_species.length > 0 && <p className="text-xs text-muted">樹種マスタにない樹種: {draft.unknown_species.join("、")}</p>}
          {draft.caution && <p className="text-xs text-amber-700">確かめたい点: {draft.caution}</p>}
          {keys.length > 0 && (
            <button
              type="button"
              disabled={picked.size === 0}
              onClick={() => {
                apply(Object.assign({}, ...keys.filter((k) => picked.has(k)).map((k) => v[k]!.patch)));
                setDraft(null);
              }}
              className="justify-self-start rounded-md bg-ink px-4 py-2 text-white disabled:opacity-40"
            >
              選んだ {picked.size} 項目を入力欄に反映
            </button>
          )}
        </div>
      )}
    </section>
  );
}
