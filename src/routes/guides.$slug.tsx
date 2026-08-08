import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl, canonicalLink, SITE_URL } from "@/lib/seo";

const GUIDES: Record<string, { title: string; body: string[] }> = {
  "cane-care": {
    title: "Caring for hand-woven cane",
    body: [
      "Cane is a natural fibre: it breathes, it flexes, and it lasts decades when treated well. Keep woven pieces out of prolonged direct sunlight, which dries and yellows the strands.",
      "Dust weekly with a dry brush and wipe with a barely damp cloth once a month. In very humid coastal homes, run a fan near the piece occasionally so moisture does not settle in the weave.",
      "If a strand loosens, do not cut it. Message the maker through the listing — most of our weavers repair their own work for the cost of shipping.",
    ],
  },
  materials: {
    title: "Materials guide: teak, sheesham, mango, cane and terracotta",
    body: [
      "Teak is the most stable Indian hardwood: dense, oil-rich and resistant to humidity, which makes it the safest choice for coastal cities. Sheesham is heavier with dramatic grain and takes a deep polish.",
      "Mango wood is lighter and more affordable, ideal for pieces you may move often. Cane and rattan are best for seating and screens where airflow matters.",
      "Terracotta and stoneware are fired at high temperature and are food-safe unless the listing says decorative only. Handwash glazed pieces; avoid thermal shock.",
    ],
  },
  sizing: {
    title: "Measuring your space before you buy furniture",
    body: [
      "Measure the floor footprint, then measure the path the piece must travel: doorway width, lift depth, and any tight stair turns. Our listings publish packed dimensions for exactly this reason.",
      "Leave at least 75 cm of walking clearance around seating, and 45 cm between a sofa and a coffee table.",
      "For dining, allow 60 cm of table edge per person and 90 cm behind each chair so it can be pulled out comfortably.",
    ],
  },
};

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = GUIDES[params.slug] ?? {
      title: "Buying guides",
      body: ["Pick a guide from the footer to read more about materials, sizing and care."],
    };
    return { guide };
  },
  head: ({ loaderData, params }) => {
    const title = `${loaderData?.guide.title ?? "Guides"} — MakinItHome`;
    const description =
      loaderData?.guide.body[0]?.slice(0, 158) ?? "Handmade furniture buying guides.";
    const path = `/guides/${params.slug}`;
    return {
      meta: [
        { title: title.slice(0, 60) },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
      ],
      links: [canonicalLink(path)],
      scripts: loaderData
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: loaderData.guide.title,
                description,
                url: absoluteUrl(path),
                // E-E-A-T: attribute buying guides to the marketplace as
                // publisher rather than leaving authorship implicit.
                author: { "@type": "Organization", name: "MakinItHome" },
                publisher: { "@type": "Organization", name: "MakinItHome", url: SITE_URL },
                articleBody: loaderData.guide.body.join(" "),
              }),
            },
          ]
        : [],
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const { guide } = Route.useLoaderData() as { guide: { title: string; body: string[] } };
  return (
    <article className="container-page max-w-3xl py-12">
      <h1 className="font-display text-3xl">{guide.title}</h1>
      <div className="mt-6 space-y-4">
        {guide.body.map((p) => (
          <p key={p.slice(0, 20)} className="text-sm leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>
    </article>
  );
}
