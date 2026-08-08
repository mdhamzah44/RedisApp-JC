import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl } from "@/lib/seo";

const GUIDE_SLUGS = ["cane-care", "materials", "sizing"];
const POLICY_SLUGS = [
  "shipping",
  "returns",
  "buyer-protection",
  "seller-verification",
  "privacy",
  "terms",
];

function urlTag(loc: string, opts: { changefreq: string; priority: string }): string {
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${opts.changefreq}</changefreq>\n    <priority>${opts.priority}</priority>\n  </url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { getCatalogData } = await import("@/lib/catalog.server");
        const { categories, sellers, products } = await getCatalogData();

        const urls: string[] = [
          urlTag(absoluteUrl("/"), { changefreq: "daily", priority: "1.0" }),
          urlTag(absoluteUrl("/deals"), { changefreq: "daily", priority: "0.7" }),
          ...categories.map((c) =>
            urlTag(absoluteUrl(`/c/${c.slug}`), { changefreq: "daily", priority: "0.8" }),
          ),
          ...sellers.map((s) =>
            urlTag(absoluteUrl(`/shop/${s.slug}`), { changefreq: "weekly", priority: "0.7" }),
          ),
          ...products.map((p) =>
            urlTag(absoluteUrl(`/product/${p.slug}`), { changefreq: "weekly", priority: "0.6" }),
          ),
          ...GUIDE_SLUGS.map((s) =>
            urlTag(absoluteUrl(`/guides/${s}`), { changefreq: "monthly", priority: "0.4" }),
          ),
          ...POLICY_SLUGS.map((s) =>
            urlTag(absoluteUrl(`/policies/${s}`), { changefreq: "monthly", priority: "0.3" }),
          ),
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
