"use client";

import { useActionState, useState } from "react";

import { categoryLabels, componentKindLabels, layerLabels } from "@/lib/i18n";

import { saveProject, type ProjectPayload } from "./actions";
import { AiDraftPanel } from "./AiDraftPanel";

type Species = { id: string; name_ja: string; scientific_name: string };
type Category = { id: string; kind: string; name_ja: string };
type Parent = { id: string; name_ja: string };
type Law = { id: string; kind: string; name_ja: string; jurisdiction_ja: string };

const LAW_KINDS: [string, string][] = [["law", "法律"], ["system", "制度"], ["ordinance", "条例"]];

const PREFECTURES = ["大阪府", "兵庫県", "京都府", "滋賀県", "奈良県", "和歌山県"];
const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm";
const section = "rounded-md border border-line bg-white p-5";

export function ProjectForm({
  initial,
  species,
  categories,
  parents,
  laws,
}: {
  initial: ProjectPayload;
  species: Species[];
  categories: Category[];
  parents: Parent[];
  laws: Law[];
}) {
  const [p, setP] = useState(initial);
  const [result, action, pending] = useActionState(saveProject, null);
  const [formKey, setFormKey] = useState(0);
  const set = <K extends keyof ProjectPayload>(key: K, value: ProjectPayload[K]) => setP((x) => ({ ...x, [key]: value }));
  const field = (key: keyof ProjectPayload) => ({
    value: p[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value as never),
  });
  const note = (key: keyof ProjectPayload["notes"]) => ({
    value: p.notes[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set("notes", { ...p.notes, [key]: e.target.value }),
  });
  const speciesByLabel = new Map(species.map((sp) => [`${sp.name_ja}（${sp.scientific_name}）`, sp.id]));
  const speciesLabel = (id: string) => {
    const sp = species.find((x) => x.id === id);
    return sp ? `${sp.name_ja}（${sp.scientific_name}）` : "";
  };

  return (
    <form
      action={action}
      className="space-y-6"
      // 必須の欄は「基本情報」タブにある。別のタブで保存して入力漏れがあったら、そのタブを開く
      onInvalidCapture={() => {
        window.location.hash = "basic";
      }}
    >
      <input type="hidden" name="payload" value={JSON.stringify(p)} />

      <div data-tab="basic text">
      <AiDraftPanel
        key={formKey}
        p={p}
        apply={(patch) => {
          setP((x) => ({ ...x, ...patch }));
          // 植栽の入力欄は初期値で表示しているので、反映後に作り直す
          setFormKey((k) => k + 1);
        }}
        species={species.map((sp) => ({ id: sp.id, label: `${sp.name_ja}（${sp.scientific_name}）` }))}
        categories={categories.map((c) => ({ id: c.id, label: c.name_ja }))}
      />
      </div>

      <section data-tab="basic" className={section}>
        <h2 className="mb-4 font-medium">基本情報</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">名称（日本語）*<input required className={input} {...field("name_ja")} /></label>
          <label className="text-sm">名称（英語）<input className={input} {...field("name_en")} /></label>
          <label className="text-sm">
            slug（URL）*<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="例: higashi-yuenchi" className={input} {...field("slug")} />
          </label>
          <label className="text-sm">
            用途*
            <select className={input} {...field("use_category")}>
              {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v.ja}</option>)}
            </select>
          </label>
          <label className="text-sm">
            親物件（再開発の中の広場など）
            <select className={input} value={p.parent_id ?? ""} onChange={(e) => set("parent_id", e.target.value || null)}>
              <option value="">なし</option>
              {parents.map((x) => <option key={x.id} value={x.id}>{x.name_ja}</option>)}
            </select>
          </label>
          <label className="text-sm">
            公開状態
            <select className={input} {...field("status")}>
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
          </label>
          <label className="text-sm">
            都道府県*
            <input required list="prefectures" className={input} {...field("prefecture")} />
            <datalist id="prefectures">{PREFECTURES.map((x) => <option key={x} value={x} />)}</datalist>
          </label>
          <label className="text-sm">市区町村<input className={input} {...field("municipality")} /></label>
          <label className="text-sm sm:col-span-2">住所<input className={input} {...field("address_ja")} /></label>
          <label className="text-sm">緯度<input inputMode="decimal" placeholder="34.6895" className={input} {...field("lat")} /></label>
          <label className="text-sm">経度<input inputMode="decimal" placeholder="135.1960" className={input} {...field("lng")} /></label>
          <label className="text-sm">竣工年<input inputMode="numeric" className={input} {...field("completed_year")} /></label>
          <label className="text-sm">竣工の補足（段階竣工など）<input className={input} {...field("completion_note")} /></label>
          <label className="text-sm">敷地面積（m²）<input inputMode="decimal" className={input} {...field("site_area_m2")} /></label>
        </div>
      </section>

      <section data-tab="text" className={section}>
        <h2 className="mb-4 font-medium">説明文</h2>
        <label className="block text-sm">日本語（公開情報の要約。自分の文章で）<textarea rows={4} className={input} {...field("summary_ja")} /></label>
        <label className="mt-4 block text-sm">英語<textarea rows={4} className={input} {...field("summary_en")} /></label>
        <label className="mt-4 block text-sm">
          英語の状態（「確認済み」になるまで英語ページに本文は出ません）
          <select className={input} {...field("summary_en_status")}>
            <option value="none">未作成</option>
            <option value="machine_draft">機械翻訳の下書き</option>
            <option value="reviewed">確認済み</option>
          </select>
        </label>
      </section>

      <section data-tab="credits" className={section}>
        <h2 className="mb-4 font-medium">設計・受賞・出典</h2>
        <label className="block text-sm">
          設計（1行に1社）
          <textarea rows={4} className={input} value={p.designers.join("\n")} onChange={(e) => set("designers", e.target.value.split("\n"))} />
        </label>
        <div className="mt-4 text-sm">
          受賞
          {p.awards.map((a, i) => (
            <div key={i} className="mt-1 flex gap-2">
              <input placeholder="賞の名称" className={input} value={a.award_name} onChange={(e) => set("awards", p.awards.map((x, j) => (j === i ? { ...x, award_name: e.target.value } : x)))} />
              <input placeholder="年" inputMode="numeric" className={`${input} w-24`} value={a.award_year} onChange={(e) => set("awards", p.awards.map((x, j) => (j === i ? { ...x, award_year: e.target.value } : x)))} />
              <button type="button" onClick={() => set("awards", p.awards.filter((_, j) => j !== i))} className="px-2 text-muted">削除</button>
            </div>
          ))}
          <button type="button" onClick={() => set("awards", [...p.awards, { award_name: "", award_year: "" }])} className="mt-2 text-accent">＋ 受賞を追加</button>
        </div>
        <label className="mt-4 block text-sm">
          出典URL（1行に1つ）
          <textarea rows={3} className={input} value={p.sources.join("\n")} onChange={(e) => set("sources", e.target.value.split("\n"))} />
        </label>
      </section>

      <section data-tab="plants" className={section}>
        <h2 className="mb-4 font-medium">植栽</h2>
        <datalist id="species">{species.map((sp) => <option key={sp.id} value={`${sp.name_ja}（${sp.scientific_name}）`} />)}</datalist>
        {p.plantings.map((pl, i) => (
          <div key={`${formKey}-${i}`} className="mt-1 flex gap-2 text-sm">
            <select className={`${input} w-32`} value={pl.layer} onChange={(e) => set("plantings", p.plantings.map((x, j) => (j === i ? { ...x, layer: e.target.value } : x)))}>
              {Object.entries(layerLabels).map(([k, v]) => <option key={k} value={k}>{v.ja}</option>)}
            </select>
            <input
              list="species"
              placeholder="樹種名で検索"
              className={input}
              defaultValue={speciesLabel(pl.species_id)}
              onChange={(e) => set("plantings", p.plantings.map((x, j) => (j === i ? { ...x, species_id: speciesByLabel.get(e.target.value) ?? "" } : x)))}
            />
            <button type="button" onClick={() => set("plantings", p.plantings.filter((_, j) => j !== i))} className="px-2 text-muted">削除</button>
          </div>
        ))}
        <button type="button" onClick={() => set("plantings", [...p.plantings, { species_id: "", layer: "tall_tree" }])} className="mt-2 text-sm text-accent">＋ 樹種を追加</button>
        <p className="mt-2 text-xs text-muted">候補にない樹種は、樹種マスタへの追加が必要です（scripts/build_species_seed.py）。</p>
      </section>

      <section data-tab="plants" className={section}>
        <h2 className="mb-4 font-medium">構成要素（舗装・ファニチャー・照明など）</h2>
        {p.components.map((c, i) => (
          <div key={i} className="mt-1 grid gap-2 text-sm sm:grid-cols-[1.3fr_1fr_1fr_auto]">
            <select className={input} value={c.category_id} onChange={(e) => set("components", p.components.map((x, j) => (j === i ? { ...x, category_id: e.target.value } : x)))}>
              <option value="">分類を選ぶ</option>
              {Object.entries(componentKindLabels).map(([kind, label]) => (
                <optgroup key={kind} label={label.ja}>
                  {categories.filter((x) => x.kind === kind).map((x) => <option key={x.id} value={x.id}>{x.name_ja}</option>)}
                </optgroup>
              ))}
            </select>
            <input placeholder="製品名（任意）" className={input} value={c.product_name} onChange={(e) => set("components", p.components.map((x, j) => (j === i ? { ...x, product_name: e.target.value } : x)))} />
            <input placeholder="メーカー（任意）" className={input} value={c.maker_name} onChange={(e) => set("components", p.components.map((x, j) => (j === i ? { ...x, maker_name: e.target.value } : x)))} />
            <button type="button" onClick={() => set("components", p.components.filter((_, j) => j !== i))} className="px-2 text-muted">削除</button>
          </div>
        ))}
        <button type="button" onClick={() => set("components", [...p.components, { category_id: "", product_name: "", maker_name: "" }])} className="mt-2 text-sm text-accent">＋ 構成要素を追加</button>
      </section>

      <section data-tab="laws" className={section}>
        <h2 className="mb-1 font-medium">関係する法令</h2>
        <p className="mb-4 text-xs text-muted">法律・制度・条例のどれが、どう使われたかと、その根拠の資料を記録します。公開ページの「関係する法令」と、法令ごとのページに出ます。</p>
        {p.laws.map((x, i) => {
          const edit = (patch: Partial<ProjectPayload["laws"][number]>) => set("laws", p.laws.map((y, j) => (j === i ? { ...y, ...patch } : y)));
          return (
            <div key={i} className="mt-3 grid gap-2 rounded-md border border-line p-3 text-sm sm:grid-cols-[1fr_1.4fr_auto]">
              <select className={input} value={x.law_id} onChange={(e) => edit({ law_id: e.target.value })}>
                <option value="">法令を選ぶ</option>
                {LAW_KINDS.map(([kind, label]) => (
                  <optgroup key={kind} label={label}>
                    {laws.filter((l) => l.kind === kind).map((l) => (
                      <option key={l.id} value={l.id}>{l.name_ja}{kind === "ordinance" ? `（${l.jurisdiction_ja}）` : ""}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input placeholder="どう使われたか（例: 公開空地を設けて容積率を緩和）" className={input} value={x.note_ja} onChange={(e) => edit({ note_ja: e.target.value })} />
              <button type="button" onClick={() => set("laws", p.laws.filter((_, j) => j !== i))} className="px-2 text-muted">削除</button>
              <input placeholder="出典URL（その根拠となる公開資料）" className={`${input} sm:col-span-2`} value={x.source_url} onChange={(e) => edit({ source_url: e.target.value })} />
            </div>
          );
        })}
        <button type="button" onClick={() => set("laws", [...p.laws, { law_id: "", note_ja: "", source_url: "" }])} className="mt-2 text-sm text-accent">＋ 法令を追加</button>
      </section>

      <section data-tab="memo" className={`${section} border-amber-300 bg-amber-50/40`}>
        <h2 className="mb-1 font-medium">非公開メモ</h2>
        <p className="mb-4 text-xs text-muted">管理者だけが読めます。公開サイトには出ません。</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">所感<textarea rows={3} className={input} {...note("impressions")} /></label>
          <label className="text-sm">
            評価
            <select className={input} {...note("rating")}>
              <option value="">未評価</option>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
            </select>
          </label>
          <label className="text-sm">コストの所感<input className={input} {...note("cost_notes")} /></label>
          <label className="text-sm sm:col-span-2">設計に使えるディテール<textarea rows={3} className={input} {...note("detail_notes")} /></label>
          <label className="text-sm sm:col-span-2">撮影許可・アクセスなど<textarea rows={2} className={input} {...note("visit_notes")} /></label>
        </div>
      </section>

      <div data-tab="basic text credits plants laws memo" className="sticky bottom-0 z-10 flex items-center gap-4 border-t border-line bg-white/95 py-3">
        <button type="submit" disabled={pending} className="rounded-md bg-accent px-6 py-2 text-white disabled:opacity-50">
          {pending ? "保存中…" : "保存"}
        </button>
        {result && <span className={`text-sm ${result.ok ? "text-accent" : "text-red-700"}`}>{result.message}</span>}
      </div>
    </form>
  );
}
