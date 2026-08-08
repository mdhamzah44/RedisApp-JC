export type Category = {
  slug: string;
  name: string;
  blurb: string;
  image: string;
  subcategories: string[];
};

export type TeamMember = {
  name: string;
  role: string;
  rank: string;
  photoUrl: string;
  bio: string;
};

export type StorePolicies = {
  returns: string;
  shipping: string;
  warranty: string;
  privacy: string;
  story: string;
  announcement: string;
  bannerUrl: string;
  mobileBannerUrl: string;
  vacationMode: boolean;
  vacationMessage: string;
  processingDays: number;
  freeShippingOver: number;
  serviceablePincodes: string;
  giftWrapFee: number;
  rushFee: number;
};

export type Seller = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  city: string;
  state: string;
  country: string;
  addressLine: string;
  /** Where orders ship from — seller city/state, maintained in the Seller Hub. */
  shipsFrom: string;
  since: number;
  rating: number;
  reviews: number;
  /** Typical reply time in minutes, maintained in the Seller Hub. */
  responseMinutes: number;
  /** Return window in days, maintained in the Seller Hub. */
  returnDays: number;
  returnPickupFree: boolean;
  badges: string[];
  about: string;
  onTimePct: number;
  logoUrl: string;
  logoColor: string;
  supportEmail: string;
  phone: string;
  gstNumber: string;
  productCount: number;
  team: TeamMember[];
  policies: StorePolicies;
};

export type Variant = {
  name: string;
  size?: string;
  color?: string;
  material?: string;
  priceDelta: number;
  stock: number;
};

export type Review = {
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  verified: boolean;
  photos: number;
  helpful: number;
  attributes: { quality: number; packaging: number; value: number; delivery: number };
};

export type Product = {
  slug: string;
  name: string;
  id: string;
  category: string;
  subcategory: string;
  seller: string;
  price: number;
  comparePrice: number | null;
  image: string;
  /** Every image the seller uploaded in the Seller Hub, in position order. */
  images: string[];
  videos: string[];
  colors: string[];
  materials: string[];
  sizes: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  soldLast7Days: number;
  createdDaysAgo: number;
  shipDays: number;
  ecoScore: number;
  handmade: boolean;
  keywords: string[];
  /** Strongest SEO/AEO keyword for this listing — seller-entered if set, otherwise auto-generated. Leads page titles & meta descriptions. */
  primaryKeyword: string;
  shortDescription: string;
  description: string;
  variants: Variant[];
  priceHistory: { label: string; price: number }[];
  faqs: { q: string; a: string }[];
  reviews: Review[];
  dimensions: string;
  warrantyMonths: number;
  assembly: string;
  care: string;
};

export type CatalogData = {
  categories: Category[];
  sellers: Seller[];
  products: Product[];
};

/**
 * Live catalog store.
 *
 * These arrays/maps start empty and are filled from MongoDB (the same database
 * the Seller Hub app writes to) by the root route loader, on the server during
 * SSR and again in the browser on hydration. Components keep importing
 * `products` / `productBySlug` exactly as before.
 */
export const categories: Category[] = [];
export const sellers: Seller[] = [];
export const products: Product[] = [];

export const productBySlug = new Map<string, Product>();
export const sellerBySlug = new Map<string, Seller>();
export const categoryBySlug = new Map<string, Category>();

export function setCatalog(data: CatalogData): void {
  categories.splice(0, categories.length, ...data.categories);
  sellers.splice(0, sellers.length, ...data.sellers);
  products.splice(0, products.length, ...data.products);

  productBySlug.clear();
  for (const p of products) productBySlug.set(p.slug, p);
  sellerBySlug.clear();
  for (const s of sellers) sellerBySlug.set(s.slug, s);
  categoryBySlug.clear();
  for (const c of categories) categoryBySlug.set(c.slug, c);
}

export const moodCollections = [
  { slug: "minimalist-bedroom", name: "Minimalist Bedroom", query: "cane bed nightstand" },
  { slug: "boho-living", name: "Boho Living Room", query: "macrame rattan cushion" },
  { slug: "wedding-gifts", name: "Wedding Gifts", query: "stoneware set brass" },
  { slug: "under-999", name: "Under \u20b9999", query: "cushion mug board" },
  { slug: "warm-lighting", name: "Warm Lighting", query: "pendant lamp brass cane" },
  { slug: "small-homes", name: "Small Homes", query: "compact folding stool shelf" },
];
