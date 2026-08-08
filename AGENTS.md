# Agent notes

MakinItHome is a TanStack Start (React 19 + TypeScript + Tailwind) storefront
that reads its catalog live from a shared MongoDB database (the same database
the Flask "Seller Hub" app writes to). There is no demo/mock data path in
production — `src/lib/catalog.server.ts` loads everything from Mongo.

- Server-only code (DB access, session/password hashing, third-party API
  keys) lives in `*.server.ts` / `*.functions.ts` files and is dynamically
  imported so it never reaches the client bundle.
- Only `VITE_`-prefixed env vars are exposed to the browser — keep it that
  way. Never read a non-`VITE_` var from a component.
- Auth (`src/lib/auth.functions.ts`, `src/lib/auth.server.ts`) supports
  email+password, Google Sign-In and phone OTP against the same `users`
  collection the Seller Hub writes to, so sessions/orders line up across
  both apps.
