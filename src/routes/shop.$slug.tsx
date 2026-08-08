import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";

import type { BrowseSearch } from "@/components/Browse";
import { StorePage } from "@/components/StorePage";
import { sellerBySlug, type Seller } from "@/data/catalog";
import { validateBrowseSearch } from "@/lib/browse-search";
import { absoluteUrl, canonicalLink, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/shop/$slug")({
  validateSearch: validateBrowseSearch,
  loader: ({ params }): { seller: Seller } => {
    const seller = sellerBySlug.get(params.slug);
    if (!seller) throw notFound();
    return { seller };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Shop not found — MakinItHome" }, { name: "robots", content: "noindex" }],
      };
    }
    const { seller } = loaderData;
    const path = `/shop/${params.slug}`;
    const description = (
      seller.about ||
      seller.tagline ||
      `Handmade pieces from ${seller.name}.`
    ).slice(0, 158);
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title: `${seller.name} — ${seller.city} | MakinItHome`.slice(0, 60) },
      { name: "description", content: description },
      {
        name: "keywords",
        content:
          `${seller.name}, handmade ${seller.city}, ${seller.badges.join(", ")}`.toLowerCase(),
      },
      { property: "og:title", content: seller.name },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (seller.logoUrl) meta.push({ property: "og:image", content: seller.logoUrl });
    return {
      meta,
      links: [canonicalLink(path)],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Store",
            name: seller.name,
            description,
            url: absoluteUrl(path),
            image: seller.logoUrl || undefined,
            // E-E-A-T: verification badges, founding year and named team are
            // exactly the "experience/expertise/authority/trust" signals
            // search and answer engines look for on a maker's own page.
            foundingDate: String(seller.since),
            address: {
              "@type": "PostalAddress",
              addressLocality: seller.city,
              addressRegion: seller.state,
              addressCountry: seller.country || "IN",
            },
            ...(seller.reviews > 0 && {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: seller.rating,
                reviewCount: seller.reviews,
              },
            }),
            ...(seller.team.length > 0 && {
              employee: seller.team.map((m) => ({
                "@type": "Person",
                name: m.name,
                jobTitle: m.role || m.rank,
              })),
            }),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: seller.name, item: absoluteUrl(path) },
            ],
          }),
        },
      ],
    };
  },
  component: ShopPage,
});

function ShopPage() {
  const { seller } = Route.useLoaderData() as { seller: Seller };
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <StorePage
      seller={seller}
      search={search}
      onChange={(next: Partial<BrowseSearch>) =>
        void navigate({
          to: "/shop/$slug",
          params: { slug: seller.slug },
          search: (prev: BrowseSearch) => ({ ...prev, page: 1, ...next }),
          replace: true,
        })
      }
    />
  );
}
