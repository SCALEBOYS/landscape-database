"use client";

import { useState } from "react";

import { awardLabel, creditRoleLabels, findParty, similarParties, splitAward, type AwardProgramOption, type PartyOption } from "@/lib/names";

import type { ProjectPayload } from "./actions";

const box = "mt-1 rounded-md border border-line bg-white px-3 py-2 text-sm";
const input = `${box} w-full`;

type Credit = ProjectPayload["credits"][number];
type Award = ProjectPayload["awards"][number];

/** 会社名の入力。登録済みの会社から選ぶ。新しい会社は「似た名前」を見せてから登録する */
function PartyInput({ credit, parties, onChange }: { credit: Credit; parties: PartyOption[]; onChange: (c: Credit) => void }) {
  const [open, setOpen] = useState(false);
  const chosen = credit.party_id ? parties.find((x) => x.id === credit.party_id) : null;
  const typed = credit.name.trim();
  const candidates = typed ? similarParties(typed, parties, 8) : [];
  const same = !chosen && typed ? findParty(typed, parties) : null;

  if (chosen) {
    return (
      <div className="mt-1 flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm">
        <span className="truncate">{chosen.name_ja}</span>
        {chosen.name_en ? <span className="truncate text-xs text-muted">{chosen.name_en}</span> : null}
        <button type="button" className="ml-auto shrink-0 text-xs text-muted underline" onClick={() => onChange({ ...credit, party_id: "", name: chosen.name_ja })}>
          変更
        </button>
      </div>
    );
  }
  return (
    <div className="relative min-w-0 flex-1">
      <input
        className={input}
        placeholder="会社名・事務所名（入力すると候補が出ます）"
        value={credit.name}
        onChange={(e) => {
          onChange({ ...credit, name: e.target.value });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && candidates.length ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-white text-sm shadow">
          {candidates.map((x) => (
            <li key={x.id}>
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-paper" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange({ ...credit, party_id: x.id, name: x.name_ja }); setOpen(false); }}>
                {x.name_ja}
                {x.name_en ? <span className="ml-2 text-xs text-muted">{x.name_en}</span> : null}
                {x.aliases.length ? <span className="ml-2 text-xs text-muted">別名: {x.aliases.join("、")}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {typed && same ? (
        <p className="mt-1 text-xs text-accent">
          登録済みの「{same.name_ja}」と同じ会社として保存します。
          <button type="button" className="ml-1 underline" onClick={() => onChange({ ...credit, party_id: same.id, name: same.name_ja })}>選ぶ</button>
        </p>
      ) : typed ? (
        <p className="mt-1 text-xs text-[#a15c00]">
          新しい会社として登録されます。
          {candidates.length ? `似た名前: ${candidates.slice(0, 3).map((x) => `「${x.name_ja}」`).join("")}。同じ会社なら候補から選んでください。` : "正式名称（法人格は省く）で入れてください。"}
        </p>
      ) : null}
    </div>
  );
}

export function CreditsEditor({ credits, parties, onChange }: { credits: Credit[]; parties: PartyOption[]; onChange: (c: Credit[]) => void }) {
  const update = (i: number, c: Credit) => onChange(credits.map((x, j) => (j === i ? c : x)));
  return (
    <div className="text-sm">
      関係者（設計・施工・事業者）
      {credits.map((c, i) => (
        <div key={i} className="mt-1 flex items-start gap-2">
          <select className={`${box} w-36 shrink-0 sm:w-44`} value={c.role} onChange={(e) => update(i, { ...c, role: e.target.value })}>
            {Object.entries(creditRoleLabels).map(([k, v]) => (
              <option key={k} value={k}>{v.ja}</option>
            ))}
          </select>
          <PartyInput credit={c} parties={parties} onChange={(x) => update(i, x)} />
          <button type="button" className="mt-3 shrink-0 px-1 text-muted" onClick={() => onChange(credits.filter((_, j) => j !== i))}>削除</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...credits, { party_id: "", name: "", role: "landscape_design" }])} className="mt-2 text-accent">＋ 関係者を追加</button>
      <p className="mt-1 text-xs text-muted">会社名の書き換え・別名の登録・統合は「会社・設計者の名前」のページで行います。</p>
    </div>
  );
}

export function AwardsEditor({ awards, programs, onChange }: { awards: Award[]; programs: AwardProgramOption[]; onChange: (a: Award[]) => void }) {
  const update = (i: number, a: Award) => onChange(awards.map((x, j) => (j === i ? a : x)));
  return (
    <div className="text-sm">
      受賞
      {awards.map((a, i) => {
        const program = programs.find((x) => x.id === a.program_id);
        const guess = !program && a.award_name.trim() ? splitAward(a.award_name, programs) : null;
        return (
          <div key={i} className="mt-2 rounded-md border border-line p-2">
            <div className="flex flex-wrap gap-2">
              <select className={`${box} min-w-0 flex-[2_1_14rem]`} value={a.program_id} onChange={(e) => update(i, { ...a, program_id: e.target.value })}>
                <option value="">賞を選ぶ</option>
                {programs.map((x) => (
                  <option key={x.id} value={x.id}>{x.name_ja}</option>
                ))}
              </select>
              <input
                list={`prizes-${i}`}
                placeholder="賞の種類（例: 最優秀賞・知事賞）"
                className={`${box} min-w-0 flex-[2_1_14rem] disabled:bg-paper`}
                value={a.prize}
                disabled={!program}
                onChange={(e) => update(i, { ...a, prize: e.target.value })}
              />
              <datalist id={`prizes-${i}`}>{program?.prizes.map((x) => <option key={x} value={x} />)}</datalist>
              <input placeholder="年" inputMode="numeric" className={`${box} w-20`} value={a.award_year} onChange={(e) => update(i, { ...a, award_year: e.target.value })} />
              <button type="button" onClick={() => onChange(awards.filter((_, j) => j !== i))} className="px-2 text-muted">削除</button>
            </div>
            {program ? (
              <p className="mt-1 text-xs text-muted">表示: {awardLabel(program.name_ja, a.prize)}</p>
            ) : a.award_name.trim() ? (
              <p className="mt-1 text-xs text-[#a15c00]">
                もとの書き方:「{a.award_name}」。
                {guess ? (
                  <button type="button" className="underline" onClick={() => update(i, { ...a, program_id: guess.program.id, prize: guess.prize })}>
                    {awardLabel(guess.program.name_ja, guess.prize)} にする
                  </button>
                ) : (
                  "賞の一覧にありません。「賞」の管理ページで登録してから選んでください。"
                )}
              </p>
            ) : null}
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...awards, { program_id: "", prize: "", award_name: "", award_year: "" }])} className="mt-2 text-accent">＋ 受賞を追加</button>
      <p className="mt-1 text-xs text-muted">一覧にない賞は「賞」の管理ページで登録します（別名も登録できます）。</p>
    </div>
  );
}

/** AI の下書きなど自由に書かれた名前を、登録済みの会社・賞につなげる */
export function toCredits(names: string[], parties: PartyOption[]): Credit[] {
  return names.map((name) => {
    const p = findParty(name, parties);
    return { party_id: p?.id ?? "", name: p?.name_ja ?? name.trim(), role: "landscape_design" };
  });
}

export function toAwards(list: { award_name: string; award_year: string }[], programs: AwardProgramOption[]): Award[] {
  return list.map((a) => {
    const s = splitAward(a.award_name, programs);
    return { program_id: s?.program.id ?? "", prize: s?.prize ?? "", award_name: a.award_name, award_year: a.award_year };
  });
}
