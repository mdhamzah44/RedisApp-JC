import { products, type Product } from "@/data/catalog";

const SYNONYMS: Record<string, string[]> = {
  sofa: ["couch", "settee", "two seater", "seating"],
  couch: ["sofa"],
  bed: ["bedstead", "cot", "bedroom"],
  lamp: ["light", "lighting", "pendant", "sconce"],
  light: ["lamp", "lighting"],
  rug: ["dhurrie", "carpet", "mat"],
  cushion: ["pillow", "cover"],
  table: ["desk", "console"],
  cane: ["rattan", "wicker"],
  rattan: ["cane", "wicker"],
  wood: ["teak", "sheesham", "mango"],
  crockery: ["dinnerware", "stoneware", "plate", "bowl"],
  almirah: ["wardrobe", "cabinet"],
  chair: ["armchair", "seating", "stool"],
};

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

const VOCAB = Array.from(
  new Set(products.flatMap((p) => p.keywords.concat(p.name.toLowerCase().split(/\s+/)))),
).filter((w) => w.length > 3);

/** Typo correction against the catalog vocabulary. */
export function correctQuery(query: string): { corrected: string; changed: boolean } {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  let changed = false;
  const fixed = tokens.map((t) => {
    if (t.length < 4 || VOCAB.includes(t)) return t;
    let best = t;
    let bestScore = 3;
    for (const w of VOCAB) {
      const d = levenshtein(t, w);
      if (d < bestScore) {
        bestScore = d;
        best = w;
      }
    }
    if (best !== t) changed = true;
    return best;
  });
  return { corrected: fixed.join(" "), changed };
}

function expand(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const t of tokens) for (const syn of SYNONYMS[t] ?? []) out.add(syn);
  return [...out];
}

export function scoreProduct(p: Product, tokens: string[]): number {
  if (!tokens.length) return 1;
  const name = p.name.toLowerCase();
  const hay =
    `${name} ${p.subcategory} ${p.category} ${p.keywords.join(" ")} ${p.shortDescription}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (name.includes(t)) score += 6;
    else if (hay.includes(t)) score += 2.5;
  }
  if (!score) return 0;
  return score + p.rating * 0.6 + Math.min(p.soldLast7Days, 40) * 0.02;
}

export type Filters = {
  q?: string | undefined;
  category?: string | undefined;
  subcategory?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  colors?: string[] | undefined;
  materials?: string[] | undefined;
  sizes?: string[] | undefined;
  sellers?: string[] | undefined;
  rating?: number | undefined;
  maxShipDays?: number | undefined;
  inStock?: boolean | undefined;
  onSale?: boolean | undefined;
  sort?: string | undefined;
};

export function filterProducts(all: Product[], f: Filters): Product[] {
  const tokens = f.q ? expand(correctQuery(f.q).corrected.split(/\s+/).filter(Boolean)) : [];

  let list = all.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.subcategory && p.subcategory !== f.subcategory) return false;
    if (f.minPrice != null && p.price < f.minPrice) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    if (f.rating && p.rating < f.rating) return false;
    if (f.maxShipDays && p.shipDays > f.maxShipDays) return false;
    if (f.inStock && p.stock <= 0) return false;
    if (f.onSale && !p.comparePrice) return false;
    if (f.sellers?.length && !f.sellers.includes(p.seller)) return false;
    if (f.colors?.length && !p.colors.some((c) => f.colors!.includes(c))) return false;
    if (f.materials?.length && !p.materials.some((m) => f.materials!.includes(m))) return false;
    if (f.sizes?.length && !p.sizes.some((s) => f.sizes!.includes(s))) return false;
    if (tokens.length && scoreProduct(p, tokens) === 0) return false;
    return true;
  });

  const sort = f.sort ?? (tokens.length ? "relevance" : "popularity");
  const cmp: Record<string, (a: Product, b: Product) => number> = {
    relevance: (a, b) => scoreProduct(b, tokens) - scoreProduct(a, tokens),
    popularity: (a, b) => b.soldLast7Days * b.rating - a.soldLast7Days * a.rating,
    newest: (a, b) => a.createdDaysAgo - b.createdDaysAgo,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    discount: (a, b) =>
      (b.comparePrice ? (b.comparePrice - b.price) / b.comparePrice : 0) -
      (a.comparePrice ? (a.comparePrice - a.price) / a.comparePrice : 0),
  };
  list = [...list].sort(cmp[sort] ?? cmp["popularity"]!);
  return list;
}

export function suggest(query: string, limit = 6): Product[] {
  const tokens = expand(correctQuery(query).corrected.split(/\s+/).filter(Boolean));
  if (!tokens.length) return [];
  return products
    .map((p) => ({ p, s: scoreProduct(p, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}

export function relatedTo(product: Product, limit = 8): Product[] {
  return products
    .filter((p) => p.slug !== product.slug)
    .map((p) => ({
      p,
      s:
        (p.category === product.category ? 5 : 0) +
        (p.subcategory === product.subcategory ? 3 : 0) +
        (p.seller === product.seller ? 2 : 0) +
        (Math.abs(p.price - product.price) < product.price * 0.35 ? 2 : 0) +
        p.rating * 0.4,
    }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}
