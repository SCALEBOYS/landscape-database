import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";
import { categoryLabels } from "@/lib/i18n";

import { AdminHeader, NotAdmin } from "./AdminHeader";

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <ProjectList />
    </Suspense>
  );
}

async function ProjectList() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, slug, name_ja, use_category, prefecture, municipality, status, updated_at, photos(count)")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl">物件（{projects.length}件）</h1>
        <Link href="/admin/projects/new" className="rounded-md bg-accent px-4 py-2 text-sm text-white">
          新規登録
        </Link>
      </div>
      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="p-2">名称</th>
            <th className="p-2">用途</th>
            <th className="p-2">所在地</th>
            <th className="p-2">写真</th>
            <th className="p-2">状態</th>
            <th className="p-2">更新</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b border-line">
              <td className="p-2">
                <Link href={`/admin/projects/${p.id}`} className="text-accent hover:underline">{p.name_ja}</Link>
                <div className="text-xs text-muted">{p.slug}</div>
              </td>
              <td className="p-2">{categoryLabels[p.use_category]?.ja ?? p.use_category}</td>
              <td className="p-2">{p.prefecture}{p.municipality ?? ""}</td>
              <td className="p-2">{(p.photos as unknown as { count: number }[])[0]?.count ?? 0}</td>
              <td className="p-2">
                <span className={`rounded px-2 py-0.5 text-xs ${p.status === "published" ? "bg-accent text-white" : "bg-placeholder"}`}>
                  {p.status === "published" ? "公開" : "下書き"}
                </span>
              </td>
              <td className="p-2 text-xs text-muted">{new Date(p.updated_at).toLocaleDateString("ja-JP")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
