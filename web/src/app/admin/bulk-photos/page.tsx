import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";
import { BulkPhotos, type ProjectSpot } from "./BulkPhotos";

export default function BulkPhotosPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Bulk />
    </Suspense>
  );
}

async function Bulk() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  // 下書きも含めた全事例と、その座標
  const [{ data: projects }, { data: points }] = await Promise.all([
    supabase.from("projects").select("id, slug, name_ja, status").order("name_ja"),
    supabase.from("project_points").select("id, lat, lng"),
  ]);
  const at = new Map((points ?? []).map((p) => [p.id, p]));
  const spots: ProjectSpot[] = (projects ?? []).map((p) => ({ id: p.id, slug: p.slug, name: p.name_ja, draft: p.status !== "published", lat: at.get(p.id)?.lat ?? null, lng: at.get(p.id)?.lng ?? null }));

  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-1 text-xl">写真のまとめ取り込み</h1>
      <p className="mb-6 text-sm text-muted">
        現地で撮った写真をまとめて選ぶと、写真の撮影地点から一番近い事例に自動で振り分けます。振り分けを確かめてから上げてください。位置情報などの EXIF は上げる前に消し、撮影地点と向きだけを別に記録します。
      </p>
      <BulkPhotos projects={spots} />
    </>
  );
}
