import { Link, createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { productBySlug, sellerBySlug } from "@/data/catalog";
import { deliveryEstimate, inr } from "@/lib/format";
import { actions, useAppState, type CartLine } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — MakinItHome" },
      {
        name: "description",
        content:
          "Review your handmade picks, apply coupons and check delivery estimates before checkout.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your cart — MakinItHome" },
      { property: "og:description", content: "Review your handmade picks before checkout." },
    ],
  }),
  component: CartPage,
});

const COUPONS: Record<string, number> = { HANDMADE10: 0.1, FIRSTHOME: 0.15, FESTIVE5: 0.05 };

function CartPage() {
  const cart = useAppState((s) => s.cart);
  const saved = useAppState((s) => s.saved);
  const pin = useAppState((s) => s.pin);
  const points = useAppState((s) => s.points);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; rate: number } | null>(null);
  const [usePoints, setUsePoints] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, CartLine[]>();
    for (const line of cart) {
      const arr = map.get(line.seller) ?? [];
      arr.push(line);
      map.set(line.seller, arr);
    }
    return [...map.entries()];
  }, [cart]);

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= 1499 ? 0 : 99;
  const couponOff = applied ? Math.round(subtotal * applied.rate) : 0;
  const pointsOff = usePoints ? Math.min(points, subtotal - couponOff) : 0;
  const total = Math.max(0, subtotal + shipping - couponOff - pointsOff);

  if (cart.length === 0 && saved.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Find something made by hand — most pieces ship within {2}–7 days.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/search" search={{ page: 1 }}>
            Start shopping
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-3xl">Your cart</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {groups.map(([sellerSlug, lines]) => {
            const seller = sellerBySlug.get(sellerSlug);
            return (
              <section key={sellerSlug} className="card-surface p-4">
                <p className="text-sm font-semibold">
                  {seller?.name ?? "Maker"}{" "}
                  <span className="font-normal text-muted-foreground">
                    · ships from {seller?.city}
                  </span>
                </p>
                <Separator className="my-3" />
                <ul className="space-y-4">
                  {lines.map((line) => {
                    const p = productBySlug.get(line.slug);
                    if (!p) return null;
                    return (
                      <li key={line.slug + line.variant} className="flex gap-4">
                        <img
                          src={p.image}
                          alt={p.name}
                          width={112}
                          height={112}
                          loading="lazy"
                          className="size-24 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/product/$slug"
                            params={{ slug: p.slug }}
                            className="font-medium hover:underline"
                          >
                            {p.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">{line.variant}</p>
                          <p className="mt-1 text-sm text-success">
                            Delivery by {deliveryEstimate(pin || "560001", p.shipDays)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                            <div className="flex items-center rounded-full border border-input">
                              <button
                                type="button"
                                aria-label="Decrease quantity"
                                className="px-3 py-1"
                                onClick={() =>
                                  actions.setQty(line.slug, line.variant, line.qty - 1)
                                }
                              >
                                −
                              </button>
                              <span className="w-6 text-center">{line.qty}</span>
                              <button
                                type="button"
                                aria-label="Increase quantity"
                                className="px-3 py-1"
                                onClick={() =>
                                  actions.setQty(line.slug, line.variant, line.qty + 1)
                                }
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="text-muted-foreground underline-offset-2 hover:underline"
                              onClick={() => actions.saveForLater(line.slug, line.variant)}
                            >
                              Save for later
                            </button>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-muted-foreground hover:text-destructive"
                              onClick={() => actions.removeFromCart(line.slug, line.variant)}
                            >
                              <Trash2 className="size-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                        <p className="font-medium">{inr(line.price * line.qty)}</p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {saved.length > 0 && (
            <section className="card-surface p-4">
              <h2 className="font-display text-lg">Saved for later ({saved.length})</h2>
              <ul className="mt-3 space-y-3">
                {saved.map((line) => {
                  const p = productBySlug.get(line.slug);
                  if (!p) return null;
                  return (
                    <li key={line.slug + line.variant} className="flex items-center gap-3">
                      <img
                        src={p.image}
                        alt=""
                        width={56}
                        height={56}
                        loading="lazy"
                        className="size-14 rounded-md object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {line.variant} · {inr(line.price)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actions.moveToCart(line.slug, line.variant)}
                      >
                        Move to cart
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* Summary */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card-surface p-5">
            <h2 className="font-display text-lg">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{inr(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd>
                  {shipping === 0 ? <span className="text-success">Free</span> : inr(shipping)}
                </dd>
              </div>
              {couponOff > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Coupon {applied?.code}</dt>
                  <dd>−{inr(couponOff)}</dd>
                </div>
              )}
              {pointsOff > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Loyalty points</dt>
                  <dd>−{inr(pointsOff)}</dd>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd>{inr(total)}</dd>
              </div>
            </dl>

            {subtotal > 0 && subtotal < 1499 && (
              <p className="mt-3 rounded-md bg-secondary p-2 text-xs">
                Add {inr(1499 - subtotal)} more for free shipping.
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <Input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase().slice(0, 16))}
                placeholder="Coupon code"
                aria-label="Coupon code"
              />
              <Button
                variant="outline"
                onClick={() => {
                  const rate = COUPONS[coupon];
                  if (rate) {
                    setApplied({ code: coupon, rate });
                    toast.success(`${coupon} applied — ${rate * 100}% off`);
                  } else {
                    toast.error("That coupon isn't valid");
                  }
                }}
              >
                Apply
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Try HANDMADE10 or FIRSTHOME.</p>

            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => setUsePoints(e.target.checked)}
              />
              Redeem {points} loyalty points
            </label>

            <Button
              asChild
              size="lg"
              className="mt-4 w-full rounded-full"
              disabled={cart.length === 0}
            >
              <Link to="/checkout">Proceed to checkout</Link>
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              UPI · Cards · Net banking · COD on eligible PINs
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
