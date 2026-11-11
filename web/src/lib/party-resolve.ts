import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { findParty, normName, type AwardProgramOption, type PartyOption } from "./names";

// 新しく登録する会社の slug（社名の sha1 先頭10桁。かぶったらずらす）
const partySlug = (name: string) => "p-" + createHash("sha1").update(name, "utf8").digest("hex").slice(0, 10);

/** 名前で会社を探し、なければ登録する。同じ会社（名前・英名・別名が同じとみなせるもの）を二重に作らない */
export async function partyResolver(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("parties").select("id, slug, name_ja, name_en, aliases:party_aliases(alias)");
  if (error) throw new Error(error.message);
  const options: PartyOption[] = (data ?? []).map((x) => ({ id: x.id, name_ja: x.name_ja, name_en: x.name_en, aliases: (x.aliases as { alias: string }[]).map((a) => a.alias) }));
  const slugs = new Set((data ?? []).map((x) => x.slug as string));
  return async (name: string): Promise<string> => {
    const n = name.trim();
    const hit = findParty(n, options);
    if (hit) return hit.id;
    let slug = partySlug(normName(n) || n);
    while (slugs.has(slug)) slug = partySlug(slug + "+");
    const { data: created, error: e } = await supabase.from("parties").insert({ slug, name_ja: n }).select("id").single();
    if (e) throw new Error(`関係者「${n}」: ${e.message}`);
    slugs.add(slug);
    options.push({ id: created.id, name_ja: n, name_en: null, aliases: [] });
    return created.id as string;
  };
}

export async function loadAwardPrograms(supabase: SupabaseClient): Promise<AwardProgramOption[]> {
  const { data } = await supabase.from("award_programs").select("id, name_ja, name_en, aliases, prizes").order("sort_order");
  return (data ?? []) as AwardProgramOption[];
}
