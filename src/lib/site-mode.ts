/**
 * Which brand the current request is being served as.
 *
 * `maisonareeba.us` (and www) serves the Maison Areeba shop as its own home
 * page; every other host serves the MakinItHome marketplace.
 */
export type SiteMode = {
  /** Seller slug when the host is a store domain, otherwise null. */
  storeSlug: string | null;
  host: string;
};

let mode: SiteMode = { storeSlug: null, host: "" };

export function setSiteMode(next: SiteMode) {
  mode = next;
}

export function getSiteMode(): SiteMode {
  return mode;
}

/** Store domains → seller slug in the shared Seller Hub database. */
export const STORE_DOMAINS: Record<string, string> = {
  "maisonareeba.us": "maisonareeba",
  "www.maisonareeba.us": "maisonareeba",
};

export function storeSlugForHost(rawHost: string): string | null {
  const host = rawHost.toLowerCase().split(":")[0] ?? "";
  return STORE_DOMAINS[host] ?? null;
}
