import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Lock, MapPin, Plus, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AddressDialog } from "@/components/AddressDialog";
import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { productBySlug, sellerBySlug } from "@/data/catalog";
import type { Address } from "@/lib/account.functions";
import { deliveryEstimate, inr } from "@/lib/format";
import {
  confirmPayment,
  createPaymentOrder,
  getPaymentConfig,
  placeCodOrder,
} from "@/lib/payments.functions";
import { useAddresses, useSessionUser } from "@/lib/session";
import { actions, useAppState } from "@/lib/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Secure checkout — MakinItHome" },
      {
        name: "description",
        content:
          "Pay by UPI, card, netbanking or cash on delivery. Orders go straight to the maker's workshop.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Secure checkout — MakinItHome" },
      { property: "og:description", content: "UPI, card and COD checkout with saved addresses." },
    ],
  }),
  component: CheckoutPage,
});

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(Boolean(window.Razorpay));
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

function CheckoutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cart = useAppState((s) => s.cart);
  const pin = useAppState((s) => s.pin);

  const { data: user, isLoading: sessionLoading } = useSessionUser();
  const { data: addresses = [], isLoading: addressesLoading } = useAddresses(Boolean(user));
  const { data: payment } = useQuery({
    queryKey: ["payment-config"],
    queryFn: () => getPaymentConfig(),
    staleTime: 5 * 60_000,
  });

  const [authOpen, setAuthOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [placed, setPlaced] = useState<string | null>(null);

  // The buyer must have an address on file before they can pay — if there is
  // none, the modal opens on arrival and what they type is saved to the account.
  useEffect(() => {
    if (!user || addressesLoading) return;
    if (addresses.length === 0) setAddressOpen(true);
    else if (!selected) setSelected(addresses.find((a) => a.isDefault)?.id ?? addresses[0]!.id);
  }, [user, addresses, addressesLoading, selected]);

  const lines = useMemo(
    () =>
      cart
        .map((l) => ({ line: l, product: productBySlug.get(l.slug) }))
        .filter((x): x is { line: (typeof cart)[number]; product: NonNullable<typeof x.product> } =>
          Boolean(x.product),
        ),
    [cart],
  );
  const subtotal = lines.reduce((a, x) => a + x.line.price * x.line.qty, 0);
  const shipping = subtotal >= 1499 || subtotal === 0 ? 0 : 99;
  const total = subtotal + shipping;

  const items = cart.map((l) => ({ slug: l.slug, qty: l.qty, variant: l.variant }));

  const finish = (orderNumber: string) => {
    actions.clearCart();
    setPlaced(orderNumber);
    void qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const payOnline = useMutation({
    mutationFn: async () => {
      const ready = await loadRazorpay();
      if (!ready) throw new Error("Could not reach Razorpay. Check your connection and retry.");
      const order = await createPaymentOrder({ data: { items, addressId: selected } });
      return new Promise<string>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: order.keyId,
          amount: order.amount,
          currency: "INR",
          name: "MakinItHome",
          description: `Order ${order.orderNumber}`,
          order_id: order.razorpayOrderId,
          prefill: order.customer,
          theme: { color: "#F1641E" },
          modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
          handler: (res: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            confirmPayment({
              data: {
                razorpayOrderId: res.razorpay_order_id,
                razorpayPaymentId: res.razorpay_payment_id,
                razorpaySignature: res.razorpay_signature,
              },
            })
              .then((r) => resolve(r.orderNumber || order.orderNumber))
              .catch(reject);
          },
        });
        rzp.open();
      });
    },
    onSuccess: finish,
    onError: (e: Error) => toast.error(e.message),
  });

  const payCod = useMutation({
    mutationFn: () => placeCodOrder({ data: { items, addressId: selected } }),
    onSuccess: (r) => finish(r.orderNumber),
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = payOnline.isPending || payCod.isPending;

  if (placed) {
    return (
      <div className="container-page py-16 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h1 className="mt-4 font-display text-3xl">Order {placed} confirmed</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          The maker has it in their dashboard already. You'll get dispatch updates on your account
          and can message the store any time.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => void navigate({ to: "/account" })}>Track your order</Button>
          <Button variant="outline" onClick={() => void navigate({ to: "/" })}>
            Keep shopping
          </Button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a piece you love and come back here.
        </p>
        <Button className="mt-6" onClick={() => void navigate({ to: "/" })}>
          Browse the marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="font-display text-3xl">Checkout</h1>

        {/* 1. Account */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg">1. Your account</h2>
          {sessionLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Checking your session…</p>
          ) : user ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user.name}</span> ·{" "}
              {user.email || user.phone}
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                Sign in so your order, address and messages stay on your account.
              </p>
              <Button className="mt-3" onClick={() => setAuthOpen(true)}>
                Sign in or create an account
              </Button>
            </div>
          )}
        </section>

        {/* 2. Address */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg">2. Delivery address</h2>
            {user && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setAddressOpen(true)}
              >
                <Plus className="size-4" /> Add address
              </Button>
            )}
          </div>
          {!user ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to use your saved addresses.
            </p>
          ) : addressesLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading your addresses…</p>
          ) : addresses.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No address saved yet — add one to continue.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {addresses.map((a: Address) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm ${
                    selected === a.id ? "border-brand bg-brand/5" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    className="mt-1"
                    checked={selected === a.id}
                    onChange={() => setSelected(a.id)}
                  />
                  <span>
                    <span className="font-medium">
                      {a.fullName} · {a.label}
                    </span>
                    <span className="block text-muted-foreground">
                      {[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                    </span>
                    <span className="block text-muted-foreground">{a.phone}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* 3. Payment */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg">3. Payment</h2>
          {payment?.enabled ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" /> UPI, cards, netbanking and wallets via Razorpay.
            </p>
          ) : (
            <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              Online payments are switched off until the Razorpay keys are configured. Cash on
              delivery still works.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              className="gap-2"
              disabled={!user || !selected || busy || !payment?.enabled}
              onClick={() => payOnline.mutate()}
            >
              {payOnline.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Pay {inr(total)} securely
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={!user || !selected || busy}
              onClick={() => payCod.mutate()}
            >
              {payCod.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Truck className="size-4" />
              )}
              Cash on delivery
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            By placing the order you agree to our{" "}
            <Link to="/policies/$slug" params={{ slug: "returns" }} className="underline">
              returns policy
            </Link>
            .
          </p>
        </section>
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {lines.map(({ line, product }) => (
            <li key={`${line.slug}-${line.variant}`} className="flex gap-3">
              <img
                src={product.image}
                alt=""
                className="size-14 rounded-md object-cover"
                loading="lazy"
              />
              <span className="flex-1">
                <span className="line-clamp-1 font-medium">{product.name}</span>
                <span className="block text-muted-foreground">
                  {sellerBySlug.get(line.seller)?.name} · {line.variant} × {line.qty}
                </span>
              </span>
              <span className="font-medium">{inr(line.price * line.qty)}</span>
            </li>
          ))}
        </ul>
        <Separator className="my-4" />
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{inr(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>{shipping === 0 ? "Free" : inr(shipping)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{inr(total)}</dd>
          </div>
        </dl>
        {pin.length === 6 && (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> Delivering to {pin} by{" "}
            {deliveryEstimate(pin, Math.max(...lines.map((x) => x.product.shipDays), 3))}
          </p>
        )}
      </aside>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <AddressDialog
        open={addressOpen}
        onOpenChange={setAddressOpen}
        onSaved={(list) => setSelected(list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? "")}
      />
    </div>
  );
}
