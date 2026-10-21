import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { coverPhoto, supabase, type Project } from "./data";

export type Post = {
  slug: string;
  kind: "news" | "feature";
  title_ja: string;
  title_en: string | null;
  summary_ja: string | null;
  summary_en: string | null;
  body_ja: string | null;
  body_en: string | null;
  link_url: string | null;
  published_at: string;
  project: { slug: string; name_ja: string; name_en: string | null } | null;
  cover: string | null;
};

// 公開中の NEWS・特集（新しい順）。関係する事例のカバー写真を画像に使う
export async function getPosts(): Promise<Post[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  const { data, error } = await supabase()
    .from("posts")
    .select("slug, kind, title_ja, title_en, summary_ja, summary_en, body_ja, body_en, link_url, published_at, project:projects(slug, name_ja, name_en, status, photos(storage_path, is_cover, sort_order, exif_stripped, people_checked))")
    .order("published_at", { ascending: false });
  if (error) throw error;
  type Row = Omit<Post, "project" | "cover"> & { project: (Post["project"] & { status: string; photos: Project["photos"] }) | null };
  return (data as unknown as Row[]).map(({ project, ...p }) => ({
    ...p,
    project: project && project.status === "published" ? { slug: project.slug, name_ja: project.name_ja, name_en: project.name_en } : null,
    cover: project ? coverPhoto({ photos: project.photos } as Project) : null,
  }));
}

export const postTitle = (p: Post, lang: string) => (lang === "en" ? p.title_en ?? p.title_ja : p.title_ja);
export const postDate = (iso: string, lang: string) => new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "ja-JP", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tokyo" });
