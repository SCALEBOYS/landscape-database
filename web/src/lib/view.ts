import type { CardData } from "@/components/ProjectCard";

import { coverPhoto, type Project } from "./data";
import { categoryLabels, label, localName, prefectureEn, type Locale } from "./i18n";

export function place(p: Project, locale: Locale) {
  if (locale === "en") return [prefectureEn[p.prefecture] ?? p.prefecture].join("");
  return `${p.prefecture}${p.municipality ?? ""}`;
}

export function toCard(p: Project, locale: Locale, note?: string): CardData {
  return {
    slug: p.slug,
    name: localName(locale, p.name_ja, p.name_en),
    place: place(p, locale),
    year: p.completed_year,
    useLabel: label(categoryLabels, p.use_category, locale),
    cover: coverPhoto(p),
    note,
  };
}

// 英語ページでは、英訳を確認済み（reviewed）の本文だけを出す
export function summary(p: Project, locale: Locale) {
  if (locale === "ja") return p.summary_ja;
  return p.summary_en_status === "reviewed" ? p.summary_en : null;
}
