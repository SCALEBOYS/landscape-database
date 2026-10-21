"use server";

import { updateTag } from "next/cache";

import { requireUser } from "@/lib/supabase-server";

async function adminClient() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  return supabase;
}

export type Result = { ok: boolean; message: string };

export async function renameParty(id: string, name_ja: string, name_en: string): Promise<Result> {
  if (!name_ja.trim()) return { ok: false, message: "名前を入れてください" };
  const supabase = await adminClient();
  const { error } = await supabase.from("parties").update({ name_ja: name_ja.trim(), name_en: name_en.trim() || null }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  updateTag("projects");
  return { ok: true, message: "保存しました" };
}

export async function addAlias(partyId: string, alias: string, note: string): Promise<Result> {
  if (!alias.trim()) return { ok: false, message: "別名を入れてください" };
  const supabase = await adminClient();
  const { error } = await supabase.from("party_aliases").insert({ party_id: partyId, alias: alias.trim(), note: note.trim() || null });
  if (error) return { ok: false, message: error.message.includes("duplicate") ? "その別名はもうあります" : error.message };
  updateTag("projects");
  return { ok: true, message: "別名を足しました" };
}

export async function removeAlias(id: string): Promise<Result> {
  const supabase = await adminClient();
  const { error } = await supabase.from("party_aliases").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  updateTag("projects");
  return { ok: true, message: "外しました" };
}

// from を into にまとめる: 事例のつながりを移し、from の名前と別名を into の別名にして from を消す
export async function mergeParty(fromId: string, intoId: string, note: string): Promise<Result> {
  if (fromId === intoId) return { ok: false, message: "同じ相手にはまとめられません" };
  const supabase = await adminClient();
  const [{ data: from }, { data: credits }, { data: intoCredits }, { data: aliases }] = await Promise.all([
    supabase.from("parties").select("name_ja, name_en").eq("id", fromId).single(),
    supabase.from("project_credits").select("id, project_id, role").eq("party_id", fromId),
    supabase.from("project_credits").select("project_id, role").eq("party_id", intoId),
    supabase.from("party_aliases").select("alias").eq("party_id", fromId),
  ]);
  if (!from) return { ok: false, message: "まとめる元が見つかりません" };
  const taken = new Set((intoCredits ?? []).map((c) => `${c.project_id}:${c.role}`));
  for (const c of credits ?? []) {
    // 同じ事例・同じ役割がすでに相手にあれば、元のつながりは消すだけ
    const { error } = taken.has(`${c.project_id}:${c.role}`)
      ? await supabase.from("project_credits").delete().eq("id", c.id)
      : await supabase.from("project_credits").update({ party_id: intoId }).eq("id", c.id);
    if (error) return { ok: false, message: error.message };
  }
  const names = [...new Set([from.name_ja, from.name_en, ...(aliases ?? []).map((a) => a.alias)].filter((x): x is string => !!x))];
  if (names.length) {
    await supabase.from("party_aliases").upsert(names.map((alias) => ({ party_id: intoId, alias, note: note.trim() || "統合した表記" })), { onConflict: "party_id,alias", ignoreDuplicates: true });
  }
  const { error } = await supabase.from("parties").delete().eq("id", fromId);
  if (error) return { ok: false, message: error.message };
  updateTag("projects");
  return { ok: true, message: `「${from.name_ja}」をまとめました` };
}
