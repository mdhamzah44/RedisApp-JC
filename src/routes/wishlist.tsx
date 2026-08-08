import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productBySlug, type Product } from "@/data/catalog";
import { actions, useAppState } from "@/lib/store";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Your favourites — MakinItHome" },
      {
        name: "description",
        content:
          "Saved handmade pieces, organised into lists you can share with family and friends.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your favourites — MakinItHome" },
      {
        property: "og:description",
        content: "Saved handmade pieces organised into shareable lists.",
      },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const lists = useAppState((s) => s.wishlists);
  const [name, setName] = useState("");

  const total = lists.reduce((n, l) => n + l.slugs.length, 0);

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Favourites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} saved pieces across {lists.length} lists
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="New list (e.g. Living room)"
            aria-label="New list name"
            className="w-56"
          />
          <Button
            variant="outline"
            onClick={() => {
              if (!name.trim()) return;
              actions.createWishlist(name.trim());
              setName("");
              toast.success("List created");
            }}
          >
            Create
          </Button>
        </div>
      </div>

      {total === 0 && (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">Nothing saved yet — tap the heart on any listing.</p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/search" search={{ page: 1 }}>
              Browse handmade
            </Link>
          </Button>
        </div>
      )}

      {lists.map((list) => {
        const items = list.slugs.map((s) => productBySlug.get(s)).filter(Boolean) as Product[];
        if (items.length === 0) return null;
        return (
          <section key={list.id} className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">
                {list.name} <span className="text-sm text-muted-foreground">({items.length})</span>
              </h2>
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => {
                  const url = typeof window !== "undefined" ? window.location.href : "";
                  void navigator.clipboard?.writeText(url);
                  toast.success("Share link copied");
                }}
              >
                Share list
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
