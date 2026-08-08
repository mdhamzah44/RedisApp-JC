import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { filterProducts } from "@/lib/search";

const Body = z.object({ question: z.string().trim().min(3).max(400) });

// Simple in-memory sliding-window rate limit: 8 requests / minute / IP.
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const window = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  window.push(now);
  hits.set(ip, window);
  if (hits.size > 5000) hits.clear();
  return window.length > 8;
}

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "anon";
        if (rateLimited(ip)) {
          return new Response("Rate limit exceeded", {
            status: 429,
            headers: { "Retry-After": "30" },
          });
        }

        let question: string;
        try {
          question = Body.parse(await request.json()).question;
        } catch {
          return new Response("Ask a slightly longer question.", { status: 400 });
        }

        const { getCatalogData } = await import("@/lib/catalog.server");
        const { products } = await getCatalogData();

        // Local shortlist keeps the prompt small and the response fast.
        const shortlist = filterProducts(products, { q: question, sort: "popular" }).slice(0, 24);
        const catalogText = shortlist
          .map(
            (p) =>
              `${p.slug} | ${p.name} | ₹${p.price} | ${p.materials.join("/")} | ${p.colors.join("/")} | ${p.subcategory} | ${p.rating}★ | ships ${p.shipDays}d`,
          )
          .join("\n");

        const apiKey = process.env["GROQ_API_KEY"];
        if (!apiKey) {
          return Response.json({
            answer:
              "Here are the closest matches from the marketplace based on your description. Connect the AI key to get tailored styling advice too.",
            slugs: shortlist.slice(0, 4).map((p) => p.slug),
          });
        }

        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: process.env["GROQ_MODEL"] ?? "llama-3.3-70b-versatile",
              temperature: 0.4,
              max_tokens: 500,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content:
                    "You are a shopping assistant for MakinItHome, an Indian handmade furniture and decor marketplace. Recommend ONLY from the provided catalog lines. Reply as json with keys: answer (2-4 sentences, friendly, mentions materials/budget fit, prices in INR) and slugs (array of up to 4 product slugs copied exactly from the catalog).",
                },
                { role: "user", content: `Catalog:\n${catalogText}\n\nShopper: ${question}` },
              ],
            }),
          });

          if (!res.ok) {
            const status = res.status === 429 ? 429 : 502;
            return new Response(
              status === 429
                ? "The assistant is busy — try again shortly."
                : "Assistant unavailable.",
              { status },
            );
          }

          const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as {
            answer?: string;
            slugs?: string[];
          };
          const valid = new Set(shortlist.map((p) => p.slug));
          return Response.json({
            answer: parsed.answer ?? "Here are a few pieces that fit what you described.",
            slugs: (parsed.slugs ?? []).filter((s) => valid.has(s)).slice(0, 4),
          });
        } catch {
          return Response.json({
            answer:
              "The assistant is offline, but these listings match your description most closely.",
            slugs: shortlist.slice(0, 4).map((p) => p.slug),
          });
        }
      },
    },
  },
});
