import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { sendStoreMessage } from "@/lib/account.functions";
import { useSessionUser } from "@/lib/session";

/**
 * Message a store. The thread lands in the seller's inbox inside the Seller Hub
 * and the replies come back on the buyer's account page.
 */
export function MessageStoreButton({
  sellerSlug,
  storeName,
  productSlug,
  subject,
  variant = "outline",
  className,
  label = "Message store",
}: {
  sellerSlug: string;
  storeName: string;
  productSlug?: string;
  subject?: string;
  variant?: "outline" | "default" | "secondary" | "ghost";
  className?: string;
  label?: string;
}) {
  const { data: user } = useSessionUser();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [body, setBody] = useState("");

  const send = useMutation({
    mutationFn: () =>
      sendStoreMessage({
        data: { sellerSlug, productSlug: productSlug ?? "", subject: subject ?? "", body },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`Message sent to ${storeName}`, {
        description: "Replies appear in Account → Messages.",
      });
      setBody("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Button
        variant={variant}
        className={className ?? "gap-1.5 rounded-full"}
        onClick={() => (user ? setOpen(true) : setAuthOpen(true))}
      >
        <MessageSquare className="size-4" /> {label}
      </Button>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        reason={`Sign in to message ${storeName}.`}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Message {storeName}</DialogTitle>
            <DialogDescription>
              Ask about sizing, custom finishes, bulk orders or delivery timelines.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder={`Hi ${storeName}, could you make this in a darker walnut finish?`}
          />
          <Button
            className="rounded-full"
            disabled={send.isPending || body.trim().length < 2}
            onClick={() => send.mutate()}
          >
            {send.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Send message
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
