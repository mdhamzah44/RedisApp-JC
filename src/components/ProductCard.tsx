import { Link } from "@tanstack/react-router";
import { Heart, Zap } from "lucide-react";
import { memo } from "react";

import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { sellerBySlug, type Product } from "@/data/catalog";
import { discountPct, inr } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

function ProductCardBase({ product, priority = false }: { product: Product; priority?: boolean }) {
  const wished = useAppState((s) => s.wishlists.some((w) => w.slugs.includes(product.slug)));
  const off = discountPct(product.price, product.comparePrice);
  const seller = sellerBySlug.get(product.seller);

  return (
    <article className="group relative flex flex-col">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative block overflow-hidden rounded-xl border border-border bg-card"
      >
        <img
          src={product.image}
          alt={`${product.name} — handmade ${product.materials[0]?.toLowerCase()}`}
          width={1024}
          height={768}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-brand-foreground">
            {off}% off
          </span>
        )}
        {product.stock > 0 && product.stock <= 4 && (
          <span className="absolute bottom-2 left-2 rounded-full bg-foreground/85 px-2 py-0.5 text-[11px] font-medium text-background">
            Only {product.stock} left
          </span>
        )}
      </Link>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label={wished ? "Remove from favourites" : "Add to favourites"}
        onClick={() => actions.toggleWishlist(product.slug)}
        className="absolute right-2 top-2 size-8 rounded-full shadow-sm"
      >
        <Heart className={cn("size-4", wished && "fill-brand text-brand")} />
      </Button>

      <div className="mt-2 space-y-1">
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
        >
          {product.name}
        </Link>
        <StarRating rating={product.rating} count={product.reviewCount} />
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-base font-semibold">{inr(product.price)}</span>
          {product.comparePrice && (
            <span className="text-xs text-muted-foreground line-through">
              {inr(product.comparePrice)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {seller?.name} · {product.soldLast7Days} sold this week
        </p>
        {product.shipDays <= 5 && (
          <p className="inline-flex items-center gap-1 text-xs text-success">
            <Zap className="size-3" /> Ships in {product.shipDays} days
          </p>
        )}
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);
