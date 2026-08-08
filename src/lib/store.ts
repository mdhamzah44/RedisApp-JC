import { useCallback, useSyncExternalStore } from "react";

export type CartLine = {
  slug: string;
  qty: number;
  variant: string;
  price: number;
  seller: string;
};

export type AppState = {
  cart: CartLine[];
  saved: CartLine[];
  wishlists: { id: string; name: string; slugs: string[] }[];
  recent: string[];
  compare: string[];
  following: string[];
  alerts: string[];
  points: number;
  pin: string;
};

const KEY = "makinithome.v1";

const initial: AppState = {
  cart: [],
  saved: [],
  wishlists: [{ id: "default", name: "Favourites", slugs: [] }],
  recent: [],
  compare: [],
  following: [],
  alerts: [],
  points: 420,
  pin: "",
};

let state: AppState = initial;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — keep in-memory state */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...initial, ...(JSON.parse(raw) as Partial<AppState>) };
  } catch {
    /* corrupt payload — fall back to defaults */
  }
  emit();
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function set(updater: (prev: AppState) => AppState) {
  state = updater(state);
  persist();
  emit();
}

export function useAppState<T>(select: (s: AppState) => T): T {
  const getSnapshot = useCallback(() => select(state), [select]);
  const getServerSnapshot = useCallback(() => select(initial), [select]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const actions = {
  addToCart(line: CartLine) {
    set((s) => {
      const i = s.cart.findIndex((l) => l.slug === line.slug && l.variant === line.variant);
      if (i >= 0) {
        const cart = [...s.cart];
        cart[i] = { ...cart[i]!, qty: cart[i]!.qty + line.qty };
        return { ...s, cart };
      }
      return { ...s, cart: [...s.cart, line] };
    });
  },
  setQty(slug: string, variant: string, qty: number) {
    set((s) => ({
      ...s,
      cart: s.cart
        .map((l) => (l.slug === slug && l.variant === variant ? { ...l, qty } : l))
        .filter((l) => l.qty > 0),
    }));
  },
  removeFromCart(slug: string, variant: string) {
    set((s) => ({ ...s, cart: s.cart.filter((l) => !(l.slug === slug && l.variant === variant)) }));
  },
  saveForLater(slug: string, variant: string) {
    set((s) => {
      const line = s.cart.find((l) => l.slug === slug && l.variant === variant);
      if (!line) return s;
      return {
        ...s,
        cart: s.cart.filter((l) => l !== line),
        saved: [...s.saved, line],
      };
    });
  },
  moveToCart(slug: string, variant: string) {
    set((s) => {
      const line = s.saved.find((l) => l.slug === slug && l.variant === variant);
      if (!line) return s;
      return { ...s, saved: s.saved.filter((l) => l !== line), cart: [...s.cart, line] };
    });
  },
  clearCart() {
    set((s) => ({ ...s, cart: [], points: s.points + 150 }));
  },
  toggleWishlist(slug: string, listId = "default") {
    set((s) => ({
      ...s,
      wishlists: s.wishlists.map((w) =>
        w.id === listId
          ? {
              ...w,
              slugs: w.slugs.includes(slug)
                ? w.slugs.filter((x) => x !== slug)
                : [slug, ...w.slugs],
            }
          : w,
      ),
    }));
  },
  createWishlist(name: string) {
    set((s) => ({
      ...s,
      wishlists: [...s.wishlists, { id: `${Date.now()}`, name, slugs: [] }],
    }));
  },
  toggleCompare(slug: string) {
    set((s) => ({
      ...s,
      compare: s.compare.includes(slug)
        ? s.compare.filter((x) => x !== slug)
        : [...s.compare, slug].slice(-4),
    }));
  },
  toggleFollow(seller: string) {
    set((s) => ({
      ...s,
      following: s.following.includes(seller)
        ? s.following.filter((x) => x !== seller)
        : [...s.following, seller],
    }));
  },
  toggleAlert(slug: string) {
    set((s) => ({
      ...s,
      alerts: s.alerts.includes(slug) ? s.alerts.filter((x) => x !== slug) : [...s.alerts, slug],
    }));
  },
  viewed(slug: string) {
    set((s) => ({ ...s, recent: [slug, ...s.recent.filter((x) => x !== slug)].slice(0, 24) }));
  },
  setPin(pin: string) {
    set((s) => ({ ...s, pin }));
  },
};
