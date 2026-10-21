import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";
import { DesignerManager, type PartyRow } from "./DesignerManager";

export default function DesignersAdminPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Designers />
    </Suspense>
  );
}

async function Designers() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  const { data } = await supabase.from("parties").select("id, slug, name_ja, name_en, aliases:party_aliases(id, alias, note), credits:project_credits(project:projects(name_ja))").order("name_ja");
  const rows: PartyRow[] = (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name_ja: p.name_ja,
    name_en: p.name_en ?? "",
    aliases: p.aliases ?? [],
    projects: [...new Set(((p.credits ?? []) as unknown as { project: { name_ja: string } | null }[]).map((c) => c.project?.name_ja).filter((x): x is string => !!x))],
  }));
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-1 text-xl">設計（会社・人）の名前</h1>
      <p className="mb-6 text-sm text-muted">
        表記ゆれ（略称・旧名・人名入りなど）は「別名」に入れると、どの表記で探しても見つかります。同じ会社が別々に登録されているときは「まとめる」で一つにします。似た名前というだけでまとめず、公式の会社概要などで同じ会社か確かめてください。
      </p>
      <DesignerManager rows={rows} />
    </>
  );
}
