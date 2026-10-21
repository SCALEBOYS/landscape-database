import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { cardImage } from "@/components/ProjectCard";
import { coverPhoto, getProjects, modelUrl } from "@/lib/data";
import { getDictionary, hasLocale, localName } from "@/lib/i18n";
import { alternates } from "@/lib/site";

import { ModelGallery, type GalleryModel } from "./ModelGallery";

export async function generateMetadata({ params }: PageProps<"/[lang]/data/models">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).groups.data.models, alternates: alternates(lang, "/data/models") } : {};
}

// DATA ＞ 3D モデル。すべての事例の 3D モデルを並べ、選んだものを大きく見る
export default async function ModelsPage({ params }: PageProps<"/[lang]/data/models">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const projects = await getProjects();
  const models: GalleryModel[] = projects.flatMap((p) =>
    p.models.map((m) => ({
      src: modelUrl(m.storage_path),
      name: (lang === "en" ? m.caption_en : m.caption_ja) || m.file_name,
      project: localName(lang, p.name_ja, p.name_en),
      slug: p.slug,
      img: cardImage({ cover: coverPhoto(p), lat: p.lat, lng: p.lng }),
    })),
  );
  return (
    <div className="wrap pt-10">
      <span className="eyebrow">DATA</span>
      <h1 className="mt-1 text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-0.02em]">{dict.groups.data.models}</h1>
      <p className="mt-3 max-w-[60ch] text-sm leading-[1.8] text-muted">{dict.dataPage.modelsLead}</p>
      <ModelGallery lang={lang} models={models} t={dict.dataPage} />
    </div>
  );
}
