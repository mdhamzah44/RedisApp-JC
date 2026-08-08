import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, Sparkles, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AiAssistant } from "@/components/AiAssistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { categories, sellerBySlug } from "@/data/catalog";
import { correctQuery, suggest } from "@/lib/search";
import { getSiteMode } from "@/lib/site-mode";
import { useAppState } from "@/lib/store";

export function SiteHeader() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const site = getSiteMode();
  const store = site.storeSlug ? sellerBySlug.get(site.storeSlug) : undefined;

  const cartCount = useAppState((s) => s.cart.reduce((n, l) => n + l.qty, 0));
  const wishCount = useAppState((s) => s.wishlists.reduce((n, w) => n + w.slugs.length, 0));

  const results = q.trim().length > 1 ? suggest(q, 6) : [];
  const fix = q.trim().length > 3 ? correctQuery(q) : { corrected: q, changed: false };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(term: string) {
    const value = term.trim();
    if (!value) return;
    setOpen(false);
    void navigate({ to: "/search", search: { q: value, page: 1 } });
  }

  function startVoice() {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => any;
      SpeechRecognition?: new () => any;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      submit(q);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript as string;
      setQ(text);
      submit(text);
    };
    rec.start();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-page flex items-center gap-3 py-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetTitle className="font-display text-lg">Browse categories</SheetTitle>
            <nav className="mt-4 grid gap-1">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to="/c/$slug"
                  params={{ slug: c.slug }}
                  className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
            <nav className="mt-4 grid gap-1 border-t border-border pt-4">
              <Link to="/deals" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                Today's deals
              </Link>
              <Link
                to="/search"
                search={{ page: 1 }}
                className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                Search everything
              </Link>
              <Link to="/account" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                Your account & orders
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-display text-xl font-semibold tracking-tight"
        >
          {store ? (
            <>
              {store.logoUrl && (
                <img src={store.logoUrl} alt="" className="size-8 rounded-lg object-cover" />
              )}
              <span>{store.name}</span>
            </>
          ) : (
            <>
              MakinIt<span className="text-brand">Home</span>
            </>
          )}
        </Link>

        <div ref={boxRef} className="relative hidden flex-1 md:block">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(q);
            }}
            role="search"
          >
            <div className="flex items-center gap-2 rounded-full border border-input bg-surface pl-4 pr-1.5 py-1 focus-within:ring-2 focus-within:ring-ring/40">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Search cane beds, block print cushions, stoneware…"
                aria-label="Search products"
                className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              {q && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setQ("")}
                  aria-label="Clear"
                >
                  <X className="size-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={startVoice}
                aria-label="Search by voice"
                title="Search by voice"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
                </svg>
              </Button>
              <Button type="submit" size="sm" className="rounded-full">
                Search
              </Button>
            </div>
          </form>

          {open && (results.length > 0 || fix.changed) && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-lift">
              {fix.changed && (
                <button
                  type="button"
                  onClick={() => submit(fix.corrected)}
                  className="w-full border-b border-border px-4 py-2 text-left text-sm"
                >
                  Did you mean <span className="font-semibold text-brand">{fix.corrected}</span>?
                </button>
              )}
              <ul>
                {results.map((p) => (
                  <li key={p.slug}>
                    <Link
                      to="/product/$slug"
                      params={{ slug: p.slug }}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted"
                    >
                      <img
                        src={p.image}
                        alt=""
                        width={40}
                        height={40}
                        loading="lazy"
                        className="size-10 rounded-md object-cover"
                      />
                      <span className="line-clamp-1">{p.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5 rounded-full text-brand md:ml-0"
          onClick={() => setAiOpen(true)}
          aria-label="Open the AI shopping assistant"
        >
          <Sparkles className="size-4" /> <span className="hidden sm:inline">AI assistant</span>
        </Button>

        <Link to="/wishlist" aria-label="Favourites" className="relative p-2">
          <Heart className="size-5" />
          {wishCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-brand-foreground">
              {wishCount}
            </span>
          )}
        </Link>
        <Link to="/account" aria-label="Your account" className="p-2">
          <User className="size-5" />
        </Link>
        <Link to="/cart" aria-label="Cart" className="relative p-2">
          <ShoppingBag className="size-5" />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-brand-foreground">
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      <nav aria-label="Categories" className="hidden border-t border-border lg:block">
        <ul className="container-page flex items-center gap-6 overflow-x-auto py-2 text-sm">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                to="/c/$slug"
                params={{ slug: c.slug }}
                className="whitespace-nowrap text-muted-foreground hover:text-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                {c.name}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/deals" className="whitespace-nowrap font-medium text-brand">
              Today's deals
            </Link>
          </li>
        </ul>
      </nav>

      <AiAssistant open={aiOpen} onOpenChange={setAiOpen} />
    </header>
  );
}
