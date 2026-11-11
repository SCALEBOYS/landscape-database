import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";
import { AwardManager, type ProgramRow } from "./AwardManager";

export default function AwardsAdminPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Awards />
    </Suspense>
  );
}

async function Awards() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  const [{ data: programs }, { data: loose }] = await Promise.all([
    supabase.from("award_programs").select("id, name_ja, name_en, organizer_ja, url, aliases, prizes, awards:project_awards(id)").order("sort_order").order("name_ja"),
    supabase.from("project_awards").select("id, award_name, award_year, project:projects(id, name_ja)").is("program_id", null).order("award_name"),
  ]);
  const rows: ProgramRow[] = (programs ?? []).map((p) => ({
    id: p.id,
    name_ja: p.name_ja,
    name_en: p.name_en ?? "",
    organizer_ja: p.organizer_ja ?? "",
    url: p.url ?? "",
    aliases: (p.aliases as string[]).join("\n"),
    prizes: (p.prizes as string[]).join("\n"),
    used: (p.awards as unknown[]).length,
  }));
  const unlinked = (loose ?? []) as unknown as { id: string; award_name: string; award_year: number | null; project: { id: string; name_ja: string } | null }[];
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-1 text-xl">賞の名前</h1>
      <p className="mb-6 text-sm text-muted">
        事例の「受賞」はこの一覧から選びます。旧名・略称は「別名」に入れると、AI の下書きや一括取り込みで書き方が違っても同じ賞につながります。「賞の種類」は入力の候補に出ます。
      </p>
      {unlinked.length ? (
        <section className="mb-6 rounded-md border border-[#a15c00]/40 bg-white p-4 text-sm">
          <h2 className="mb-2 font-medium">賞の一覧につながっていない受賞（{unlinked.length}）</h2>
          <ul className="grid gap-1">
            {unlinked.map((a) => (
              <li key={a.id}>
                「{a.award_name}」{a.award_year ? `（${a.award_year}）` : ""} —{" "}
                {a.project ? (
                  <Link className="underline" href={`/admin/projects/${a.project.id}#credits`}>
                    {a.project.name_ja}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <AwardManager rows={rows} />
    </>
  );
}
