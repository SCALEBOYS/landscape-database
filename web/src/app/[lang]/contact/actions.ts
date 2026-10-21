"use server";

import { supabase } from "@/lib/data";

export type InquiryState = { ok: boolean; message: string } | null;

const TOPICS = ["general", "correction", "removal", "rights", "request"];

// 問い合わせを保存する。ボット対策として、見えない欄（website）に入力があるものと、開いてすぐの送信は受け付けない
export async function sendInquiry(_: InquiryState, form: FormData): Promise<InquiryState> {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const lang = get("lang") === "en" ? "en" : "ja";
  const err = (ja: string, en: string) => ({ ok: false, message: lang === "en" ? en : ja });
  if (get("website")) return { ok: true, message: "" };
  if (Date.now() - Number(get("t")) < 3000) return err("もう一度送信してください", "Please try again");
  const topic = get("topic");
  const name = get("name");
  const email = get("email");
  const message = get("message");
  if (!TOPICS.includes(topic)) return err("種類を選んでください", "Choose a topic");
  if (!name || name.length > 100) return err("お名前を入れてください", "Enter your name");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return err("メールアドレスを確かめてください", "Check your email address");
  if (!message || message.length > 5000) return err("内容を入れてください（5000字まで）", "Enter a message (up to 5000 characters)");
  const { error } = await supabase()
    .from("inquiries")
    .insert({ topic, name, email, organization: get("organization").slice(0, 200) || null, page_url: get("page_url").slice(0, 500) || null, message, lang });
  if (error) return err("送信できませんでした。時間をおいてもう一度お試しください", "Could not send. Please try again later");
  return { ok: true, message: lang === "en" ? "Thank you. We have received your message." : "送信しました。内容を確認し、必要に応じてご連絡します。" };
}
