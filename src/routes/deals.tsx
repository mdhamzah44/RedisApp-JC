import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Browse, type BrowseSearch } from "@/components/Browse";
import { products } from "@/data/catalog";
import { validateBrowseSearch } from "@/lib/browse-search";

export const Route = createFileRoute("/deals")({
  validateSearch: validateBrowseSearch,
  head: () => ({
    meta: [
      { title: "Today's deals on handmade decor | MakinItHome" },
      {
        name: "description",
        content:
          "Live discounts from Indian workshops — handmade furniture, lighting and textiles marked down, with honest price history on every listing.",
      },
      { property: "og:title", content: "Today's deals — MakinItHome" },
      {
        property: "og:description",
        content: "Discounted handmade pieces from verified Indian makers.",
      },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const onSale = products.filter((p) => p.comparePrice);

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-3xl">Today's deals</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every discount here is measured against the seller's own past price — open any listing to
        see its six-month price history before you buy.
      </p>
      <div className="mt-6">
        <Browse
          all={onSale}
          search={search}
          onChange={(next: Partial<BrowseSearch>) =>
            void navigate({
              to: "/deals",
              search: (prev: BrowseSearch) => ({ ...prev, ...next }),
              resetScroll: false,
            })
          }
          title="On sale now"
        />
      </div>
    </div>
  );
}
