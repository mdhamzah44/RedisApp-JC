import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { BadgeIndianRupee, Leaf, RotateCcw, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useMemo } from "react";

import { AiAssistantButton } from "@/components/AiAssistantButton";
import type { BrowseSearch } from "@/components/Browse";
import { ProductCard } from "@/components/ProductCard";
import { StorePage } from "@/components/StorePage";
import { Button } from "@/components/ui/button";
import { categories, products, sellers } from "@/data/catalog";
import { productBySlug } from "@/data/catalog";
import { sellerBySlug } from "@/data/catalog";
import { validateBrowseSearch } from "@/lib/browse-search";
import { getSiteMode } from "@/lib/site-mode";
import { useAppState } from "@/lib/store";
import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  validateSearch: validateBrowseSearch,
  head: () => ({
    meta: [
      { title: "MakinItHome — Handmade furniture & decor from Indian makers" },
      {
        name: "description",
        content:
          "Shop handmade cane, teak and handloom pieces from verified Indian workshops. UPI & COD, 7-day returns, delivery tracked to your door.",
      },
      { property: "og:title", content: "MakinItHome — Handmade Indian home" },
      {
        property: "og:description",
        content: "Handmade furniture, lighting, textiles and decor from verified Indian makers.",
      },
    ],
    links: [{ rel: "preload", as: "image", href: heroImage, fetchpriority: "high" }],
  }),
  component: HomeRoute,
});

/**
 * On a store's own domain (maisonareeba.us) the home page IS that shop.
 * Every other host gets the MakinItHome marketplace home.
 */
function HomeRoute() {
  const site = getSiteMode();
  const store = site.storeSlug ? sellerBySlug.get(site.storeSlug) : undefined;
  const search = Route.useSearch();
  const navigate = useNavigate();

  if (store) {
    return (
      <StorePage
        seller={store}
        standalone
        search={search}
        onChange={(next: Partial<BrowseSearch>) =>
          void navigate({
            to: "/",
            search: (prev: BrowseSearch) => ({ ...prev, page: 1, ...next }),
            replace: true,
          })
        }
      />
    );
  }
  return <Home />;
}

function Row({
  title,
  subtitle,
  items,
  to,
}: {
  title: string;
  subtitle: string;
  items: typeof products;
  to?: { label: string; href: string };
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {to && (
          <a
            href={to.href}
            className="text-sm font-medium text-brand underline-offset-2 hover:underline"
          >
            {to.label} →
          </a>
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {items.slice(0, 8).map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}

function Home() {
  const recent = useAppState((s) => s.recent);
  const recentProducts = useMemo(
    () => recent.map((slug) => productBySlug.get(slug)).filter(Boolean) as typeof products,
    [recent],
  );

  const trending = useMemo(
    () => [...products].sort((a, b) => b.soldLast7Days - a.soldLast7Days).slice(0, 8),
    [],
  );
  const newArrivals = useMemo(
    () => [...products].sort((a, b) => a.createdDaysAgo - b.createdDaysAgo).slice(0, 8),
    [],
  );
  const under1499 = useMemo(
    () =>
      products
        .filter((p) => p.price <= 1499)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 8),
    [],
  );
  const topSellers = sellers.slice(0, 6);

  return (
    <div>
      {/* Hero */}
      <section className="relative">
        <img
          src={heroImage}
          alt="Handmade cane and teak furniture styled in a sunlit Indian living room"
          width={1920}
          height={900}
          fetchPriority="high"
          className="h-[420px] w-full object-cover md:h-[520px]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        <div className="container-page absolute inset-0 flex items-center">
          <div className="max-w-xl">
            <p className="pill bg-brand/10 text-brand">Made by hand · Made in India</p>
            <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
              Pieces with a maker's name on them.
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Cane, teak, terracotta and handloom — from {sellers.length} verified workshops across
              India. Fair prices, honest timelines, doorstep delivery.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/search" search={{ page: 1 }}>
                  Shop everything
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/deals" search={{ page: 1 }}>
                  Today's deals
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-card">
        <div className="container-page grid gap-4 py-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ShieldCheck, "Verified makers", "GST & KYC checked workshops"],
            [Truck, "Tracked delivery", "PIN-level estimates before you pay"],
            [RotateCcw, "7-day returns", "Free reverse pickup, no questions"],
            [BadgeIndianRupee, "UPI & COD", "Pay your way, all-inclusive prices"],
          ].map(([Icon, title, sub]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={title as string} className="flex items-start gap-3">
                <I className="mt-0.5 size-5 text-brand" />
                <div>
                  <p className="font-medium">{title as string}</p>
                  <p className="text-muted-foreground">{sub as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="container-page pb-20">
        {/* Categories */}
        <section className="mt-14">
          <h2 className="font-display text-2xl">Shop by room & craft</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to="/c/$slug"
                params={{ slug: c.slug }}
                search={{ page: 1 }}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lift"
              >
                <img
                  src={c.image}
                  alt={c.name}
                  width={1024}
                  height={768}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="p-3">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.subcategories.slice(0, 3).join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {recentProducts.length > 0 && (
          <Row
            title="Pick up where you left off"
            subtitle="Recently viewed"
            items={recentProducts}
          />
        )}

        <Row
          title="Trending this week"
          subtitle="Most ordered across India in the last 7 days"
          items={trending}
          to={{ label: "See all", href: "/search?sort=popular&page=1" }}
        />

        {/* Editorial */}
        <section className="mt-16 overflow-hidden rounded-2xl bg-secondary">
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div className="p-8">
              <p className="pill bg-brand/10 text-brand">
                <Leaf className="mr-1 inline size-3" /> Slow made
              </p>
              <h2 className="mt-3 font-display text-3xl">The cane revival</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Six workshops in Kerala and Assam are bringing back hand-woven cane with kiln-dried
                frames that survive Indian monsoons. Each piece takes 9–14 days to weave, and the
                weaver's name ships with the order.
              </p>
              <Button asChild variant="outline" className="mt-5 rounded-full">
                <Link to="/guides/$slug" params={{ slug: "cane-care" }}>
                  Read the care guide
                </Link>
              </Button>
            </div>
            <img
              src={categories[0]!.image}
              alt="Hand-woven cane furniture"
              width={1024}
              height={768}
              loading="lazy"
              className="h-full max-h-72 w-full object-cover"
            />
          </div>
        </section>

        <Row
          title="New from the workshops"
          subtitle="Fresh listings, small batches"
          items={newArrivals}
        />
        <Row
          title="Under ₹1,499"
          subtitle="Gifting-friendly, top rated"
          items={under1499}
          to={{ label: "More budget picks", href: "/search?max=1499&page=1" }}
        />

        {/* Sellers */}
        <section className="mt-16">
          <h2 className="font-display text-2xl">Meet the makers</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topSellers.map((s) => (
              <Link
                key={s.slug}
                to="/shop/$slug"
                params={{ slug: s.slug }}
                className="card-surface p-5 transition-shadow hover:shadow-lift"
              >
                <p className="font-display text-lg">{s.name}</p>
                <p className="text-sm text-muted-foreground">
                  {s.city} · since {s.since}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.about}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  ★ {s.rating.toFixed(1)} · {s.onTimePct}% on-time · replies in {s.responseMinutes}{" "}
                  min
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* AI teaser */}
        <section className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
          <div className="flex justify-center">
            <AiAssistantButton label="Open the AI assistant" />
          </div>
          <Sparkles className="mx-auto mt-6 size-6 text-brand" />
          <h2 className="mt-3 font-display text-2xl">Not sure where to start?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Describe your space — “a 10x12 bedroom, warm wood, under ₹20,000” — and the assistant
            will put together a shortlist from real listings, with delivery times to your PIN code.
          </p>
        </section>
      </div>
    </div>
  );
}
