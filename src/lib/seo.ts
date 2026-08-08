/**
 * Shared SEO/AEO/GEO constants and helpers.
 *
 * `head()` functions run during SSR and again on hydration and must render
 * identically both times, so they can't read server-only env vars (those
 * aren't available in the browser bundle). These mirror the public,
 * non-secret values already in `.env` (SITE_URL, SEO_OG_IMAGE) — update
 * them here if the production domain or default share image changes.
 */

export const SITE_NAME = "MakinItHome";
export const SITE_URL = "https://makinithome.in";
export const SITE_TAGLINE = "Handmade Indian furniture & home decor";
export const DEFAULT_OG_IMAGE =
  "https://res.cloudinary.com/dtiy0aqwb/image/upload/v1786108031/home_umbrvg.png";
export const TWITTER_HANDLE = "@makinithome";

/** Absolute URL for a site-relative path — used for canonical/og:url and JSON-LD `url` fields. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** `<link rel="canonical">` entry for a route's `head().links`. */
export function canonicalLink(path: string) {
  return { rel: "canonical", href: absoluteUrl(path) };
}

/** og:url + og:image + twitter:image meta shared by every route that has a hero image. */
export function shareMeta(path: string, image = DEFAULT_OG_IMAGE) {
  return [
    { property: "og:url", content: absoluteUrl(path) },
    { property: "og:image", content: image },
    { name: "twitter:image", content: image },
  ];
}
