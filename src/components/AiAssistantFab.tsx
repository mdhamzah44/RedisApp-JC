import { Sparkles, X } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { useAiAssistantOpen } from "@/lib/ai-assistant-state";

// Code-split: the assistant panel (and the Radix Sheet it pulls in) is only needed
// once a shopper actually opens it, so keep it out of the initial JS payload. This
// is the one place that mounts <AiAssistant> — the header button (SiteHeader)
// shares the same open/close state via useAiAssistantOpen() instead of mounting
// its own second copy.
const AiAssistant = lazy(() =>
  import("@/components/AiAssistant").then((m) => ({ default: m.AiAssistant })),
);

/**
 * Floating assistant launcher — bottom-right on every screen size.
 */
export function AiAssistantFab() {
  const [open, setOpen] = useAiAssistantOpen();
  const [everOpened, setEverOpened] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEverOpened(true);
          setOpen(!open);
        }}
        aria-label={open ? "Close the shopping assistant" : "Open the shopping assistant"}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground shadow-lift transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
        <span className="hidden sm:inline">{open ? "Close" : "AI assistant"}</span>
      </button>
      {(everOpened || open) && (
        <Suspense fallback={null}>
          <AiAssistant open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
