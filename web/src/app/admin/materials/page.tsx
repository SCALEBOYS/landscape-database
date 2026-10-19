import { Suspense } from "react";

import { componentKindLabels } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";
import { MaterialManager, type Category } from "./MaterialManager";

export default function MaterialsPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Materials />
    </Suspense>
  );
}

async function Materials() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;

  const [{ data: categories, error }, { data: used }] = await Promise.all([
    supabase.from("component_categories").select("id, kind, slug, name_ja, name_en, sort_order").order("sort_order").order("name_ja"),
    supabase.from("project_components").select("category_id"),
  ]);
  if (error) throw error;
  const usage = new Map<string, number>();
  for (const u of used ?? []) usage.set(u.category_id, (usage.get(u.category_id) ?? 0) + 1);

  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-1 text-xl">素材の分類</h1>
      <p className="mb-6 text-sm text-muted">
        事例の「構成要素」で選ぶ分類です。ここで足した分類は、事例の入力画面にすぐ出ます。「探す」画面の「舗装」の候補には、その分類を使った事例を保存すると出ます。
      </p>
      <MaterialManager
        kinds={Object.entries(componentKindLabels).map(([key, v]) => ({ key, label: v.ja }))}
        categories={(categories ?? []).map((c) => ({ ...c, used: usage.get(c.id) ?? 0 })) as Category[]}
      />
    </>
  );
}
