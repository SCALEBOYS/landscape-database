import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { getProjects } from "@/lib/data";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/data">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: "DATA", alternates: alternates(lang, "/data") } : {};
}

// DATA の入口。つながり・写真・3D モデルの数を見せて、それぞれのページへ
export default async function DataPage({ params }: PageProps<"/[lang]/data">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const g = dict.groups.data;
  const projects = await getProjects();
  const models = projects.reduce((n, p) => n + p.models.length, 0);
  const photos = projects.reduce((n, p) => n + p.photos.length, 0);
  const r = dict.groups.research;
  const cards = [
    { href: `/${lang}/graph`, icon: "field-spatial", label: r.graph, desc: r.graphDesc, n: projects.length },
    { href: `/${lang}/data/photos`, icon: "camera", label: g.photos, desc: g.photosDesc, n: photos },
    { href: `/${lang}/data/models`, icon: "cube", label: g.models, desc: g.modelsDesc, n: models },
  ];
  return (
    <div className="wrap pt-10">
      <span className="eyebrow">DATA</span>
      <h1 className="mt-1 text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-0.02em]">DATA</h1>
      <p className="mt-3 max-w-[60ch] text-sm leading-[1.8] text-muted">{dict.dataPage.lead}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="group grid h-full gap-4 rounded-sm bg-ink p-7 text-white transition hover:-translate-y-0.5">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><Icon name={c.icon} className="ico !h-6 !w-6" /></span>
              <span className="text-2xl font-bold">{c.label}</span>
              <span className="text-sm text-white/65">{c.desc}</span>
              <span className="num mt-2 flex items-baseline gap-2 text-4xl font-extrabold">{c.n}<span className="text-sm font-normal text-white/60">{dict.dataPage.items}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
