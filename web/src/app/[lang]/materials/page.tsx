import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PhotoHero } from "@/components/browse/ProjectHero";
import { MaterialBrowser } from "@/components/materials/MaterialBrowser";
import { getMaterials } from "@/lib/data";
import { componentKindLabels, fmt, getDictionary, hasLocale, label, localName } from "@/lib/i18n";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/materials">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).groups.project.materials, alternates: alternates(lang, "/materials") } : {};
}

// PROJECT ＞ 素材から探す。名前・種類・色・質感で素材を絞り込み、使っている事例へつなぐ
export default async function MaterialsPage({ params }: PageProps<"/[lang]/materials">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.materialsPage;
  const materials = await getMaterials();
  const used = materials.filter((m) => m.projects.length).length;

  // 上部の画像は素材の写真から（写真が入るまでは画像なし）
  const slides = materials.flatMap((m) =>
    m.photo ? [{ href: `/${lang}/materials#${m.slug}`, name: localName(lang, m.name_ja, m.name_en), caption: label(componentKindLabels, m.kind, lang), img: m.photo }] : [],
  );

  return (
    <>
      <PhotoHero slides={slides} t={dict.browse} eyebrow={fmt(t.eyebrow, materials.length)} title={dict.groups.project.materials} lead={t.lead} />
      <div className="wrap pt-10">
        {used === 0 && <p className="mb-6 rounded-sm bg-soft px-4 py-3 text-sm text-muted">{t.empty}</p>}
        <MaterialBrowser lang={lang} materials={materials} t={t} />
      </div>
    </>
  );
}
