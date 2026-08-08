import { createFileRoute, redirect } from "@tanstack/react-router";

// Someone landing on /product with no slug (bad link, typed URL, etc.)
// shouldn't hit a dead page — send them to search instead.
export const Route = createFileRoute("/product/")({
  loader: () => {
    throw redirect({ to: "/search", search: { page: 1 } });
  },
});
