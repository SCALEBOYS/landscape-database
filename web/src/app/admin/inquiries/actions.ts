"use server";

import { requireUser } from "@/lib/supabase-server";

export async function setInquiryStatus(id: string, status: "new" | "in_progress" | "done") {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  const { error } = await supabase.from("inquiries").update({ status, handled_at: status === "done" ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw new Error(error.message);
}
