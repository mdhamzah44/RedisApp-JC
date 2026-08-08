import { Sparkles, X } from "lucide-react";
import { useState } from "react";

import { AiAssistant } from "@/components/AiAssistant";

/**
 * Floating assistant launcher — bottom-right on every screen size.
 */
export function AiAssistantFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close the shopping assistant" : "Open the shopping assistant"}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground shadow-lift transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
        <span className="hidden sm:inline">{open ? "Close" : "AI assistant"}</span>
      </button>
      <AiAssistant open={open} onOpenChange={setOpen} />
    </>
  );
}
