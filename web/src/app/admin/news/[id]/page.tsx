import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../../AdminHeader";
import type { PostInput } from "../actions";
import { PostForm } from "../PostForm";

export default function PostEditPage({ params }: PageProps<"/admin/news/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <PostEdit params={params} />
    </Suspense>
  );
}

async function PostEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  const { data: projects } = await supabase.from("projects").select("id, name_ja").order("name_ja");
  let initial: PostInput = { id: null, slug: "", kind: "news", title_ja: "", title_en: "", summary_ja: "", summary_en: "", body_ja: "", body_en: "", project_id: "", link_url: "", status: "draft", published_at: "" };
  if (id !== "new") {
    const { data: p } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
    if (!p) notFound();
    const s = (v: string | null) => v ?? "";
    initial = { id: p.id, slug: p.slug, kind: p.kind, title_ja: p.title_ja, title_en: s(p.title_en), summary_ja: s(p.summary_ja), summary_en: s(p.summary_en), body_ja: s(p.body_ja), body_en: s(p.body_en), project_id: s(p.project_id), link_url: s(p.link_url), status: p.status, published_at: p.published_at.slice(0, 10) };
  }
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-6 text-xl">{initial.id ? initial.title_ja : "記事を書く"}</h1>
      <PostForm initial={initial} projects={projects ?? []} />
    </>
  );
}
