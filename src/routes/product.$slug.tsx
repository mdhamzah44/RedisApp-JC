import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bell,
  Eye,
  Heart,
  MapPin,
  MessageSquare,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MessageStoreButton } from "@/components/MessageStoreButton";
import { ProductCard } from "@/components/ProductCard";
import { StarRating } from "@/components/StarRating";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productBySlug, sellerBySlug, type Product, type Seller } from "@/data/catalog";
import { codAvailable, deliveryEstimate, discountPct, inr, isServiceable } from "@/lib/format";
import { relatedTo } from "@/lib/search";
import { absoluteUrl, canonicalLink, shareMeta, SITE_URL } from "@/lib/seo";
import { actions, useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }): { product: Product; seller: Seller } => {
    const product = productBySlug.get(params.slug);
    if (!product) throw notFound();
    const seller = sellerBySlug.get(product.seller)!;
    return { product, seller };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product not found — MakinItHome" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { product, seller } = loaderData;
    const path = `/product/${params.slug}`;
    // Lead the title with the strongest keyword (seller-entered or
    // auto-generated) so the most relevant term appears first — classic
    // on-page SEO — then fall back to the product name if it's already there.
    const lead =
      product.primaryKeyword &&
      !product.name.toLowerCase().includes(product.primaryKeyword.toLowerCase())
        ? `${product.name} — ${product.primaryKeyword}`
        : product.name;
    const title = `${lead} | MakinItHome`;
    const description = `${product.shortDescription} ${inr(product.price)}. Sold by ${seller.name}, ${seller.city}. ${product.warrantyMonths}-month warranty, 7-day returns.`;
    const image = product.images[0] ?? product.image;

    return {
      meta: [
        { title: title.slice(0, 60) },
        { name: "description", content: description.slice(0, 158) },
        { name: "keywords", content: product.keywords.slice(0, 15).join(", ") },
        { property: "og:title", content: product.name },
        { property: "og:description", content: description.slice(0, 158) },
        { property: "og:type", content: "product" },
        { property: "product:price:amount", content: String(product.price) },
        { property: "product:price:currency", content: "INR" },
        ...shareMeta(path, image),
      ],
      links: [canonicalLink(path)],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": absoluteUrl(`${path}#product`),
            name: product.name,
            description: product.shortDescription,
            sku: product.id,
            url: absoluteUrl(path),
            image: product.images.length ? product.images : [product.image],
            material: product.materials[0],
            category: product.subcategory,
            keywords: product.keywords.slice(0, 10).join(", "),
            brand: { "@type": "Brand", name: seller.name },
            // E-E-A-T: name the maker as the seller of record with a link
            // back to their verified storefront, not just a brand string.
            offers: {
              "@type": "Offer",
              url: absoluteUrl(path),
              price: product.price,
              priceCurrency: "INR",
              availability:
                product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              seller: {
                "@type": "Organization",
                name: seller.name,
                url: absoluteUrl(`/shop/${seller.slug}`),
              },
            },
            ...(product.reviewCount > 0 && {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: product.rating,
                reviewCount: product.reviewCount,
              },
            }),
            ...(product.reviews.length > 0 && {
              review: product.reviews.slice(0, 5).map((r) => ({
                "@type": "Review",
                author: { "@type": "Person", name: r.author },
                datePublished: r.date,
                reviewBody: r.body,
                reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
              })),
            }),
          }),
        },
        // AEO — most answer engines and AI assistants pull FAQPage schema
        // directly into their responses, so the product's own FAQs (already
        // shown in the accordion on-page) are re-declared here machine-readably.
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: product.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              {
                "@type": "ListItem",
                position: 2,
                name: product.subcategory,
                item: absoluteUrl(`/c/${product.category}`),
              },
              { "@type": "ListItem", position: 3, name: product.name, item: absoluteUrl(path) },
            ],
          }),
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, seller } = Route.useLoaderData() as { product: Product; seller: Seller };
  const [variant, setVariant] = useState(product.variants[0]!);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [pin, setPin] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const gallery = product.images.length ? product.images : [product.image];

  const wished = useAppState((s) => s.wishlists.some((w) => w.slugs.includes(product.slug)));
  const following = useAppState((s) => s.following.includes(seller.slug));
  const compared = useAppState((s) => s.compare.includes(product.slug));
  const alerted = useAppState((s) => s.alerts.includes(product.slug));

  useEffect(() => {
    actions.viewed(product.slug);
    setVariant(product.variants[0]!);
  }, [product.slug, product.variants]);

  const price = product.price + variant.priceDelta;
  const off = discountPct(price, product.comparePrice);
  const related = useMemo(() => relatedTo(product, 8), [product]);
  const lowest = Math.min(...product.priceHistory.map((h) => h.price));

  const attrAvg: Record<string, number> = product.reviews[0]?.attributes ?? {
    quality: 0,
    packaging: 0,
    value: 0,
    delivery: 0,
  };
  const highlights = ["sturdy", "beautiful finish", "well packed", "worth the price"];

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>{" "}
        /{" "}
        <Link to="/c/$slug" params={{ slug: product.category }} className="hover:text-foreground">
          {product.subcategory}
        </Link>{" "}
        / <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* Gallery with hover zoom */}
        <div>
          <div
            className="overflow-hidden rounded-2xl border border-border bg-card"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setOrigin(
                `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`,
              );
            }}
          >
            <img
              src={gallery[activeImage] ?? product.image}
              alt={`${product.name} handmade in ${product.materials[0]}`}
              width={1024}
              height={768}
              className="aspect-[4/3] w-full object-cover transition-transform duration-200"
              style={{ transformOrigin: origin, transform: zoom ? "scale(2)" : "scale(1)" }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Hover the image to zoom.</p>

          {gallery.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={cn(
                    "overflow-hidden rounded-lg border transition-colors",
                    i === activeImage ? "border-foreground" : "border-border hover:border-input",
                  )}
                >
                  <img
                    src={src}
                    alt={`${product.name} photo ${i + 1}`}
                    width={200}
                    height={150}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {product.videos.length > 0 && (
            <div className="mt-4 space-y-2">
              {product.videos.map((src) => (
                <video
                  key={src}
                  src={src}
                  controls
                  playsInline
                  className="w-full rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div>
          <h1 className="font-display text-3xl leading-tight">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StarRating rating={product.rating} count={product.reviewCount} />
            <Link
              to="/shop/$slug"
              params={{ slug: seller.slug }}
              className="text-sm text-muted-foreground underline-offset-2 hover:underline"
            >
              {seller.name} · {seller.city}
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl">{inr(price)}</span>
            {product.comparePrice && (
              <>
                <span className="text-muted-foreground line-through">
                  {inr(product.comparePrice)}
                </span>
                <Badge className="bg-brand text-brand-foreground">{off}% off</Badge>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Lowest in the last 6 months: {inr(lowest)} · inclusive of all taxes
          </p>

          {/* Product snapshot — SEO/GEO/LLMO block */}
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border bg-secondary/50 p-4 text-sm">
            <dt className="text-muted-foreground">Material</dt>
            <dd className="font-medium">{product.materials.join(", ")}</dd>
            <dt className="text-muted-foreground">Dimensions</dt>
            <dd className="font-medium">{product.dimensions}</dd>
            <dt className="text-muted-foreground">Assembly</dt>
            <dd className="font-medium">{product.assembly}</dd>
            <dt className="text-muted-foreground">Warranty</dt>
            <dd className="font-medium">{product.warrantyMonths} months</dd>
            <dt className="text-muted-foreground">Returns</dt>
            <dd className="font-medium">7-day free pickup</dd>
            <dt className="text-muted-foreground">Seller</dt>
            <dd className="font-medium">GST & KYC verified</dd>
          </dl>

          {/* Variants */}
          <div className="mt-5">
            <p className="text-sm font-semibold">Choose an option</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  disabled={v.stock === 0}
                  onClick={() => setVariant(v)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    v.name === variant.name
                      ? "border-foreground bg-foreground text-background"
                      : "border-input hover:bg-muted",
                    v.stock === 0 && "cursor-not-allowed opacity-40 line-through",
                  )}
                >
                  {v.name}
                  {v.priceDelta > 0 && ` +${inr(v.priceDelta)}`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm">
              {variant.stock > 0 ? (
                <span className="text-success">In stock — {variant.stock} available</span>
              ) : (
                <span className="text-destructive">Out of stock in this option</span>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-input">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQty(Math.max(1, qty - 1))}
                aria-label="Decrease quantity"
              >
                −
              </Button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQty(qty + 1)}
                aria-label="Increase quantity"
              >
                +
              </Button>
            </div>
            <Button
              size="lg"
              className="flex-1 rounded-full"
              disabled={variant.stock === 0}
              onClick={() => {
                actions.addToCart({
                  slug: product.slug,
                  qty,
                  variant: variant.name,
                  price,
                  seller: seller.slug,
                });
                toast.success("Added to cart", {
                  description: `${product.name} · ${variant.name}`,
                });
              }}
            >
              Add to cart
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full"
              aria-label="Add to favourites"
              onClick={() => actions.toggleWishlist(product.slug)}
            >
              <Heart className={cn("size-4", wished && "fill-brand text-brand")} />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full"
              aria-label="Add to compare"
              onClick={() => {
                actions.toggleCompare(product.slug);
                toast(compared ? "Removed from compare" : "Added to compare");
              }}
            >
              <Scale className={cn("size-4", compared && "text-brand")} />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                actions.toggleAlert(product.slug);
                toast(alerted ? "Price alert removed" : "We'll WhatsApp you if the price drops");
              }}
            >
              <Bell className="size-4" /> {alerted ? "Alert on" : "Price drop alert"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => toast("Chat opened with " + seller.name)}
            >
              <MessageSquare className="size-4" /> Chat with seller
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const url = typeof window !== "undefined" ? window.location.href : "";
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`${product.name} — ${url}`)}`,
                  "_blank",
                );
              }}
            >
              Share on WhatsApp
            </Button>
          </div>

          {/* PIN serviceability */}
          <div className="mt-6 rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="size-4" /> Delivery & COD by PIN code
            </p>
            <div className="mt-2 flex gap-2">
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit PIN code"
                inputMode="numeric"
                aria-label="PIN code"
                className="max-w-[180px]"
              />
              <Button variant="outline" onClick={() => actions.setPin(pin)}>
                Check
              </Button>
            </div>
            {pin.length === 6 && (
              <div className="mt-3 space-y-1 text-sm">
                {isServiceable(pin) ? (
                  <>
                    <p className="text-success">
                      Delivers by {deliveryEstimate(pin, product.shipDays)}
                    </p>
                    <p className="text-muted-foreground">
                      {codAvailable(pin)
                        ? "Cash on delivery available"
                        : "Prepaid only at this PIN"}{" "}
                      · Free shipping over ₹1,499
                    </p>
                  </>
                ) : (
                  <p className="text-destructive">Enter a valid 6-digit PIN code.</p>
                )}
              </div>
            )}
          </div>

          {/* Trust */}
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" /> Secure UPI, card & COD payments
            </li>
            <li className="flex items-center gap-2">
              <RotateCcw className="size-4 text-success" /> {seller.returnDays}-day return
              {seller.returnPickupFree ? ", free pickup" : ""}
            </li>
            <li className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-success" /> Verified seller · replies in{" "}
              {seller.responseMinutes} min
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="size-4 text-success" /> Eco score {product.ecoScore}/10 ·
              handmade
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-success" /> Ships from{" "}
              {seller.shipsFrom || `${seller.city}, ${seller.state}`}
            </li>
          </ul>

          <div className="mt-4">
            <MessageStoreButton
              sellerSlug={seller.slug}
              storeName={seller.name}
              productSlug={product.slug}
              subject={product.name}
              label={`Message ${seller.name}`}
              className="w-full sm:w-auto"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Ask about custom sizes, finishes or bulk orders — typically answered in{" "}
              {seller.responseMinutes} minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <Tabs defaultValue="details" className="mt-14">
        <TabsList className="flex-wrap">
          <TabsTrigger value="details">Description</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({product.reviewCount})</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="price">Price history</TabsTrigger>
          <TabsTrigger value="seller">Seller</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="max-w-3xl space-y-4 pt-6">
          {product.description.split("\n\n").map((para) => (
            <p key={para.slice(0, 24)} className="text-sm leading-relaxed text-muted-foreground">
              {para}
            </p>
          ))}
          <div>
            <h2 className="font-display text-lg">Specifications</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {[
                  ["Material", product.materials.join(", ")],
                  ["Dimensions", product.dimensions],
                  ["Colours available", product.colors.join(", ")],
                  ["Sizes", product.sizes.join(", ")],
                  ["Assembly", product.assembly],
                  ["Warranty", `${product.warrantyMonths} months`],
                  ["Care", product.care],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-border">
                    <th scope="row" className="w-40 py-2 text-left font-medium">
                      {k}
                    </th>
                    <td className="py-2 text-muted-foreground">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="pt-6">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
            <div className="space-y-4">
              <div className="card-surface p-4">
                <p className="font-display text-3xl">{product.rating.toFixed(1)}</p>
                <StarRating rating={product.rating} count={product.reviewCount} />
                {product.reviews.length > 0 && (
                  <div className="mt-4 space-y-2 text-sm">
                    {Object.entries(attrAvg).map(([k, v]) => (
                      <div key={k}>
                        <div className="flex justify-between capitalize">
                          <span>{k}</span>
                          <span className="font-medium">{v}</span>
                        </div>
                        <Progress value={(v / 5) * 100} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {product.reviews.length > 0 && (
                <div className="card-surface p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Sparkles className="size-4 text-brand" /> AI review summary
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Across {product.reviewCount} verified purchases, customers consistently praise
                    the finish and packaging. Frequently mentioned: {highlights.join(", ")}. The
                    most common criticism is that handmade colour varies slightly from the photos.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {product.reviews.length === 0 && (
                <div className="card-surface p-6 text-center text-sm text-muted-foreground">
                  No reviews yet — be the first to buy and review this piece.
                </div>
              )}
              {product.reviews.map((r) => (
                <article key={r.author + r.date} className="card-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.author}</span>
                    {r.verified && (
                      <Badge variant="secondary" className="gap-1">
                        <BadgeCheck className="size-3" /> Verified purchase
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{r.date}</span>
                  </div>
                  <div className="mt-1">
                    <StarRating rating={r.rating} />
                  </div>
                  <p className="mt-2 font-medium">{r.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                  {r.photos > 0 && (
                    <div className="mt-3 flex gap-2">
                      {Array.from({ length: r.photos }).map((_, i) => (
                        <img
                          key={i}
                          src={product.image}
                          alt=""
                          width={72}
                          height={72}
                          loading="lazy"
                          className="size-16 rounded-md object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <button type="button" className="underline-offset-2 hover:underline">
                      Helpful ({r.helpful})
                    </button>
                    <button type="button" className="underline-offset-2 hover:underline">
                      Report
                    </button>
                  </div>
                  <Separator className="my-3" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{seller.name} replied:</span>{" "}
                    Thank you for the detailed review — sharing it with our workshop team.
                  </p>
                </article>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="max-w-3xl pt-6">
          <Accordion type="single" collapsible>
            {product.faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-4 text-sm text-muted-foreground">
            Have another question?{" "}
            <button
              type="button"
              className="font-medium text-brand underline"
              onClick={() => toast("Question sent to the seller")}
            >
              Ask before buying
            </button>{" "}
            — answers become public FAQs.
          </p>
        </TabsContent>

        <TabsContent value="price" className="max-w-xl pt-6">
          <p className="text-sm text-muted-foreground">
            Transparent pricing — this is what the seller actually charged over time.
          </p>
          <ul className="mt-4 space-y-3">
            {product.priceHistory.map((h) => (
              <li key={h.label} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-muted-foreground">{h.label}</span>
                <span
                  className="h-3 rounded-full bg-brand/70"
                  style={{ width: `${(h.price / product.priceHistory[0]!.price) * 60}%` }}
                />
                <span className="font-medium">{inr(h.price)}</span>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="seller" className="max-w-3xl pt-6">
          <div className="card-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">{seller.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {seller.city} · since {seller.since} · {seller.onTimePct}% on-time
                </p>
              </div>
              <Button
                variant={following ? "secondary" : "default"}
                onClick={() => actions.toggleFollow(seller.slug)}
              >
                {following ? "Following" : "Follow shop"}
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{seller.about}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {seller.badges.map((b) => (
                <Badge key={b} variant="secondary">
                  {b}
                </Badge>
              ))}
            </div>
            <Link
              to="/shop/$slug"
              params={{ slug: seller.slug }}
              className="mt-4 inline-block text-sm font-medium text-brand underline"
            >
              Visit storefront →
            </Link>
          </div>
        </TabsContent>
      </Tabs>

      <section className="mt-16">
        <h2 className="font-display text-2xl">You may also like</h2>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
