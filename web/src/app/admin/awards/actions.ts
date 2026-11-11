"use server";

import { createHash } from "node:crypto";

import { updateTag } from "next/cache";

import { awardLabel, normName } from "@/lib/names";
import { requireUser } from "@/lib/supabase-server";

type Result = { ok: boolean; message: string };

async function adminClient() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  return supabase;
}

export type ProgramInput = { id: string | null; name_ja: string; name_en: string; organizer_ja: string; url: string; aliases: string; prizes: string };

const lines = (s: string) => [...new Set(s.split(/\n|、/).map((x) => x.trim()).filter(Boolean))];

export async function saveProgram(p: ProgramInput): Promise<Result> {
  const name = p.name_ja.trim();
  if (!name) return { ok: false, message: "賞の名前を入れてください" };
  if (p.url.trim() && !/^https?:\/\/\S+$/.test(p.url.trim())) return { ok: false, message: "URL の形になっていません" };
  const supabase = await adminClient();

  // 別の賞と同じ名前（別名を含む）になっていないか
  const { data: all } = await supabase.from("award_programs").select("id, name_ja, aliases");
  const mine = [name, ...lines(p.aliases)].map(normName);
  const clash = (all ?? []).find((x) => x.id !== p.id && [x.name_ja as string, ...(x.aliases as string[])].some((n) => mine.includes(normName(n))));
  if (clash) return { ok: false, message: `「${clash.name_ja}」と同じ名前（または別名）です。同じ賞なら、そちらに別名として足してください` };

  const row = {
    name_ja: name,
    name_en: p.name_en.trim() || null,
    organizer_ja: p.organizer_ja.trim() || null,
    url: p.url.trim() || null,
    aliases: lines(p.aliases),
    prizes: lines(p.prizes),
  };
  if (p.id) {
    const { error } = await supabase.from("award_programs").update(row).eq("id", p.id);
    if (error) return { ok: false, message: error.message };
    // 表示用の名前（賞 + 賞の種類）を作り直す
    const { data: used } = await supabase.from("project_awards").select("id, category").eq("program_id", p.id);
    for (const a of used ?? []) await supabase.from("project_awards").update({ award_name: awardLabel(name, a.category) }).eq("id", a.id);
  } else {
    const slug = "a-" + createHash("sha1").update(name, "utf8").digest("hex").slice(0, 8);
    const { error } = await supabase.from("award_programs").insert({ ...row, slug, sort_order: 500 });
    if (error) return { ok: false, message: error.message };
  }
  updateTag("projects");
  return { ok: true, message: "保存しました" };
}

export async function deleteProgram(id: string): Promise<Result> {
  const supabase = await adminClient();
  const { count } = await supabase.from("project_awards").select("id", { count: "exact", head: true }).eq("program_id", id);
  if (count) return { ok: false, message: `${count} 件の事例で使われているので消せません` };
  const { error } = await supabase.from("award_programs").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "消しました" };
}
