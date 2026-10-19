import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GraphView } from "@/components/graph/GraphView";
import { getGraph } from "@/lib/graph";
import { getDictionary, hasLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/graph">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).graph.title } : {};
}

export default async function GraphPage({ params }: PageProps<"/[lang]/graph">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const data = await getGraph(lang);
  return <GraphView data={data} t={getDictionary(lang).graph} />;
}
