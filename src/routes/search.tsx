import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Browse, type BrowseSearch } from "@/components/Browse";
import { products } from "@/data/catalog";
import { validateBrowseSearch } from "@/lib/browse-search";
import { correctQuery } from "@/lib/search";

export const Route = createFileRoute("/search")({
  validateSearch: validateBrowseSearch,
  head: () => ({
    meta: [
      { title: "Search handmade furniture & decor | MakinItHome" },
      {
        name: "description",
        content:
          "Search thousands of handmade pieces from verified Indian makers with smart filters for price, material, colour and delivery time.",
      },
      { name: "robots", content: "noindex,follow" },
      { property: "og:title", content: "Search MakinItHome" },
      {
        property: "og:description",
        content: "Find handmade furniture and decor from Indian makers.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const fix = search.q ? correctQuery(search.q) : { corrected: "", changed: false };

  function onChange(next: Partial<BrowseSearch>) {
    void navigate({
      to: "/search",
      search: (prev: BrowseSearch) => ({ ...prev, ...next }),
      resetScroll: false,
    });
  }

  return (
    <div className="container-page py-8">
      {fix.changed && (
        <p className="mb-4 text-sm text-muted-foreground">
          Showing results for{" "}
          <button
            type="button"
            className="font-semibold text-brand underline"
            onClick={() => onChange({ q: fix.corrected, page: 1 })}
          >
            {fix.corrected}
          </button>{" "}
          instead of “{search.q}”.
        </p>
      )}
      <Browse
        all={products}
        search={search}
        onChange={onChange}
        title={search.q ? `Results for “${search.q}”` : "All handmade pieces"}
      />
    </div>
  );
}
