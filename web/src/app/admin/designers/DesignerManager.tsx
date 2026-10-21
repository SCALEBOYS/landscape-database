"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { addAlias, mergeParty, removeAlias, renameParty } from "./actions";

export type PartyRow = { id: string; slug: string; name_ja: string; name_en: string; aliases: { id: string; alias: string; note: string | null }[]; projects: string[] };

const input = "rounded-md border border-line px-2 py-1 text-sm";

// 名前の似ているものを並べて見つけやすくする（空白・記号・カナ表記の違いを無視した形で比べる）
const squash = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s・･\-‐（）()株式会社]/g, "");

export function DesignerManager({ rows }: { rows: PartyRow[] }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const k = squash(q);
    return rows.filter((r) => !k || squash([r.name_ja, r.name_en, ...r.aliases.map((a) => a.alias)].join(" ")).includes(k));
  }, [rows, q]);
  return (
    <div className="grid gap-4 text-sm">
      <div className="flex items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="名前で絞り込む" className={`${input} w-72`} />
        <span className="text-muted">{list.length} / {rows.length}</span>
      </div>
      <ul className="divide-y divide-line rounded-md border border-line bg-white">
        {list.map((r) => <Row key={r.id} r={r} others={rows.filter((x) => x.id !== r.id)} />)}
      </ul>
    </div>
  );
}

function Row({ r, others }: { r: PartyRow; others: PartyRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [name, setName] = useState(r.name_ja);
  const [nameEn, setNameEn] = useState(r.name_en);
  const [alias, setAlias] = useState("");
  const [into, setInto] = useState("");
  const [confirm, setConfirm] = useState(false);
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg(res.message);
      if (res.ok) {
        setAlias("");
        setConfirm(false);
        router.refresh();
      }
    });
  const target = others.find((o) => o.id === into);

  return (
    <li className="grid gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-64 font-medium`} />
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="英語名" className={`${input} w-48`} />
        {(name !== r.name_ja || nameEn !== r.name_en) && (
          <button type="button" disabled={pending} onClick={() => run(() => renameParty(r.id, name, nameEn))} className="rounded bg-ink px-2 py-1 text-xs text-white">名前を保存</button>
        )}
        <span className="text-xs text-muted">事例 {r.projects.length}: {r.projects.slice(0, 3).join("、")}{r.projects.length > 3 ? " ほか" : ""}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted">別名</span>
        {r.aliases.map((a) => (
          <span key={a.id} title={a.note ?? undefined} className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs">
            {a.alias}
            <button type="button" disabled={pending} onClick={() => run(() => removeAlias(a.id))} aria-label={`${a.alias} を外す`} className="text-muted hover:text-red-700">×</button>
          </span>
        ))}
        <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="別名を足す" className={`${input} w-40 text-xs`} />
        {alias.trim() && <button type="button" disabled={pending} onClick={() => run(() => addAlias(r.id, alias, ""))} className="text-xs text-accent">足す</button>}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">まとめる</span>
        <select value={into} onChange={(e) => { setInto(e.target.value); setConfirm(false); }} className={`${input} text-xs`}>
          <option value="">まとめ先を選ぶ</option>
          {others.map((o) => <option key={o.id} value={o.id}>{o.name_ja}（事例 {o.projects.length}）</option>)}
        </select>
        {target &&
          (confirm ? (
            <span className="flex items-center gap-2">
              <span>「{r.name_ja}」を「{target.name_ja}」にまとめ、この名前は別名として残します。</span>
              <button type="button" disabled={pending} onClick={() => run(() => mergeParty(r.id, target.id, ""))} className="rounded bg-red-700 px-2 py-1 text-white">まとめる</button>
              <button type="button" onClick={() => setConfirm(false)} className="text-muted">やめる</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="text-accent">この相手にまとめる…</button>
          ))}
        {msg && <span className={msg.includes("しました") || msg.includes("足しました") || msg.includes("外しました") ? "text-accent" : "text-red-700"}>{msg}</span>}
      </div>
    </li>
  );
}
