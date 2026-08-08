import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Loader2, MapPin, Package, Plus, Send, Trash2, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AddressDialog } from "@/components/AddressDialog";
import { AuthDialog } from "@/components/AuthDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { productBySlug } from "@/data/catalog";
import {
  deleteAddress,
  markConversationRead,
  sendStoreMessage,
  type Address,
  type ConversationView,
  type OrderView,
} from "@/lib/account.functions";
import { updateProfile } from "@/lib/auth.functions";
import { inr } from "@/lib/format";
import {
  useAddresses,
  useConversations,
  useOrders,
  useSessionUser,
  useSignOut,
} from "@/lib/session";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — MakinItHome" },
      {
        name: "description",
        content: "Track orders, manage saved addresses and chat with the makers you bought from.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your account — MakinItHome" },
      { property: "og:description", content: "Orders, addresses and store messages in one place." },
    ],
  }),
  component: AccountPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  cod_pending: "Cash on delivery",
  processing: "In the workshop",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Payment failed",
};

function AccountPage() {
  const { data: user, isLoading } = useSessionUser();
  const [authOpen, setAuthOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container-page flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-page py-20 text-center">
        <UserIcon className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl">Sign in to your account</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Track orders, keep addresses handy and continue conversations with the makers.
        </p>
        <Button className="mt-6" onClick={() => setAuthOpen(true)}>
          Sign in or create an account
        </Button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    );
  }

  return <SignedInAccount />;
}

function SignedInAccount() {
  const { data: user } = useSessionUser();
  const signOut = useSignOut();
  const { data: orders = [] } = useOrders(true);
  const { data: addresses = [] } = useAddresses(true);
  const { data: conversations = [] } = useConversations(true);
  const recent = useAppState((s) => s.recent);

  return (
    <div className="container-page py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Hello, {user?.name}</h1>
          <p className="text-sm text-muted-foreground">{user?.email || user?.phone}</p>
        </div>
        <Button variant="outline" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
          Sign out
        </Button>
      </header>

      <Tabs defaultValue="orders" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({conversations.length})</TabsTrigger>
          <TabsTrigger value="addresses">Addresses ({addresses.length})</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="pt-6">
          <OrdersPanel orders={orders} />
        </TabsContent>
        <TabsContent value="messages" className="pt-6">
          <MessagesPanel conversations={conversations} />
        </TabsContent>
        <TabsContent value="addresses" className="pt-6">
          <AddressesPanel addresses={addresses} />
        </TabsContent>
        <TabsContent value="profile" className="pt-6">
          <ProfilePanel />
        </TabsContent>
      </Tabs>

      {recent.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl">Recently viewed</h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {recent
              .map((slug) => productBySlug.get(slug))
              .filter(Boolean)
              .slice(0, 10)
              .map((p) => (
                <Link
                  key={p!.slug}
                  to="/product/$slug"
                  params={{ slug: p!.slug }}
                  className="w-40 shrink-0"
                >
                  <img
                    src={p!.image}
                    alt=""
                    className="h-32 w-40 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <p className="mt-2 line-clamp-2 text-sm">{p!.name}</p>
                  <p className="text-sm font-medium">{inr(p!.price)}</p>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OrdersPanel({ orders }: { orders: OrderView[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Package className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
        <Button asChild className="mt-4">
          <Link to="/">Start shopping</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {orders.map((o) => (
        <article key={o.id} className="card-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Order {o.orderNumber}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(o.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <Badge variant="secondary">{STATUS_LABEL[o.status] ?? o.status}</Badge>
          </div>
          <Separator className="my-4" />
          <ul className="space-y-3 text-sm">
            {o.items.map((i, idx) => (
              <li key={`${o.id}-${idx}`} className="flex items-center gap-3">
                {i.image && (
                  <img
                    src={i.image}
                    alt=""
                    className="size-12 rounded-md object-cover"
                    loading="lazy"
                  />
                )}
                <span className="flex-1">
                  {i.productSlug ? (
                    <Link
                      to="/product/$slug"
                      params={{ slug: i.productSlug }}
                      className="font-medium hover:underline"
                    >
                      {i.productName}
                    </Link>
                  ) : (
                    <span className="font-medium">{i.productName}</span>
                  )}
                  <span className="block text-muted-foreground">
                    {i.sellerName} · qty {i.quantity}
                  </span>
                </span>
                <span className="font-medium">{inr(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {o.address
                ? `${o.address.fullName}, ${o.address.city} ${o.address.pincode}`
                : "Address on file"}
            </span>
            <span className="font-semibold">Total {inr(o.total)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function MessagesPanel({ conversations }: { conversations: ConversationView[] }) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string>(conversations[0]?.id ?? "");
  const [body, setBody] = useState("");
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  const send = useMutation({
    mutationFn: () => sendStoreMessage({ data: { conversationId: active!.id, body } }),
    onSuccess: async () => {
      setBody("");
      await qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openThread = (c: ConversationView) => {
    setActiveId(c.id);
    if (c.unread > 0) {
      void markConversationRead({ data: { conversationId: c.id } }).then(() =>
        qc.invalidateQueries({ queryKey: ["conversations"] }),
      );
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No conversations yet — use “Message store” on any product or shop page.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <ul className="grid h-fit gap-2">
        {conversations.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => openThread(c)}
              className={`w-full rounded-xl border p-3 text-left text-sm ${
                active?.id === c.id ? "border-brand bg-brand/5" : "border-border"
              }`}
            >
              <span className="flex items-center justify-between gap-2 font-medium">
                {c.storeName}
                {c.unread > 0 && <Badge className="h-5 px-1.5 text-[10px]">{c.unread}</Badge>}
              </span>
              <span className="mt-1 block line-clamp-1 text-muted-foreground">{c.lastMessage}</span>
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-medium">{active.subject}</p>
          {active.storeSlug && (
            <Link
              to="/shop/$slug"
              params={{ slug: active.storeSlug }}
              className="text-sm text-brand hover:underline"
            >
              Visit {active.storeName}
            </Link>
          )}
          <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
            {active.messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-xl p-3 text-sm ${
                  m.senderRole === "customer"
                    ? "ml-auto bg-brand text-brand-foreground"
                    : "bg-secondary"
                }`}
              >
                <p className="whitespace-pre-line">{m.body}</p>
                <p className="mt-1 text-[10px] opacity-70">
                  {new Date(m.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="Write a reply…"
            />
            <Button
              className="gap-1.5"
              disabled={body.trim().length < 2 || send.isPending}
              onClick={() => send.mutate()}
            >
              {send.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddressesPanel({ addresses }: { addresses: Address[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => deleteAddress({ data: { id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <Button
        className="gap-1.5"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
      >
        <Plus className="size-4" /> Add address
      </Button>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <article key={a.id} className="card-surface p-5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">
                {a.fullName} · {a.label}
              </p>
              {a.isDefault && <Badge variant="secondary">Default</Badge>}
            </div>
            <p className="mt-2 flex gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {[a.line1, a.line2, a.city, a.state, a.pincode, a.country].filter(Boolean).join(", ")}
            </p>
            <p className="mt-1 text-muted-foreground">{a.phone}</p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(a);
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive"
                onClick={() => remove.mutate(a.id)}
              >
                <Trash2 className="size-4" /> Remove
              </Button>
            </div>
          </article>
        ))}
      </div>
      <AddressDialog
        open={open}
        onOpenChange={setOpen}
        address={editing}
        title={editing ? "Edit address" : "Add a delivery address"}
      />
    </div>
  );
}

function ProfilePanel() {
  const { data: user } = useSessionUser();
  const qc = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const save = useMutation({
    mutationFn: () => updateProfile({ data: { name, phone } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["session"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-md space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="acc-name">Full name</Label>
        <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="acc-phone">Mobile number</Label>
        <Input
          id="acc-phone"
          value={phone}
          inputMode="numeric"
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="acc-email">Email</Label>
        <Input id="acc-email" value={user?.email ?? ""} disabled />
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending || name.trim().length < 2}>
        {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Save profile
      </Button>
    </div>
  );
}
