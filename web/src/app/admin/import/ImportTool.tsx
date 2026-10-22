"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { parseTable, TEMPLATE_EXAMPLE, TEMPLATE_HEADERS, toCsv, toImportRows, type ImportRow } from "@/lib/import-projects";
import { categoryLabels } from "@/lib/i18n";

import { geocode, importProjects, type GeoHit, type ImportResult } from "./actions";

type Row = ImportRow & { pick: boolean; geo?: GeoHit | "searching" | "none"; result?: ImportResult };

export function ImportTool() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();

  const read = (src: string) => {
    const { rows: parsed, unknownColumns } = toImportRows(parseTable(src));
    setRows(parsed.map((r) => ({ ...r, pick: !r.errors.length })));
    setUnknown(unknownColumns);
    setStatus(parsed.length ? `${parsed.length} 行を読み込みました` : "読み込める行がありません。1行目に列名があるか確かめてください");
  };
  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const template = () => {
    const csv = toCsv([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "landscape-database-import.csv";
    a.click();
  };

  // 座標がない行を、住所か名称から順に探す（外部の検索サービスに1件ずつ問い合わせる）
  const findCoordinates = () =>
    start(async () => {
      const targets = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.pick && r.lat === null);
      for (const [n, { r, i }] of targets.entries()) {
        setStatus(`座標を探しています（${n + 1}/${targets.length}）…`);
        update(i, { geo: "searching" });
        const hit = await geocode({ name_ja: r.name_ja, prefecture: r.prefecture, municipality: r.municipality, address: r.address });
        update(i, hit ? { geo: hit, lat: hit.lat, lng: hit.lng } : { geo: "none" });
      }
      setStatus("座標の検索が終わりました。地図のリンクで位置を確かめられます");
    });

  const run = () =>
    start(async () => {
      const picked = rows.filter((r) => r.pick && !r.result?.ok);
      // 1回の通信が時間の上限を超えないよう、5件ずつ送る
      const results: ImportResult[] = [];
      for (let i = 0; i < picked.length; i += 5) {
        setStatus(`取り込んでいます（${Math.min(i + 5, picked.length)}/${picked.length}）…`);
        const part = await importProjects(picked.slice(i, i + 5));
        results.push(...part);
        setRows((rs) => rs.map((r) => ({ ...r, result: part.find((x) => x.line === r.line) ?? r.result })));
      }
      const ok = results.filter((x) => x.ok).length;
      setStatus(`${ok} 件を下書きで取り込みました${results.length - ok ? `（${results.length - ok} 件は取り込めませんでした）` : ""}`);
    });

  const picked = rows.filter((r) => r.pick && !r.result?.ok);

  return (
    <div className="grid gap-6">
      <section className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-white p-5 text-sm">
        <h2 className="mr-2 font-medium">CSV ファイル</h2>
        <button type="button" onClick={template} className="rounded-md bg-accent px-4 py-2 text-white">取り込み用のひな形をダウンロード</button>
        {/* ファイルのダウンロードなので、ページ移動の Link ではなく通常のリンクにする */}
        <a href="/admin/export" download className="rounded-md border border-ink px-4 py-2 hover:bg-ink hover:text-white">登録済みの事例を書き出す</a>
        <p className="w-full text-xs text-muted">ひな形は 1 行目が列名、2 行目が記入例です。書き出しは下書きも含めた全事例を、ひな形と同じ列の並びに、樹種・素材・写真の枚数などの確認用の列を足して出します。Excel・Google スプレッドシートで開けます。</p>
      </section>
      <section className="grid gap-3 rounded-md border border-line bg-white p-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">1. 表を貼り付ける</h2>
        </div>
        <p className="text-xs text-muted">
          使える列: {TEMPLATE_HEADERS.join("・")}。名称・用途・都道府県は必須です。用途は「公園」「広場」などの言葉でかまいません。設計・受賞は「／」で区切ると複数入れられます。
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="ここにスプレッドシートのセルを貼り付け" className="w-full rounded-md border border-line p-3 font-mono text-xs" />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!text.trim()} onClick={() => read(text)} className="rounded-md bg-ink px-4 py-2 text-white disabled:opacity-40">貼り付けた表を読み込む</button>
          <label className="cursor-pointer text-accent hover:underline">
            CSV ファイルを選ぶ
            <input
              type="file"
              accept=".csv,.tsv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) read(await f.text());
              }}
            />
          </label>
        </div>
        {unknown.length > 0 && <p className="text-xs text-amber-800">使わない列: {unknown.join("、")}</p>}
      </section>

      {rows.length > 0 && (
        <section className="grid gap-3 rounded-md border border-line bg-white p-5 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto font-medium">2. 確かめて取り込む</h2>
            <button type="button" disabled={pending || !picked.some((r) => r.lat === null)} onClick={findCoordinates} className="rounded-md border border-ink px-3 py-1.5 disabled:opacity-40">
              座標を自動で探す
            </button>
            <button type="button" disabled={pending || !picked.length} onClick={run} className="rounded-md bg-accent px-4 py-1.5 text-white disabled:opacity-40">
              選んだ {picked.length} 件を下書きで取り込む
            </button>
          </div>
          {status && <p className="text-muted">{status}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="w-8 py-2" />
                  <th className="py-2">行</th>
                  <th>名称</th>
                  <th>用途</th>
                  <th>場所</th>
                  <th>設計</th>
                  <th>受賞</th>
                  <th>座標</th>
                  <th>結果</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r, i) => (
                  <tr key={r.line} className={r.errors.length ? "bg-red-50" : r.result?.ok ? "bg-accent/5" : ""}>
                    <td className="py-2">
                      <input type="checkbox" checked={r.pick} disabled={!!r.errors.length || !!r.result?.ok} onChange={(e) => update(i, { pick: e.target.checked })} />
                    </td>
                    <td className="num text-muted">{r.line}</td>
                    <td className="max-w-[220px] font-medium">{r.name_ja || "—"}</td>
                    <td>{categoryLabels[r.use_category]?.ja ?? "—"}</td>
                    <td>{[r.prefecture, r.municipality].filter(Boolean).join(" ")}</td>
                    <td className="max-w-[180px] truncate" title={r.designers.join("／")}>{r.designers.join("／") || "—"}</td>
                    <td className="max-w-[160px] truncate" title={r.awards.map((a) => a.name).join("／")}>{r.awards.length ? `${r.awards.length}件` : "—"}</td>
                    <td className="whitespace-nowrap">
                      {r.geo === "searching" ? (
                        <span className="text-muted">探しています…</span>
                      ) : r.geo === "none" ? (
                        <span className="text-amber-800">見つからず</span>
                      ) : r.lat !== null && r.lng !== null ? (
                        <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline" title={r.geo ? r.geo.label : undefined}>
                          {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                          {r.geo && <span className="ml-1 text-muted">（{r.geo.via === "gsi" ? "地理院" : "OSM"}）</span>}
                        </a>
                      ) : (
                        <span className="text-muted">なし</span>
                      )}
                    </td>
                    <td className="max-w-[200px]">
                      {r.errors.length ? (
                        <span className="text-red-700">{r.errors.join("、")}</span>
                      ) : r.result ? (
                        r.result.ok && r.result.id ? (
                          <Link href={`/admin/projects/${r.result.id}`} className="text-accent hover:underline">{r.result.message}</Link>
                        ) : (
                          <span className={r.result.ok ? "text-accent" : "text-red-700"}>{r.result.message}</span>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            座標は自動で探した目安です。公開する前に、各事例の画面の地図で位置を確かめてください。同じ名称の事例がすでにある行は取り込みません。
          </p>
        </section>
      )}
    </div>
  );
}
