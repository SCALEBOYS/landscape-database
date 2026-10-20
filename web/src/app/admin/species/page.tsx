import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";
import { SpeciesPhotoManager, type SpeciesRow } from "./SpeciesPhotoManager";

export default function SpeciesAdminPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <SpeciesAdmin />
    </Suspense>
  );
}

async function SpeciesAdmin() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;

  const { data, error } = await supabase.from("species").select("id, slug, name_ja, scientific_name, photo_path, photo_credit").order("name_ja");
  if (error) throw error;

  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-1 text-xl">樹種の写真</h1>
      <p className="mb-6 text-sm text-muted">
        樹種のページで、名前の左に出す写真です。正方形に切り抜いて表示するので、葉や花など特徴のある部分が真ん中に来る写真が向いています。自分で撮った写真以外を使うときは、出典・撮影者を書いてください。
      </p>
      <SpeciesPhotoManager species={(data ?? []) as SpeciesRow[]} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} />
    </>
  );
}
