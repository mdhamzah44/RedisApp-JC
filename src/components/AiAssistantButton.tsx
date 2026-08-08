import { Sparkles } from "lucide-react";
import { useState } from "react";

import { AiAssistant } from "@/components/AiAssistant";
import { Button } from "@/components/ui/button";

/** Inline launcher for the shopping assistant, usable anywhere on the page. */
export function AiAssistantButton({
  label = "Open the AI assistant",
  className,
  size = "lg",
}: {
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={size}
        className={`gap-2 rounded-full ${className ?? ""}`}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="size-4" /> {label}
      </Button>
      <AiAssistant open={open} onOpenChange={setOpen} />
    </>
  );
}
