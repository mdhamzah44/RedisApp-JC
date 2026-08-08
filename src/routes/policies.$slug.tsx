import { createFileRoute } from "@tanstack/react-router";

const POLICIES: Record<string, { title: string; body: string[] }> = {
  shipping: {
    title: "Shipping & delivery",
    body: [
      "Orders are dispatched by the maker's own workshop, usually within 2–7 days depending on whether a piece is in stock or made to order. Every listing shows its dispatch window before you pay, and the PIN code checker on the product page converts that into a real delivery date for your address.",
      "Shipping is free on orders above ₹1,499. Below that a flat ₹99 applies. Large furniture is moved by surface freight with two-person delivery in metro cities; smaller decor ships by air courier.",
      "You get tracking on WhatsApp and email at every stage: confirmed, packed, shipped, out for delivery and delivered.",
    ],
  },
  returns: {
    title: "Returns & refunds",
    body: [
      "Every order is covered for 7 days from delivery. Start a return from your account and we arrange a free reverse pickup — you do not pay for shipping on a return.",
      "Refunds are issued to the original payment method: 2–3 working days for UPI, 5–7 working days for cards and net banking. COD refunds go to a bank account you nominate.",
      "Made-to-order and personalised pieces are returnable only if they arrive damaged or differ from the listing. Upload photos within 48 hours of delivery and we settle the claim with the maker on your behalf.",
    ],
  },
  "buyer-protection": {
    title: "Buyer protection",
    body: [
      "Your payment is held until the order is delivered. If a package never arrives, arrives broken, or is materially different from the listing, we refund you in full.",
      "All disputes are handled in-house within 72 hours. You never negotiate directly with a workshop over a damaged shipment — we do it for you.",
      "Card and UPI details are never stored on our servers. Payments run through PCI-DSS compliant gateways with 3D Secure.",
    ],
  },
  "seller-verification": {
    title: "How we verify makers",
    body: [
      "Every shop on MakinItHome is checked for GST registration, business KYC and a working bank account before a single listing goes live.",
      "We visit or video-audit each workshop, confirm the craft is genuinely made in-house, and photograph the production area.",
      "Sellers are scored continuously on on-time dispatch, defect rate and response time. Shops that fall below our threshold are delisted.",
    ],
  },
  privacy: {
    title: "Privacy",
    body: [
      "We collect only what an order needs: your name, delivery address, phone number and email. We never sell personal data.",
      "Browsing history stays in your browser and powers your recommendations locally. You can clear it any time from your account.",
      "Messages with sellers are stored so we can resolve disputes, and are visible only to you, the seller and our support team.",
    ],
  },
  terms: {
    title: "Terms of use",
    body: [
      "MakinItHome is a marketplace. Contracts of sale are between you and the maker; we facilitate payment, delivery and dispute resolution.",
      "Prices include all taxes. Handmade pieces vary slightly in grain, weave and colour — this variation is a feature of the craft, not a defect.",
      "Misuse of the platform, including fraudulent returns or abusive messages to makers, may result in account suspension.",
    ],
  },
};

export const Route = createFileRoute("/policies/$slug")({
  loader: ({ params }) => {
    const policy = POLICIES[params.slug] ?? {
      title: "Policies",
      body: ["Choose a policy from the footer to read the details."],
    };
    return { policy };
  },
  head: ({ loaderData }) => {
    const title = `${loaderData?.policy.title ?? "Policies"} — MakinItHome`;
    const description =
      loaderData?.policy.body[0]?.slice(0, 158) ?? "MakinItHome marketplace policies.";
    return {
      meta: [
        { title: title.slice(0, 60) },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: PolicyPage,
});

function PolicyPage() {
  const { policy } = Route.useLoaderData() as { policy: { title: string; body: string[] } };
  return (
    <article className="container-page max-w-3xl py-12">
      <h1 className="font-display text-3xl">{policy.title}</h1>
      <div className="mt-6 space-y-4">
        {policy.body.map((p) => (
          <p key={p.slice(0, 20)} className="text-sm leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>
    </article>
  );
}
