import { createServerFn } from "@tanstack/react-start";

import type { CatalogData } from "@/data/catalog";

/**
 * Loads the whole storefront catalog from the shared Seller Hub database.
 * Called from the root route loader so every page (SSR + client) reads live
 * data instead of the old bundled offline catalog.
 */
export const getCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogData> => {
    const { getCatalogData } = await import("./catalog.server");
    return getCatalogData();
  },
);
