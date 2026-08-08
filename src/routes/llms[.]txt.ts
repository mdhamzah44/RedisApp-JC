import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/seo";

/**
 * llms.txt — an emerging convention (llmstxt.org) for giving AI assistants
 * and answer engines a concise, structured summary of a site, similar in
 * spirit to robots.txt/sitemap.xml but aimed at language models rather than
 * crawlers. Plain markdown, regenerated from the live catalog so category
 * links never go stale.
 */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const { getCatalogData } = await import("@/lib/catalog.server");
        const { categories } = await getCatalogData();

        const lines = [
          "# MakinItHome",
          "",
          "> Online marketplace for handmade Indian furniture, lighting, textiles and home decor, sold directly by verified independent Indian workshops. UPI and Cash on Delivery accepted, 7-day returns, doorstep delivery across India.",
          "",
          "## Key facts",
          "- Every seller is GST- and KYC-verified before listing.",
          "- Prices are in INR (₹) and include all taxes.",
          "- Standard return window: 7 days from delivery, free reverse pickup.",
          "- Shipping is free above ₹1,499.",
          "",
          "## Categories",
          ...categories.map((c) => `- [${c.name}](${SITE_URL}/c/${c.slug}): ${c.blurb}`),
          "",
          "## Useful pages",
          `- [All deals](${SITE_URL}/deals)`,
          `- [Buying guides](${SITE_URL}/guides/materials)`,
          `- [Shipping & delivery](${SITE_URL}/policies/shipping)`,
          `- [Returns & refunds](${SITE_URL}/policies/returns)`,
          `- [How sellers are verified](${SITE_URL}/policies/seller-verification)`,
          `- [Sitemap](${SITE_URL}/sitemap.xml)`,
        ];

        return new Response(lines.join("\n"), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
