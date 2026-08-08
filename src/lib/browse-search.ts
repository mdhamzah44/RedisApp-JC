import type { BrowseSearch } from "@/components/Browse";

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" && v != null ? n : undefined;
};
const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined;
const bool = (v: unknown): boolean | undefined => (v === true || v === "true" ? true : undefined);

/** Validates and clamps URL search params for browse/search pages. */
export function validateBrowseSearch(raw: Record<string, unknown>): BrowseSearch {
  const page = Math.min(Math.max(1, Math.floor(num(raw["page"]) ?? 1)), 999);
  return {
    q: str(raw["q"]),
    page,
    sort: str(raw["sort"]),
    min: num(raw["min"]),
    max: num(raw["max"]),
    color: str(raw["color"]),
    material: str(raw["material"]),
    size: str(raw["size"]),
    seller: str(raw["seller"]),
    rating: num(raw["rating"]),
    ship: num(raw["ship"]),
    sub: str(raw["sub"]),
    stock: bool(raw["stock"]),
    sale: bool(raw["sale"]),
  };
}
