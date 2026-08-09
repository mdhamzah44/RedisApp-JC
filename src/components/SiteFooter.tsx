import { Link } from "@tanstack/react-router";

import { categories, sellerBySlug } from "@/data/catalog";
import { getSiteMode } from "@/lib/site-mode";

export function SiteFooter() {
  const site = getSiteMode();
  const store = site.storeSlug ? sellerBySlug.get(site.storeSlug) : undefined;

  return (
    <footer className="mt-20 border-t border-border bg-secondary/60">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        {store ? (
          <div>
            <p className="font-display text-xl font-semibold">{store.name}</p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {store.tagline || store.about.slice(0, 160)}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {store.addressLine || `${store.city}, ${store.state}`}
              <br />
              {[store.supportEmail, store.phone].filter(Boolean).join(" · ")}
              {store.gstNumber ? (
                <>
                  <br />
                  GSTIN {store.gstNumber}
                </>
              ) : null}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Ships from {store.shipsFrom || store.city} · replies in ~{store.responseMinutes} min ·{" "}
              {store.returnDays}-day returns
              {store.returnPickupFree ? " with free pickup" : ""}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-display text-xl font-semibold">MakinItHome</p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              A marketplace for handmade Indian furniture and home decor. Every seller is GST and
              KYC verified before a single listing goes live.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              MakinItHome Retail Pvt Ltd, 4th Floor, Prestige Atrium, MG Road, Bengaluru 560001
              <br />
              {/* Cloudflare's Email Address Obfuscation rewrites this address in the HTML
                  before React hydrates client-side, so the DOM text React sees on mount
                  never matches what it originally rendered on the server. That's an
                  intentional, expected divergence from a trusted edge feature (not a
                  bug in this component), so we tell React to skip comparing this node —
                  see https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors */}
              <span suppressHydrationWarning>support@makinithome.in</span> · +91 80 4718 2200
            </p>
          </div>
        )}
        <nav aria-label="Shop">
          <p className="text-sm font-semibold">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link to="/c/$slug" params={{ slug: c.slug }} className="hover:text-foreground">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Help">
          <p className="text-sm font-semibold">Help & policies</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link
                to="/policies/$slug"
                params={{ slug: "shipping" }}
                className="hover:text-foreground"
              >
                Shipping policy
              </Link>
            </li>
            <li>
              <Link
                to="/policies/$slug"
                params={{ slug: "returns" }}
                className="hover:text-foreground"
              >
                Returns & refunds
              </Link>
            </li>
            <li>
              <Link
                to="/policies/$slug"
                params={{ slug: "buyer-protection" }}
                className="hover:text-foreground"
              >
                Buyer protection
              </Link>
            </li>
            <li>
              <Link
                to="/policies/$slug"
                params={{ slug: "seller-verification" }}
                className="hover:text-foreground"
              >
                How we verify sellers
              </Link>
            </li>
            <li>
              <Link
                to="/guides/$slug"
                params={{ slug: "materials" }}
                className="hover:text-foreground"
              >
                Materials guide
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold">Buy with confidence</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>UPI, cards, wallets, COD & EMI</li>
            <li>7-day easy returns with free pickup</li>
            <li>Money-back buyer protection</li>
            <li>Order updates on WhatsApp</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}{" "}
        {store ? `${store.name} · powered by MakinItHome` : "MakinItHome"}. Handmade in India.
        <span className="mx-2">·</span>
        Design and developed by{" "}
        <a
          href="https://arkvisioninfotech.in"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground hover:underline"
        >
          Arkvisioninfotech
        </a>
      </div>
    </footer>
  );
}
