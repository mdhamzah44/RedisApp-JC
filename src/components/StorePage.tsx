import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Clock,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { Browse, type BrowseSearch } from "@/components/Browse";
import { MessageStoreButton } from "@/components/MessageStoreButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { products as allProducts, type Product, type Seller } from "@/data/catalog";
import { inr } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";

/**
 * A seller's own shop — used both at /shop/:slug and as the home page when the
 * request arrives on that store's own domain. Every field comes from what the
 * seller maintains in the Seller Hub.
 */
export function StorePage({
  seller,
  search,
  onChange,
  standalone = false,
}: {
  seller: Seller;
  search: BrowseSearch;
  onChange: (next: Partial<BrowseSearch>) => void;
  /** true when this is the store's own domain home page. */
  standalone?: boolean;
}) {
  const items: Product[] = allProducts.filter((p) => p.seller === seller.slug);
  const following = useAppState((s) => s.following.includes(seller.slug));
  const policies = seller.policies;

  const bestPrice = items.length ? Math.min(...items.map((p) => p.price)) : 0;

  return (
    <div className={standalone ? "" : "container-page py-8"}>
      {/* Banner / identity */}
      <header
        className={
          standalone
            ? "relative overflow-hidden border-b border-border"
            : "relative overflow-hidden rounded-2xl border border-border"
        }
      >
        {policies.bannerUrl ? (
          <img
            src={policies.bannerUrl}
            alt={`${seller.name} storefront`}
            className="h-48 w-full object-cover md:h-72"
          />
        ) : (
          <div className="h-28 w-full bg-gradient-to-r from-brand/20 via-secondary to-background md:h-40" />
        )}

        <div className={standalone ? "container-page" : "px-6 md:px-8"}>
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4 pb-6">
            <div className="flex items-end gap-4">
              {seller.logoUrl ? (
                <img
                  src={seller.logoUrl}
                  alt={`${seller.name} logo`}
                  className="size-20 rounded-2xl border-4 border-background object-cover shadow-lift"
                />
              ) : (
                <div
                  className="flex size-20 items-center justify-center rounded-2xl border-4 border-background font-display text-2xl text-brand-foreground shadow-lift"
                  style={{ background: seller.logoColor || "#F1641E" }}
                >
                  {seller.name.slice(0, 1)}
                </div>
              )}
              <div className="pb-1">
                <h1 className="font-display text-3xl">{seller.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {seller.tagline || seller.city}
                  {seller.since ? ` · established ${seller.since}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              <Button
                variant={following ? "secondary" : "default"}
                className="rounded-full"
                onClick={() => actions.toggleFollow(seller.slug)}
              >
                {following ? "Following" : "Follow shop"}
              </Button>
              <MessageStoreButton sellerSlug={seller.slug} storeName={seller.name} />
            </div>
          </div>
        </div>
      </header>

      <div className={standalone ? "container-page py-8" : ""}>
        {policies.vacationMode && (
          <p className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            {policies.vacationMessage ||
              `${seller.name} is on a short break — orders will ship once the workshop reopens.`}
          </p>
        )}
        {policies.announcement && !policies.vacationMode && (
          <p className="mt-6 rounded-xl border border-border bg-secondary/60 p-4 text-sm">
            {policies.announcement}
          </p>
        )}

        {/* Trust stats */}
        <dl className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-3.5" /> Ships from
            </dt>
            <dd className="mt-1 font-medium">
              {seller.shipsFrom || `${seller.city}, ${seller.state}`}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5" /> Typical reply time
            </dt>
            <dd className="mt-1 font-medium">{seller.responseMinutes} minutes</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <RotateCcw className="size-3.5" /> Returns
            </dt>
            <dd className="mt-1 font-medium">
              {seller.returnDays} days{seller.returnPickupFree ? ", free pickup" : ""}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="size-3.5" /> Dispatch
            </dt>
            <dd className="mt-1 font-medium">
              {policies.processingDays || 2} working days · {seller.onTimePct}% on time
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          {seller.badges.map((b) => (
            <Badge key={b} variant="secondary" className="gap-1">
              <BadgeCheck className="size-3" /> {b}
            </Badge>
          ))}
          {seller.rating > 0 && (
            <Badge variant="secondary">
              ★ {seller.rating.toFixed(1)} · {seller.reviews} reviews
            </Badge>
          )}
          {policies.freeShippingOver > 0 && (
            <Badge variant="secondary">Free shipping over {inr(policies.freeShippingOver)}</Badge>
          )}
          {bestPrice > 0 && <Badge variant="secondary">From {inr(bestPrice)}</Badge>}
        </div>

        {(seller.about || policies.story) && (
          <section className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">Our story</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {policies.story || seller.about}
            </p>
          </section>
        )}

        {seller.team.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl">The people behind the work</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {seller.team.map((m) => (
                <article key={`${m.name}-${m.role}`} className="card-surface p-5">
                  {m.photoUrl && (
                    <img
                      src={m.photoUrl}
                      alt={m.name}
                      className="mb-3 size-16 rounded-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.role}
                    {m.rank ? ` · ${m.rank}` : ""}
                  </p>
                  {m.bio && <p className="mt-2 text-sm text-muted-foreground">{m.bio}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Products */}
        <div className="mt-10">
          <Browse
            all={items}
            search={search}
            onChange={onChange}
            title={`${items.length} pieces from ${seller.name}`}
          />
        </div>

        {/* Store policies */}
        <section className="mt-12 grid gap-4 md:grid-cols-2">
          {[
            ["Shipping", policies.shipping],
            ["Returns & refunds", policies.returns],
            ["Warranty", policies.warranty],
            ["Privacy", policies.privacy],
          ]
            .filter(([, body]) => Boolean(body))
            .map(([title, body]) => (
              <article key={title} className="card-surface p-6">
                <h2 className="font-display text-lg">{title}</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </article>
            ))}
          <article className="card-surface p-6">
            <h2 className="font-display text-lg">Order handling</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Processing time: {policies.processingDays || 2} working days</li>
              {policies.freeShippingOver > 0 && (
                <li>Free shipping on orders over {inr(policies.freeShippingOver)}</li>
              )}
              {policies.giftWrapFee > 0 && <li>Gift wrap: {inr(policies.giftWrapFee)}</li>}
              {policies.rushFee > 0 && <li>Rush production: {inr(policies.rushFee)}</li>}
              {policies.serviceablePincodes && (
                <li>Serviceable PIN codes: {policies.serviceablePincodes}</li>
              )}
            </ul>
          </article>
          <article className="card-surface p-6">
            <h2 className="font-display text-lg">Contact & legal</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {seller.addressLine && (
                <li className="flex gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" /> {seller.addressLine}
                </li>
              )}
              {seller.supportEmail && (
                <li className="flex gap-2">
                  <Mail className="mt-0.5 size-3.5 shrink-0" />
                  {/* See the footer's note on suppressHydrationWarning — Cloudflare's Email
                      Address Obfuscation rewrites this href/text before React hydrates. */}
                  <a
                    href={`mailto:${seller.supportEmail}`}
                    className="hover:text-foreground"
                    suppressHydrationWarning
                  >
                    {seller.supportEmail}
                  </a>
                </li>
              )}
              {seller.phone && (
                <li className="flex gap-2">
                  <Phone className="mt-0.5 size-3.5 shrink-0" /> {seller.phone}
                </li>
              )}
              {seller.gstNumber && (
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> GSTIN {seller.gstNumber}
                </li>
              )}
            </ul>
            {!standalone && (
              <p className="mt-4 text-xs text-muted-foreground">
                Sold on MakinItHome ·{" "}
                <Link
                  to="/policies/$slug"
                  params={{ slug: "buyer-protection" }}
                  className="underline"
                >
                  Buyer protection applies
                </Link>
              </p>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}
