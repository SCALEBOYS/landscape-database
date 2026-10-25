import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PhotoCarousel } from "@/components/PhotoCarousel";
import { getProjects, photoUrl } from "@/lib/data";
import { categoryLabels, getDictionary, hasLocale, label, localName } from "@/lib/i18n";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/data/photos">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).groups.data.photos, alternates: alternates(lang, "/data/photos") } : {};
}

// DATA ＞ 写真。公開している現地写真を事例ごとにまとめて並べる
export default async function PhotosPage({ params }: PageProps<"/[lang]/data/photos">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.project;
  const projects = (await getProjects()).filter((p) => p.photos.length);
  const total = projects.reduce((n, p) => n + p.photos.length, 0);
  return (
    <div className="wrap pt-10">
      <span className="eyebrow">DATA</span>
      <h1 className="mt-1 text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-0.02em]">{dict.groups.data.photos}</h1>
      <p className="mt-3 max-w-[60ch] text-sm leading-[1.8] text-muted">{dict.dataPage.photosLead.replace("{n}", String(total)).replace("{p}", String(projects.length))}</p>
      {projects.length ? (
        <div className="mt-10 grid gap-12">
          {projects.map((p) => (
            <section key={p.slug} className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-2">
                <h2 className="text-lg font-semibold">
                  <Link href={`/${lang}/projects/${p.slug}`} className="hover:underline">{localName(lang, p.name_ja, p.name_en)}</Link>
                  <span className="ml-2 text-xs font-normal text-muted">{label(categoryLabels, p.use_category, lang)} · {p.municipality ?? p.prefecture}</span>
                </h2>
                <span className="num text-xs text-muted">{p.photos.length}</span>
              </div>
              {/* 事例ごとに1列。多ければ横に送れて、押すと大きく見られる（事例ページと同じ部品） */}
              <PhotoCarousel
                slides={[...p.photos]
                  .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)
                  .map((ph) => {
                    const caption = (lang === "en" ? ph.caption_en : ph.caption_ja) ?? "";
                    return { src: photoUrl(ph.storage_path), alt: caption || localName(lang, p.name_ja, p.name_en), caption: [caption, "© Landscape Database"].filter(Boolean).join(" "), points: [] };
                  })}
                labels={{ species: t.pointSpecies, material: t.pointMaterial, more: t.pointMore, prev: t.photoPrev, next: t.photoNext, show: t.showPoints, hide: t.hidePoints, close: t.close, enlarge: t.photoEnlarge }}
              />
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted">{dict.dataPage.noPhotos}</p>
      )}
      <p className="mt-10 text-xs text-muted">{dict.footer.copyright}</p>
    </div>
  );
}
