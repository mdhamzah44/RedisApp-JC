import { Link } from "@tanstack/react-router";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { productBySlug } from "@/data/catalog";
import { inr } from "@/lib/format";

type Reply = { answer: string; slugs: string[] };

const EXAMPLES = [
  "Find a gift for my mother under ₹1000",
  "Cane bed for a small Mumbai bedroom",
  "Warm lighting for a rented flat",
];

export function AiAssistant({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string) {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setReply(null);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (res.status === 429) throw new Error("Too many requests — please wait a few seconds.");
      if (!res.ok) throw new Error((await res.text()) || "The assistant is unavailable right now.");
      setReply((await res.json()) as Reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const picks = (reply?.slugs ?? []).map((s) => productBySlug.get(s)).filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader className="px-0">
          <SheetTitle className="flex items-center gap-2 font-display text-lg">
            <Sparkles className="size-4 text-brand" /> Shopping assistant
          </SheetTitle>
          <SheetDescription>
            Describe the room, the person or the budget — it searches the whole marketplace for you.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(q);
          }}
          className="flex gap-2"
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What are you looking for?"
            maxLength={300}
            aria-label="Ask the shopping assistant"
          />
          <Button type="submit" size="icon" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>

        {!reply && !loading && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="pill hover:bg-muted"
                onClick={() => {
                  setQ(ex);
                  void ask(ex);
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {reply && (
          <div className="flex-1 space-y-4 overflow-y-auto">
            <p className="whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm leading-relaxed">
              {reply.answer}
            </p>
            <div className="grid gap-3">
              {picks.map((p) => (
                <Link
                  key={p!.slug}
                  to="/product/$slug"
                  params={{ slug: p!.slug }}
                  onClick={() => onOpenChange(false)}
                  className="flex gap-3 rounded-xl border border-border p-2 hover:bg-muted"
                >
                  <img
                    src={p!.image}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    className="size-16 rounded-lg object-cover"
                  />
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-sm font-medium">{p!.name}</span>
                    <span className="text-sm text-muted-foreground">{inr(p!.price)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
