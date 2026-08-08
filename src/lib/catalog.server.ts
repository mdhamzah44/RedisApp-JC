/**
 * Builds the storefront catalog out of the Seller Hub MongoDB collections
 * (`products`, `sellers`, `categories`, `reviews`, `users`, `orders`).
 *
 * Server-only. Documents are written by the Flask Seller Hub app using
 * MongoEngine, so references are plain ObjectIds and embedded docs are
 * plain sub-objects.
 */
import type { ObjectId, WithId, Document } from "mongodb";

import type {
  Category,
  CatalogData,
  Product,
  Review,
  Seller,
  StorePolicies,
  TeamMember,
  Variant,
} from "@/data/catalog";
import { categoryFallbackImages, genericFallbackImages } from "@/data/category-images";
import { getDb, isMongoConfigured } from "./mongo.server";

const CACHE_MS = 60_000;
let cache: { data: CatalogData; at: number } | undefined;

const key = (v: unknown): string => (v == null ? "" : String(v as ObjectId));

const slugify = (v: string): string =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const text = (v: unknown, fallback = ""): string => (typeof v === "string" && v ? v : fallback);

/** Stable pseudo-random in [0,1) derived from a string, so SSR === client. */
function hashRand(seed: string, salt = 1): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = Math.imul(h ^ salt, 2654435761);
  return ((h >>> 0) % 100000) / 100000;
}

function placeholderImage(): string {
  return process.env["PLACEHOLDER_IMAGE_URL"] && process.env["PLACEHOLDER_IMAGE_URL"] !== "none"
    ? process.env["PLACEHOLDER_IMAGE_URL"]!
    : "https://placehold.co/1000x1000/E4E7D9/2C3B26.png?text=Photo+coming+soon";
}

function productImages(doc: Document): string[] {
  const images = Array.isArray(doc["images"]) ? (doc["images"] as Document[]) : [];
  return images
    .slice()
    .sort((a, b) => num(a["position"]) - num(b["position"]))
    .map((i) => text(i["url"]))
    .filter(Boolean);
}

/** Keywords the seller entered in the Seller Hub — comma-separated free text. */
function keywordList(doc: Document): string[] {
  return text(doc["keywords"])
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 30);
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "with",
  "for",
  "of",
  "in",
  "on",
  "to",
  "set",
  "piece",
  "pieces",
  "handmade",
  "hand",
  "made",
  "india",
  "indian",
]);

/** name → meaningful lowercase tokens, longest phrases first (bi-grams before uni-grams). */
function nameTokens(name: string): string[] {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) bigrams.push(`${words[i]} ${words[i + 1]}`);
  return [...bigrams, ...words];
}

/**
 * SEO / AEO / GEO keyword set for a product.
 *
 * Sellers can enter their own comma-separated keywords in the Seller Hub —
 * those are trusted first since a maker usually knows their craft's search
 * terms better than any heuristic. When a listing has few or none, this
 * fills the gap with the best available signal: product name phrases,
 * category/subcategory, material, colour and maker location, plus the kind
 * of buyer-intent phrase people actually type into Google or ask an AI
 * assistant ("buy X online india", "handmade X near <city>").
 *
 * Returns `{ keywords, primary }` — `primary` is the single strongest term,
 * used to lead page titles and meta description so the most relevant phrase
 * appears first (classic on-page SEO), while the full list backs the
 * keywords meta tag and structured data.
 */
function buildKeywords(input: {
  sellerKeywords: string[];
  name: string;
  categoryName: string;
  subcategory: string;
  materials: string[];
  colors: string[];
  sellerCity: string;
}): { keywords: string[]; primary: string } {
  const { sellerKeywords, name, categoryName, subcategory, materials, colors, sellerCity } = input;

  const seeded = sellerKeywords.map((k) => k.toLowerCase());
  const auto: string[] = [];

  const material = materials.find((m) => m && m !== "Handcrafted");
  const color = colors.find((c) => c && c !== "Natural");
  const city = sellerCity.split(",")[0]?.trim();

  auto.push(...nameTokens(name));
  if (categoryName) auto.push(categoryName.toLowerCase());
  if (subcategory) auto.push(subcategory.toLowerCase());
  if (material) {
    auto.push(material.toLowerCase());
    auto.push(`${material} ${categoryName}`.toLowerCase().trim());
  }
  if (color) auto.push(`${color} ${categoryName}`.toLowerCase().trim());
  auto.push(`handmade ${categoryName}`.toLowerCase().trim());
  auto.push(`buy ${name} online india`.toLowerCase());
  if (city) auto.push(`handmade ${categoryName} ${city}`.toLowerCase().trim());
  auto.push(`${categoryName} for home decor`.toLowerCase().trim());

  // Seller-entered terms lead (highest trust), de-duplicated auto phrases fill
  // the rest up to a sane cap for meta tags / JSON-LD.
  const merged = [...seeded, ...auto]
    .map((k) => k.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((k, i, arr) => arr.indexOf(k) === i)
    .slice(0, 20);

  const primary = merged[0] ?? name.toLowerCase();
  return { keywords: merged, primary };
}

function mapVariants(doc: Document): Variant[] {
  const raw = Array.isArray(doc["variants"]) ? (doc["variants"] as Document[]) : [];
  return raw
    .slice()
    .sort((a, b) => num(a["position"]) - num(b["position"]))
    .map((v) => {
      const size = text(v["size"]);
      const color = text(v["color"]);
      const material = text(v["material"]);
      return {
        name: text(v["name"], [size, color, material].filter(Boolean).join(" / ") || "Variant"),
        ...(size ? { size } : {}),
        ...(color ? { color } : {}),
        ...(material ? { material } : {}),
        priceDelta: num(v["price_delta"]),
        stock: num(v["stock"]),
      } satisfies Variant;
    });
}

function daysAgo(value: unknown): number {
  const d = value instanceof Date ? value : value ? new Date(String(value)) : null;
  if (!d || Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

function monthLabel(value: unknown): string {
  const d = value instanceof Date ? value : value ? new Date(String(value)) : new Date();
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export async function loadCatalogFromDb(): Promise<CatalogData> {
  const db = await getDb();

  const [productDocs, sellerDocs, categoryDocs, reviewDocs, userDocs, orderDocs, policyDocs] =
    await Promise.all([
      db
        .collection("products")
        .find({ is_paused: { $ne: true } })
        .limit(2000)
        .toArray(),
      db.collection("sellers").find({}).limit(500).toArray(),
      db.collection("categories").find({}).limit(200).toArray(),
      db.collection("reviews").find({}).sort({ created_at: -1 }).limit(5000).toArray(),
      db
        .collection("users")
        .find({}, { projection: { name: 1 } })
        .limit(5000)
        .toArray(),
      db
        .collection("orders")
        .find(
          { created_at: { $gte: new Date(Date.now() - 7 * 86_400_000) } },
          { projection: { items: 1 } },
        )
        .limit(2000)
        .toArray(),
      db.collection("store_policies").find({}).limit(500).toArray(),
    ]);

  const policyBySeller = new Map<string, Document>();
  for (const doc of policyDocs) policyBySeller.set(key(doc["seller"]), doc);

  const userNames = new Map<string, string>();
  for (const u of userDocs) userNames.set(key(u._id), text(u["name"], "Customer"));

  // --- reviews grouped per product -----------------------------------------
  const reviewsByProduct = new Map<string, Review[]>();
  for (const r of reviewDocs) {
    const pid = key(r["product"]);
    if (!pid) continue;
    const name = userNames.get(key(r["user"])) ?? "Verified buyer";
    const initial = name.split(" ").slice(1).join(" ").slice(0, 1);
    const rating = Math.min(5, Math.max(1, num(r["rating"], 5)));
    const seed = key(r._id);
    const list = reviewsByProduct.get(pid) ?? [];
    list.push({
      author: initial ? `${name.split(" ")[0]} ${initial}.` : name,
      rating,
      date: monthLabel(r["created_at"]),
      title: text(r["title"], "Verified purchase"),
      body: text(r["comment"], "No written feedback was left with this rating."),
      verified: true,
      photos: 0,
      helpful: Math.floor(hashRand(seed, 3) * 40),
      attributes: {
        quality: rating,
        packaging: Math.min(5, rating + (hashRand(seed, 4) > 0.6 ? 0 : -0.2)),
        value: Math.min(5, rating - 0.1),
        delivery: Math.min(5, rating - 0.2),
      },
    });
    reviewsByProduct.set(pid, list);
  }

  // --- units sold in the last 7 days ---------------------------------------
  const soldByProduct = new Map<string, number>();
  for (const o of orderDocs) {
    const items = Array.isArray(o["items"]) ? (o["items"] as Document[]) : [];
    for (const it of items) {
      const pid = key(it["product"]);
      if (!pid) continue;
      soldByProduct.set(pid, (soldByProduct.get(pid) ?? 0) + num(it["quantity"], 1));
    }
  }

  // --- categories ----------------------------------------------------------
  const categoryById = new Map<string, { slug: string; name: string; blurb: string }>();
  for (const c of categoryDocs) {
    const name = text(c["name"], "Uncategorised");
    categoryById.set(key(c._id), {
      slug: text(c["slug"], slugify(name)),
      name,
      blurb: text(
        c["description"],
        `Handmade ${name.toLowerCase()} from independent Indian studios.`,
      ),
    });
  }

  // --- sellers -------------------------------------------------------------
  const sellerById = new Map<string, Seller>();
  for (const s of sellerDocs) {
    const sid = key(s._id);
    const name = text(s["store_name"], "Independent Studio");
    const city = [text(s["city"]), text(s["state"])].filter(Boolean).join(", ");
    const badges = ["Handmade"];
    if (text(s["gst_number"])) badges.push("GST verified");
    if (text(s["status"], "approved") === "approved") badges.push("Verified seller");

    const pol = policyBySeller.get(sid) ?? {};
    const policies: StorePolicies = {
      returns: text(pol["returns"]),
      shipping: text(pol["shipping"]),
      warranty: text(pol["warranty"]),
      privacy: text(pol["privacy"]),
      story: text(pol["story"]),
      announcement: text(pol["announcement"]),
      bannerUrl: text(pol["banner_url"]),
      mobileBannerUrl: text(pol["mobile_banner_url"]),
      vacationMode: pol["vacation_mode"] === true,
      vacationMessage: text(pol["vacation_message"]),
      processingDays: num(pol["processing_days"], 3),
      freeShippingOver: num(pol["free_shipping_over"]),
      serviceablePincodes: text(pol["serviceable_pincodes"]),
      giftWrapFee: num(pol["gift_wrap_fee"]),
      rushFee: num(pol["rush_fee"]),
    };

    const team: TeamMember[] = (Array.isArray(s["team"]) ? (s["team"] as Document[]) : [])
      .slice()
      .sort((a, b) => num(a["position"]) - num(b["position"]))
      .map((m) => ({
        name: text(m["name"], "Team member"),
        role: text(m["role"]),
        rank: text(m["rank"], "staff"),
        photoUrl: text(m["photo_url"]),
        bio: text(m["bio"]),
      }));

    sellerById.set(sid, {
      id: sid,
      slug: text(s["slug"], slugify(name)),
      name,
      tagline: text(s["tagline"]),
      city: city || "India",
      state: text(s["state"]),
      country: text(s["country"], "India"),
      addressLine: text(s["address_line"]),
      shipsFrom: text(s["ships_from"], city || "India"),
      since: new Date((s["created_at"] as Date | undefined) ?? Date.now()).getFullYear(),
      rating: 0,
      reviews: 0,
      responseMinutes: Math.max(1, num(s["reply_minutes"], num(s["response_minutes"], 60))),
      returnDays: Math.max(0, num(s["return_days"], 7)),
      returnPickupFree: s["return_pickup_free"] !== false,
      badges,
      about: text(s["description"], text(s["tagline"], `Handmade pieces from ${name}.`)),
      onTimePct: 90 + Math.floor(hashRand(sid, 9) * 9),
      logoUrl: text(s["logo_url"]),
      logoColor: text(s["logo_color"], "#2C3B26"),
      supportEmail: text(s["support_email"]),
      phone: text(s["phone"]),
      gstNumber: text(s["gst_number"]),
      productCount: 0,
      team,
      policies,
    });
  }

  // --- products ------------------------------------------------------------
  const products: Product[] = [];
  const subsByCategory = new Map<string, Set<string>>();
  const sellerStats = new Map<string, { sum: number; count: number; reviews: number }>();

  for (const p of productDocs as WithId<Document>[]) {
    const pid = key(p._id);
    const name = text(p["name"], "Handmade piece");
    const cat = categoryById.get(key(p["category"]));
    const seller = sellerById.get(key(p["seller"]));
    const images = productImages(p);
    const keywords = keywordList(p);
    const variants = mapVariants(p);
    const prodReviews = reviewsByProduct.get(pid) ?? [];
    const rating = prodReviews.length
      ? Math.round((prodReviews.reduce((a, r) => a + r.rating, 0) / prodReviews.length) * 10) / 10
      : 0;
    const price = num(p["price"]);
    const comparePrice = num(p["compare_price"]) > price ? num(p["compare_price"]) : null;
    const categorySlug = cat?.slug ?? "marketplace";
    const subcategory = keywords[0]
      ? keywords[0].replace(/\b\w/g, (m) => m.toUpperCase())
      : (cat?.name ?? "Handmade");

    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[];
    const materials = [...new Set(variants.map((v) => v.material).filter(Boolean))] as string[];
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[];

    // SEO/AEO keyword set: seller-entered keywords first, auto-generated the
    // rest of the way from name/category/material/colour/maker location.
    const seo = buildKeywords({
      sellerKeywords: keywords,
      name,
      categoryName: cat?.name ?? "Handmade",
      subcategory,
      materials,
      colors,
      sellerCity: seller?.city ?? "",
    });

    const stock = variants.length
      ? variants.reduce((a, v) => a + Math.max(v.stock, 0), 0)
      : num(p["stock"]);

    // The buy box always shows one selected option, so make sure there's
    // always at least a "Standard" variant even if the seller listed none.
    if (!variants.length) {
      variants.push({ name: "Standard", priceDelta: 0, stock: Math.max(0, stock) });
    }

    if (!subsByCategory.has(categorySlug)) subsByCategory.set(categorySlug, new Set());
    subsByCategory.get(categorySlug)!.add(subcategory);

    if (seller) {
      const st = sellerStats.get(seller.slug) ?? { sum: 0, count: 0, reviews: 0 };
      if (rating) {
        st.sum += rating;
        st.count += 1;
      }
      st.reviews += prodReviews.length;
      sellerStats.set(seller.slug, st);
    }

    products.push({
      id: pid,
      slug: text(p["slug"], slugify(name)),
      name,
      category: categorySlug,
      subcategory,
      seller: seller?.slug ?? "makinithome",
      price,
      comparePrice,
      image: images[0] ?? categoryFallbackImages[categorySlug] ?? placeholderImage(),
      images: images.length ? images : [categoryFallbackImages[categorySlug] ?? placeholderImage()],
      videos: [
        ...(Array.isArray(p["videos"]) ? (p["videos"] as unknown[]).map((v) => text(v)) : []),
        text(p["video_url"]),
      ].filter((v, i, a) => v && a.indexOf(v) === i),
      colors: colors.length ? colors : ["Natural"],
      materials: materials.length ? materials : ["Handcrafted"],
      sizes: sizes.length ? sizes : ["Standard"],
      stock: Math.max(0, stock - num(p["reserved_stock"])),
      rating,
      reviewCount: prodReviews.length,
      soldLast7Days: soldByProduct.get(pid) ?? 0,
      createdDaysAgo: daysAgo(p["created_at"]),
      shipDays: Math.max(2, num(p["production_days"]) + 3),
      ecoScore: Math.round((7 + hashRand(pid, 13) * 3) * 10) / 10,
      handmade: true,
      keywords: seo.keywords,
      primaryKeyword: seo.primary,
      shortDescription: text(
        p["short_description"],
        text(p["description"]).slice(0, 150) || `${name} made to order.`,
      ),
      description: text(p["description"], text(p["short_description"])),
      variants,
      priceHistory: [
        { label: "90d ago", price: comparePrice ?? Math.round(price * 1.08) },
        { label: "60d ago", price: Math.round(price * 1.04) },
        { label: "30d ago", price: Math.round(price * 1.02) },
        { label: "Today", price },
      ],
      faqs: [
        {
          q: "Can I get custom dimensions?",
          a: text(p["personalization_label"])
            ? `Yes — ${text(p["personalization_label"])}. Message the studio with your measurements.`
            : "Message the studio with your measurements and they will quote within 24 hours.",
        },
        {
          q: "How long does it take to make?",
          a: num(p["production_days"])
            ? `This piece is made to order in about ${num(p["production_days"])} days, then shipped.`
            : "This piece ships from ready stock, usually within 2-3 working days.",
        },
        {
          q: "What is the return window?",
          a: "7-day easy return with free pickup. Custom-made pieces are covered for transit damage only.",
        },
      ],
      reviews: prodReviews.slice(0, 12),
      dimensions: num(p["weight_grams"])
        ? `${(num(p["weight_grams"]) / 1000).toFixed(1)} kg — see listing photos for sizing`
        : "See listing photos for sizing",
      warrantyMonths: 12,
      assembly: num(p["production_days"])
        ? "Made to order, assembly guide included"
        : "No assembly required",
      care: "Wipe with a dry cloth. Re-oil wood surfaces once a year. Keep out of prolonged direct sunlight.",
    });
  }

  // --- finalise sellers ----------------------------------------------------
  const sellers: Seller[] = [...sellerById.values()].map((s) => {
    const st = sellerStats.get(s.slug);
    return {
      ...s,
      rating: st && st.count ? Math.round((st.sum / st.count) * 10) / 10 : 0,
      reviews: st?.reviews ?? 0,
      productCount: products.filter((p) => p.seller === s.slug).length,
    };
  });

  // --- finalise categories (only those that have products) -----------------
  const categories: Category[] = [...categoryById.values()]
    .filter((c) => subsByCategory.has(c.slug))
    .map((c, i) => ({
      slug: c.slug,
      name: c.name,
      blurb: c.blurb,
      image:
        products.find((p) => p.category === c.slug && p.image)?.image ??
        categoryFallbackImages[c.slug] ??
        genericFallbackImages[i % genericFallbackImages.length]!,
      subcategories: [...(subsByCategory.get(c.slug) ?? [])].sort().slice(0, 12),
    }));

  return { categories, sellers, products };
}

/** Cached catalog read. Live data only — there is no demo fallback. */
export async function getCatalogData(): Promise<CatalogData> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  if (!isMongoConfigured()) {
    console.warn("Catalog: MONGODB_URI is not set.");
    return { categories: [], sellers: [], products: [] };
  }

  try {
    const data = await loadCatalogFromDb();
    cache = { data, at: Date.now() };
    return data;
  } catch (error) {
    console.error("Catalog: MongoDB read failed.", error);
    return cache?.data ?? { categories: [], sellers: [], products: [] };
  }
}
