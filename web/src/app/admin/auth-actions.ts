"use server";

import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase-server";

export async function signIn(_: string | null, formData: FormData): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return "メールアドレスかパスワードが違います";
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
