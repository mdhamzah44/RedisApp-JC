import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";

import { AdaptiveImage } from "@/components/AdaptiveImage";
import { Browse, type BrowseSearch } from "@/components/Browse";
import { categoryBySlug, products } from "@/data/catalog";
import { categoryImageLqip } from "@/data/category-images";
import { validateBrowseSearch } from "@/lib/browse-search";
import { absoluteUrl, canonicalLink, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/c/$slug")({
  validateSearch: validateBrowseSearch,
  loader: ({ params }) => {
    const category = categoryBySlug.get(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Category not found — MakinItHome" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { category } = loaderData;
    const path = `/c/${params.slug}`;
    const title = `${category.name} — Handmade in India | MakinItHome`;
    const inCategory = products.filter((p) => p.category === category.slug).slice(0, 20);
    const keywords = [
      category.name,
      ...category.subcategories.slice(0, 8),
      `handmade ${category.name}`,
      `buy ${category.name} online india`,
    ];

    return {
      meta: [
        { title },
        { name: "description", content: category.blurb },
        { name: "keywords", content: keywords.join(", ").toLowerCase() },
        { property: "og:title", content: title },
        { property: "og:description", content: category.blurb },
        { property: "og:type", content: "website" },
        { property: "og:image", content: category.image },
      ],
      links: [canonicalLink(path)],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: title,
            description: category.blurb,
            url: absoluteUrl(path),
            mainEntity: {
              "@type": "ItemList",
              itemListElement: inCategory.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: absoluteUrl(`/product/${p.slug}`),
                name: p.name,
              })),
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: category.name, item: absoluteUrl(path) },
            ],
          }),
        },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const items = products.filter((p) => p.category === category.slug);

  function onChange(next: Partial<BrowseSearch>) {
    void navigate({
      to: "/c/$slug",
      params: { slug: category.slug },
      search: (prev: BrowseSearch) => ({ ...prev, ...next }),
      resetScroll: false,
    });
  }

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        Home / <span className="text-foreground">{category.name}</span>
      </nav>

      <section className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_320px]">
          <div className="p-6 md:p-8">
            <h1 className="font-display text-3xl">{category.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {category.blurb} Every piece on this page is made by a GST and KYC verified Indian
              workshop, shipped with 7-day returns and doorstep delivery. Filter by material, size,
              colour and delivery time to narrow down to exactly what fits your space, and check the
              product snapshot on each listing for dimensions, warranty and assembly details before
              you buy.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2 text-xs">
              {category.subcategories.map((s: string) => (
                <li key={s} className="pill">
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <AdaptiveImage
            src={category.image}
            lowQualitySrc={categoryImageLqip[category.image]}
            alt={`${category.name} at MakinItHome`}
            width={1024}
            height={768}
            priority
            wrapperClassName="hidden h-56 w-full md:block"
          />
        </div>
      </section>

      <Browse
        all={items}
        search={search}
        onChange={onChange}
        subcategories={category.subcategories}
        title={category.name}
      />

      <section className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="font-display text-xl">Buying guide</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Solid teak and sheesham hold up best in humid coastal cities; mango wood is lighter and
            easier to move. Natural cane should be kept out of prolonged direct sun. Measure your
            doorway and lift before ordering large furniture — our sellers list packed dimensions on
            every listing.
          </p>
        </div>
        <div className="card-surface p-6">
          <h2 className="font-display text-xl">Popular searches</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {category.subcategories
              .map((s: string) => `handmade ${s.toLowerCase()}`)
              .concat(["made to order furniture", "natural finish decor"])
              .join(" · ")}
          </p>
        </div>
      </section>
    </div>
  );
}
