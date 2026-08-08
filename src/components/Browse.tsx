import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";

import { ProductCard } from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { sellers, type Product } from "@/data/catalog";
import { inr } from "@/lib/format";
import { filterProducts } from "@/lib/search";

export type BrowseSearch = {
  q?: string | undefined;
  page?: number;
  sort?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
  color?: string | undefined;
  material?: string | undefined;
  size?: string | undefined;
  seller?: string | undefined;
  rating?: number | undefined;
  ship?: number | undefined;
  sub?: string | undefined;
  stock?: boolean | undefined;
  sale?: boolean | undefined;
};

const PAGE_SIZE = 24;

const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "popularity", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "discount", label: "Biggest discount" },
];

const PRICE_BANDS = [
  { label: "Under ₹999", min: 0, max: 999 },
  { label: "₹1,000 – ₹4,999", min: 1000, max: 4999 },
  { label: "₹5,000 – ₹14,999", min: 5000, max: 14999 },
  { label: "₹15,000+", min: 15000, max: undefined },
];

function FilterPanel({
  all,
  search,
  onChange,
  subcategories,
}: {
  all: Product[];
  search: BrowseSearch;
  onChange: (next: Partial<BrowseSearch>) => void;
  subcategories?: string[] | undefined;
}) {
  const colors = useMemo(() => [...new Set(all.flatMap((p) => p.colors))].sort(), [all]);
  const materials = useMemo(() => [...new Set(all.flatMap((p) => p.materials))].sort(), [all]);
  const sizes = useMemo(() => [...new Set(all.flatMap((p) => p.sizes))].sort(), [all]);

  const group = (title: string, children: React.ReactNode) => (
    <div className="border-b border-border py-4">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      {children}
    </div>
  );

  const optionRow = (id: string, label: string, checked: boolean, toggle: () => void) => (
    <div key={id} className="flex items-center gap-2 py-1">
      <Checkbox id={id} checked={checked} onCheckedChange={toggle} />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {label}
      </Label>
    </div>
  );

  return (
    <div className="text-sm">
      {subcategories?.length
        ? group(
            "Type",
            subcategories.map((s) =>
              optionRow(`sub-${s}`, s, search.sub === s, () =>
                onChange({ sub: search.sub === s ? undefined : s, page: 1 }),
              ),
            ),
          )
        : null}

      {group(
        "Price",
        PRICE_BANDS.map((b) =>
          optionRow(`price-${b.label}`, b.label, search.min === b.min && search.max === b.max, () =>
            onChange(
              search.min === b.min && search.max === b.max
                ? { min: undefined, max: undefined, page: 1 }
                : { min: b.min, max: b.max, page: 1 },
            ),
          ),
        ),
      )}

      {group(
        "Colour",
        colors.map((c) =>
          optionRow(`color-${c}`, c, search.color === c, () =>
            onChange({ color: search.color === c ? undefined : c, page: 1 }),
          ),
        ),
      )}

      {group(
        "Material",
        materials.map((m) =>
          optionRow(`mat-${m}`, m, search.material === m, () =>
            onChange({ material: search.material === m ? undefined : m, page: 1 }),
          ),
        ),
      )}

      {group(
        "Size",
        sizes.map((s) =>
          optionRow(`size-${s}`, s, search.size === s, () =>
            onChange({ size: search.size === s ? undefined : s, page: 1 }),
          ),
        ),
      )}

      {group(
        "Rating",
        [4.5, 4, 3.5].map((r) =>
          optionRow(`rate-${r}`, `${r} & up`, search.rating === r, () =>
            onChange({ rating: search.rating === r ? undefined : r, page: 1 }),
          ),
        ),
      )}

      {group(
        "Delivery",
        [4, 7].map((d) =>
          optionRow(`ship-${d}`, `Within ${d} days`, search.ship === d, () =>
            onChange({ ship: search.ship === d ? undefined : d, page: 1 }),
          ),
        ),
      )}

      {group(
        "Seller",
        sellers.map((s) =>
          optionRow(`seller-${s.slug}`, s.name, search.seller === s.slug, () =>
            onChange({ seller: search.seller === s.slug ? undefined : s.slug, page: 1 }),
          ),
        ),
      )}

      {group(
        "More",
        <>
          {optionRow("in-stock", "In stock only", !!search.stock, () =>
            onChange({ stock: search.stock ? undefined : true, page: 1 }),
          )}
          {optionRow("on-sale", "On sale", !!search.sale, () =>
            onChange({ sale: search.sale ? undefined : true, page: 1 }),
          )}
        </>,
      )}
    </div>
  );
}

export function Browse({
  all,
  search,
  onChange,
  subcategories,
  title,
}: {
  all: Product[];
  search: BrowseSearch;
  onChange: (next: Partial<BrowseSearch>) => void;
  subcategories?: string[] | undefined;
  title: string;
}) {
  const results = useMemo(
    () =>
      filterProducts(all, {
        q: search.q,
        subcategory: search.sub,
        minPrice: search.min,
        maxPrice: search.max,
        colors: search.color ? [search.color] : undefined,
        materials: search.material ? [search.material] : undefined,
        sizes: search.size ? [search.size] : undefined,
        sellers: search.seller ? [search.seller] : undefined,
        rating: search.rating,
        maxShipDays: search.ship,
        inStock: search.stock,
        onSale: search.sale,
        sort: search.sort,
      }),
    [all, search],
  );

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, search.page ?? 1), pages);
  const slice = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chip = (
    on: unknown,
    label: string,
    clear: Partial<BrowseSearch>,
  ): { label: string; clear: Partial<BrowseSearch> }[] => (on ? [{ label, clear }] : []);

  const activeChips = [
    ...chip(search.sub, search.sub ?? "", { sub: undefined }),
    ...chip(search.color, search.color ?? "", { color: undefined }),
    ...chip(search.material, search.material ?? "", { material: undefined }),
    ...chip(search.size, search.size ?? "", { size: undefined }),
    ...chip(search.rating, `${search.rating}★ & up`, { rating: undefined }),
    ...chip(search.ship, `≤ ${search.ship} days`, { ship: undefined }),
    ...chip(search.sale, "On sale", { sale: undefined }),
    ...chip(search.stock, "In stock", { stock: undefined }),
    ...chip(
      search.min != null,
      `${inr(search.min ?? 0)}${search.max ? ` – ${inr(search.max)}` : "+"}`,
      { min: undefined, max: undefined },
    ),
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <p className="mb-2 flex items-center gap-2 font-display text-lg">
          <SlidersHorizontal className="size-4" /> Filters
        </p>
        <FilterPanel all={all} search={search} onChange={onChange} subcategories={subcategories} />
      </aside>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {results.length.toLocaleString("en-IN")} handmade items · page {page} of {pages}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="mr-1.5 size-4" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetTitle className="font-display">Filters</SheetTitle>
                <FilterPanel
                  all={all}
                  search={search}
                  onChange={onChange}
                  subcategories={subcategories}
                />
              </SheetContent>
            </Sheet>
            <Select
              value={search.sort ?? (search.q ? "relevance" : "popularity")}
              onValueChange={(v) => onChange({ sort: v, page: 1 })}
            >
              <SelectTrigger className="w-[190px]" aria-label="Sort results">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {activeChips.map((c) => (
              <Badge
                key={c.label}
                variant="secondary"
                className="cursor-pointer gap-1"
                onClick={() => onChange({ ...c.clear, page: 1 })}
              >
                {c.label} ✕
              </Badge>
            ))}
          </div>
        )}

        {slice.length === 0 ? (
          <div className="card-surface p-10 text-center">
            <p className="font-display text-lg">Nothing matched those filters</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try removing a filter, or ask the AI assistant to find something similar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {slice.map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={i < 4} />
            ))}
          </div>
        )}

        {pages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => onChange({ page: page - 1 })}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: pages })
              .map((_, i) => i + 1)
              .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
              .map((n, idx, arr) => (
                <span key={n} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== n - 1 && (
                    <span className="px-1 text-muted-foreground">…</span>
                  )}
                  <Button
                    variant={n === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => onChange({ page: n })}
                    aria-current={n === page ? "page" : undefined}
                  >
                    {n}
                  </Button>
                </span>
              ))}
            <Button
              variant="outline"
              size="icon"
              disabled={page === pages}
              onClick={() => onChange({ page: page + 1 })}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        )}
      </section>
    </div>
  );
}
