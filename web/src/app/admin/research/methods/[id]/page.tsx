import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../../../AdminHeader";
import { MethodForm } from "../../MethodForm";
import type { MethodInput } from "../../actions";

export default function MethodEditPage({ params }: PageProps<"/admin/research/methods/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <MethodEdit params={params} />
    </Suspense>
  );
}

async function MethodEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  let initial: MethodInput = { id: null, slug: "", name_ja: "", name_en: "", summary_ja: "", summary_en: "", body_ja: "", body_en: "", sort_order: "100", review_status: "draft" };
  if (id !== "new") {
    const { data: m } = await supabase.from("methods").select("*").eq("id", id).maybeSingle();
    if (!m) notFound();
    initial = { ...m, summary_en: m.summary_en ?? "", body_ja: m.body_ja ?? "", body_en: m.body_en ?? "", sort_order: String(m.sort_order) };
  }
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-6 text-xl">{initial.id ? initial.name_ja : "手法の追加"}</h1>
      <MethodForm initial={initial} />
    </>
  );
}
