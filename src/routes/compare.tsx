import { Link, createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";

import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { productBySlug, sellerBySlug, type Product } from "@/data/catalog";
import { inr } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare handmade pieces — MakinItHome" },
      {
        name: "description",
        content:
          "Compare materials, dimensions, warranty, delivery time and price across saved handmade listings.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Compare pieces — MakinItHome" },
      { property: "og:description", content: "Side-by-side comparison of handmade listings." },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const slugs = useAppState((s) => s.compare);
  const items = slugs.map((s) => productBySlug.get(s)).filter(Boolean) as Product[];

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-3xl">Nothing to compare yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add up to four pieces using the compare icon on any listing.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/search" search={{ page: 1 }}>
            Browse handmade
          </Link>
        </Button>
      </div>
    );
  }

  const rows: [string, (p: Product) => string][] = [
    ["Price", (p) => inr(p.price)],
    ["Rating", (p) => `${p.rating.toFixed(1)} (${p.reviewCount})`],
    ["Material", (p) => p.materials.join(", ")],
    ["Dimensions", (p) => p.dimensions],
    ["Colours", (p) => p.colors.join(", ")],
    ["Assembly", (p) => p.assembly],
    ["Warranty", (p) => `${p.warrantyMonths} months`],
    ["Dispatch", (p) => `${p.shipDays} days`],
    ["Eco score", (p) => `${p.ecoScore}/10`],
    ["Seller", (p) => sellerBySlug.get(p.seller)?.name ?? "—"],
  ];

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-3xl">Compare</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="w-36" />
              {items.map((p) => (
                <th key={p.slug} className="p-3 text-left align-top">
                  <div className="relative">
                    <button
                      type="button"
                      aria-label={`Remove ${p.name}`}
                      className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                      onClick={() => actions.toggleCompare(p.slug)}
                    >
                      <X className="size-3.5" />
                    </button>
                    <img
                      src={p.image}
                      alt=""
                      width={220}
                      height={165}
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded-lg object-cover"
                    />
                  </div>
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="mt-2 block font-medium hover:underline"
                  >
                    {p.name}
                  </Link>
                  <div className="mt-1">
                    <StarRating rating={p.rating} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, get]) => (
              <tr key={label} className="border-t border-border">
                <th scope="row" className="p-3 text-left font-medium">
                  {label}
                </th>
                {items.map((p) => (
                  <td key={p.slug} className="p-3 text-muted-foreground">
                    {get(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
