import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AiAssistantFab } from "@/components/AiAssistantFab";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Toaster } from "@/components/ui/sonner";
import { setCatalog, type CatalogData } from "@/data/catalog";
import { getCatalog } from "@/lib/catalog.functions";
import { getSiteContext } from "@/lib/site.functions";
import { setSiteMode, type SiteMode } from "@/lib/site-mode";
import { absoluteUrl, canonicalLink, DEFAULT_OG_IMAGE, SITE_URL, TWITTER_HANDLE } from "@/lib/seo";
import appCss from "../styles.css?url";

type RootData = { catalog: CatalogData; site: SiteMode };

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">We couldn't find that page</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have sold out or moved. Try browsing the marketplace instead.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input px-5 py-2.5 text-sm font-medium"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Live catalog from the shared Seller Hub database (SSR + hydration).
  loader: async (): Promise<RootData> => {
    const [catalog, site] = await Promise.all([getCatalog(), getSiteContext()]);
    return { catalog, site };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#F1641E" },
      { title: "MakinItHome — Handmade Indian furniture & home decor" },
      {
        name: "description",
        content:
          "Shop handmade cane, teak and handloom pieces from verified Indian makers. UPI & COD, 7-day returns, doorstep delivery.",
      },
      { property: "og:site_name", content: "MakinItHome" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { property: "og:locale", content: "en_IN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: TWITTER_HANDLE },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      canonicalLink("/"),
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
    ],
    scripts: [
      // Google Tag Manager — kept first so it fires as early as possible.
      {
        children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-N9TQHDBG');`,
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "OnlineStore",
          "@id": `${SITE_URL}/#organization`,
          name: "MakinItHome",
          alternateName: "Makin It Home",
          url: SITE_URL,
          logo: DEFAULT_OG_IMAGE,
          image: DEFAULT_OG_IMAGE,
          description:
            "Marketplace for handmade Indian furniture, lighting, textiles and home decor from verified makers.",
          // E-E-A-T: make trust/authority signals machine-readable, not just
          // visible in the footer/policy pages a crawler may not weight.
          slogan: "Handmade furniture & decor from verified Indian makers",
          knowsAbout: [
            "Handmade Indian furniture",
            "Cane and rattan furniture",
            "Teak and sheesham woodwork",
            "Handloom textiles",
            "Home decor",
          ],
          areaServed: { "@type": "Country", name: "India" },
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            areaServed: "IN",
            availableLanguage: ["en", "hi"],
          },
          publishingPrinciples: absoluteUrl("/policies/seller-verification"),
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: SITE_URL,
          name: "MakinItHome",
          publisher: { "@id": `${SITE_URL}/#organization` },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-N9TQHDBG"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { catalog, site } = Route.useLoaderData();
  // Fill the catalog + brand stores before any child route renders (SSR + client).
  setCatalog(catalog);
  setSiteMode(site);

  return (
    <QueryClientProvider client={queryClient}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="min-h-[60vh]">
        {/* Required: nested routes render here. */}
        <Outlet />
      </main>
      <SiteFooter />
      <AiAssistantFab />
      <Toaster position="bottom-center" />
    </QueryClientProvider>
  );
}