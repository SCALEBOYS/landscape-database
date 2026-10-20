"use server";

import { updateTag } from "next/cache";

import { requireUser } from "@/lib/supabase-server";

async function adminClient() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  return supabase;
}

// 樹種の写真を差し替える（path が null なら外す）。前の写真のファイルは消す
export async function setSpeciesPhoto(id: string, path: string | null, credit: string) {
  const supabase = await adminClient();
  const { data: before, error: readError } = await supabase.from("species").select("photo_path").eq("id", id).single();
  if (readError) throw new Error(readError.message);
  const { error } = await supabase
    .from("species")
    .update({ photo_path: path, photo_credit: path ? credit.trim() || null : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (before?.photo_path && before.photo_path !== path) await supabase.storage.from("photos").remove([before.photo_path]);
  updateTag("species");
}

export async function setSpeciesCredit(id: string, credit: string) {
  const supabase = await adminClient();
  const { error } = await supabase.from("species").update({ photo_credit: credit.trim() || null }).eq("id", id);
  if (error) throw new Error(error.message);
  updateTag("species");
}
