import { useSyncExternalStore } from "react";

// The AI assistant panel is opened from two places (the header's "AI assistant"
// nav button, and the floating action button). Previously each mounted its own
// <AiAssistant> instance, doubling the Sheet DOM/JS and risking duplicate
// element IDs. This module gives both callers a single shared open/close flag
// so only one instance ever needs to be mounted.
let open = false;
const listeners = new Set<() => void>();

function set(next: boolean) {
  open = next;
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return open;
}

function getServerSnapshot() {
  return false;
}

export function useAiAssistantOpen() {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [isOpen, set] as const;
}
