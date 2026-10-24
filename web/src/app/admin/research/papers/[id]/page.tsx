import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../../../AdminHeader";
import { PaperForm, type PaperFormData } from "../../PaperForm";

// AI の下書きを待てるように
export const maxDuration = 60;

export default function PaperEditPage({ params }: PageProps<"/admin/research/papers/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <PaperEdit params={params} />
    </Suspense>
  );
}

const EMPTY: PaperFormData = {
  id: null, slug: "", kind: "article", title: "", title_ja: "", authors: "", year: "", venue: "", volume: "", issue: "", pages: "",
  doi: "", url: "", language: "en", summary_ja: "", summary_en: "", review_status: "draft", method_ids: [], project_ids: [], species_ids: [], category_ids: [],
};

async function PaperEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  const [methods, projects, species, categories] = await Promise.all([
    supabase.from("methods").select("id, name_ja").order("sort_order"),
    supabase.from("projects").select("id, name_ja").order("name_ja"),
    supabase.from("species").select("id, name_ja, scientific_name").order("name_ja"),
    supabase.from("component_categories").select("id, kind, name_ja").order("sort_order"),
  ]);
  let initial = EMPTY;
  if (id !== "new") {
    const { data: p } = await supabase
      .from("papers")
      .select("*, m:paper_methods(method_id), pr:paper_projects(project_id), sp:paper_species(species_id), ca:paper_categories(category_id)")
      .eq("id", id)
      .maybeSingle();
    if (!p) notFound();
    const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
    initial = {
      id: p.id, slug: p.slug, kind: p.kind, title: p.title, title_ja: s(p.title_ja), authors: p.authors, year: s(p.year), venue: p.venue,
      volume: s(p.volume), issue: s(p.issue), pages: s(p.pages), doi: s(p.doi), url: s(p.url), language: p.language,
      summary_ja: p.summary_ja, summary_en: s(p.summary_en), review_status: p.review_status,
      method_ids: p.m.map((x: { method_id: string }) => x.method_id),
      project_ids: p.pr.map((x: { project_id: string }) => x.project_id),
      species_ids: p.sp.map((x: { species_id: string }) => x.species_id),
      category_ids: p.ca.map((x: { category_id: string }) => x.category_id),
    };
  }
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-6 text-xl">{initial.id ? initial.title_ja || initial.title : "論文の追加"}</h1>
      <PaperForm
        initial={initial}
        methods={(methods.data ?? []).map((m) => ({ id: m.id, label: m.name_ja }))}
        projects={(projects.data ?? []).map((p) => ({ id: p.id, label: p.name_ja }))}
        species={(species.data ?? []).map((x) => ({ id: x.id, label: x.name_ja, sub: x.scientific_name }))}
        categories={(categories.data ?? []).map((c) => ({ id: c.id, label: c.name_ja, sub: c.kind }))}
      />
    </>
  );
}
