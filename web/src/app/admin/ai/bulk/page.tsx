import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../../AdminHeader";
import { BulkRunner, type BulkProject } from "./BulkRunner";

export const maxDuration = 60;

export default function BulkPage(props: PageProps<"/admin/ai/bulk">) {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Bulk {...props} />
    </Suspense>
  );
}

async function Bulk({ searchParams }: PageProps<"/admin/ai/bulk">) {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  const raw = (await searchParams).ids;
  const ids = String(Array.isArray(raw) ? raw[0] : (raw ?? "")).split(",").filter(Boolean).slice(0, 50);
  const { data } = ids.length
    ? await supabase.from("projects").select("id, name_ja, name_en, municipality, address_ja, completed_year, site_area_m2, summary_ja, summary_en, sources(url)").in("id", ids)
    : { data: [] };
  const projects: BulkProject[] = (data ?? []).map((p) => ({
    id: p.id,
    name_ja: p.name_ja,
    source: (p.sources as { url: string }[])[0]?.url ?? "",
    current: {
      name_en: p.name_en ?? "",
      municipality: p.municipality ?? "",
      address_ja: p.address_ja ?? "",
      completed_year: p.completed_year ? String(p.completed_year) : "",
      site_area_m2: p.site_area_m2 ? String(p.site_area_m2) : "",
      summary_ja: p.summary_ja ?? "",
      summary_en: p.summary_en ?? "",
    },
  }));

  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="text-xl font-medium">✦ AI でまとめて下書き</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        選んだ事例について、AI が1件ずつ下書きを作ります。結果を見比べて、反映する項目に印を付けてから「反映」を押してください。押すまで保存されません。
      </p>
      {projects.length ? (
        <BulkRunner projects={projects} />
      ) : (
        <p className="rounded-md border border-line bg-white p-6 text-sm text-muted">
          <Link href="/admin" className="text-accent underline">事例の一覧</Link>で事例の左の四角に印を付け、「AI でまとめて下書き」を押してください。「説明なし」などの足りない項目で絞り込んでから、まとめて選ぶと便利です。
        </p>
      )}
    </>
  );
}
