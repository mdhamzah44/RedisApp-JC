import { createServerFn } from "@tanstack/react-start";

import type { SiteMode } from "./site-mode";

/**
 * Resolves the brand for the current request from the Host header, so SSR and
 * hydration agree on whether we are the marketplace or a store domain.
 */
export const getSiteContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteMode> => {
    const { getRequestHost } = await import("@tanstack/react-start/server");
    const { storeSlugForHost } = await import("./site-mode");
    const host = getRequestHost({ xForwardedHost: true });
    return { host, storeSlug: storeSlugForHost(host) };
  },
);
