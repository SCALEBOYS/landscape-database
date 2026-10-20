import type { MetadataRoute } from "next";

import { INDEXABLE, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: "/admin" }, sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL };
}
