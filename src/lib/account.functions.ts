/**
 * Buyer account data — addresses, orders and store conversations. Every write
 * lands in the same collections the Seller Hub reads, so a placed order or a
 * new message shows up for the seller immediately.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const auth = () => import("./auth.server");
const mongo = () => import("./mongo.server");
const oid = async (v: string) => new (await import("mongodb")).ObjectId(v);

export type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
};

export type OrderItemView = {
  productName: string;
  productSlug: string;
  image: string;
  quantity: number;
  price: number;
  sellerName: string;
  sellerSlug: string;
};

export type OrderView = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  createdAt: string;
  paymentId: string;
  address: Address | null;
  items: OrderItemView[];
};

export type MessageView = {
  id: string;
  body: string;
  senderRole: string;
  createdAt: string;
};

export type ConversationView = {
  id: string;
  subject: string;
  status: string;
  storeName: string;
  storeSlug: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  messages: MessageView[];
};

const addressInput = z.object({
  id: z.string().optional(),
  label: z.string().trim().max(30).default("Home"),
  fullName: z.string().trim().min(2, "Enter the full name."),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  line1: z.string().trim().min(4, "Enter the house / street."),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city."),
  state: z.string().trim().min(2, "Enter the state."),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit PIN code."),
  country: z.string().trim().default("India"),
  isDefault: z.boolean().default(false),
});

type ObjectIdLike = import("mongodb").ObjectId;

type AddressDoc = Record<string, unknown> & { _id: unknown };

export function mapAddress(doc: AddressDoc): Address {
  return {
    id: String(doc._id),
    label: (doc["label"] as string) || "Home",
    fullName: (doc["full_name"] as string) || "",
    phone: (doc["phone"] as string) || "",
    line1: (doc["line1"] as string) || "",
    line2: (doc["line2"] as string) || "",
    city: (doc["city"] as string) || "",
    state: (doc["state"] as string) || "",
    pincode: (doc["pincode"] as string) || "",
    country: (doc["country"] as string) || "India",
    isDefault: doc["is_default"] === true,
  };
}

export const listAddresses = createServerFn({ method: "GET" }).handler(
  async (): Promise<Address[]> => {
    const session = await (await auth()).getSessionUser();
    if (!session) return [];
    const docs = await session.db
      .collection("addresses")
      .find({ user: session.user._id })
      .sort({ is_default: -1 })
      .toArray();
    return docs.map(mapAddress);
  },
);

export const saveAddress = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => addressInput.parse(input))
  .handler(async ({ data }): Promise<Address[]> => {
    const { db, user } = await (await auth()).requireUser();
    const set = {
      user: user._id,
      label: data.label || "Home",
      full_name: data.fullName,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 ?? "",
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: data.country || "India",
      is_default: data.isDefault,
    };

    const existingCount = await db.collection("addresses").countDocuments({ user: user._id });
    if (existingCount === 0) set.is_default = true;

    if (data.id) {
      await db
        .collection("addresses")
        .updateOne({ _id: await oid(data.id), user: user._id }, { $set: set });
    } else {
      await db.collection("addresses").insertOne(set);
    }
    if (set.is_default) {
      await db.collection("addresses").updateMany(
        { user: user._id, ...(data.id ? { _id: { $ne: await oid(data.id) } } : {}) },
        {
          $set: { is_default: false },
        },
      );
      if (data.id) {
        await db
          .collection("addresses")
          .updateOne({ _id: await oid(data.id) }, { $set: { is_default: true } });
      } else {
        await db
          .collection("addresses")
          .updateOne(
            { user: user._id, line1: set.line1, pincode: set.pincode },
            { $set: { is_default: true } },
          );
      }
    }

    const docs = await db
      .collection("addresses")
      .find({ user: user._id })
      .sort({ is_default: -1 })
      .toArray();
    return docs.map(mapAddress);
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data }): Promise<Address[]> => {
    const { db, user } = await (await auth()).requireUser();
    await db.collection("addresses").deleteOne({ _id: await oid(data.id), user: user._id });
    const docs = await db.collection("addresses").find({ user: user._id }).toArray();
    if (docs.length && !docs.some((d) => d["is_default"] === true)) {
      await db
        .collection("addresses")
        .updateOne({ _id: docs[0]!._id }, { $set: { is_default: true } });
      docs[0]!["is_default"] = true;
    }
    return docs.map(mapAddress);
  });

export const listOrders = createServerFn({ method: "GET" }).handler(
  async (): Promise<OrderView[]> => {
    const session = await (await auth()).getSessionUser();
    if (!session) return [];
    const { db, user } = session;
    const orders = await db
      .collection("orders")
      .find({ user: user._id })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    if (!orders.length) return [];

    const addressIds = orders.map((o) => o["address"]).filter(Boolean) as ObjectIdLike[];
    const addressDocs = addressIds.length
      ? await db
          .collection("addresses")
          .find({ _id: { $in: addressIds } })
          .toArray()
      : [];
    const addressById = new Map(addressDocs.map((a) => [String(a._id), mapAddress(a)]));

    const productIds = orders
      .flatMap((o) =>
        ((o["items"] as Record<string, unknown>[] | undefined) ?? []).map((i) => i["product"]),
      )
      .filter(Boolean) as ObjectIdLike[];
    const productDocs = productIds.length
      ? await db
          .collection("products")
          .find({ _id: { $in: productIds } })
          .project({ slug: 1, name: 1, images: 1, seller: 1 })
          .toArray()
      : [];
    const productById = new Map(productDocs.map((p) => [String(p["_id"]), p]));
    const sellerDocs = await db
      .collection("sellers")
      .find({})
      .project({ store_name: 1, slug: 1 })
      .toArray();
    const sellerById = new Map(sellerDocs.map((s) => [String(s["_id"]), s]));

    return orders.map((o) => {
      const items = ((o["items"] as Record<string, unknown>[] | undefined) ?? []).map((i) => {
        const p = productById.get(String(i["product"]));
        const seller = sellerById.get(String(i["seller"] ?? p?.["seller"]));
        const images = (p?.["images"] as { url?: string }[] | undefined) ?? [];
        return {
          productName: (i["product_name"] as string) || (p?.["name"] as string) || "Item",
          productSlug: (p?.["slug"] as string) || "",
          image: images[0]?.url ?? "",
          quantity: Number(i["quantity"] ?? 1),
          price: Number(i["price"] ?? 0),
          sellerName: (seller?.["store_name"] as string) || "Studio",
          sellerSlug: (seller?.["slug"] as string) || "",
        } satisfies OrderItemView;
      });
      return {
        id: String(o._id),
        orderNumber: (o["order_number"] as string) || "",
        status: (o["status"] as string) || "pending",
        subtotal: Number(o["subtotal"] ?? 0),
        shippingFee: Number(o["shipping_fee"] ?? 0),
        total: Number(o["total_amount"] ?? 0),
        createdAt: new Date((o["created_at"] as Date) ?? Date.now()).toISOString(),
        paymentId: (o["razorpay_payment_id"] as string) || "",
        address: addressById.get(String(o["address"])) ?? null,
        items,
      } satisfies OrderView;
    });
  },
);

export const listConversations = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConversationView[]> => {
    const session = await (await auth()).getSessionUser();
    if (!session) return [];
    const { db, user } = session;
    const convos = await db
      .collection("conversations")
      .find({ customer: user._id })
      .sort({ last_message_at: -1 })
      .limit(40)
      .toArray();
    if (!convos.length) return [];

    const messages = await db
      .collection("messages")
      .find({ conversation: { $in: convos.map((c) => c._id) } })
      .sort({ created_at: 1 })
      .toArray();
    const sellers = await db
      .collection("sellers")
      .find({})
      .project({ store_name: 1, slug: 1 })
      .toArray();
    const sellerById = new Map(sellers.map((s) => [String(s["_id"]), s]));

    return convos.map((c) => {
      const seller = sellerById.get(String(c["seller"]));
      return {
        id: String(c._id),
        subject: (c["subject"] as string) || "Conversation",
        status: (c["status"] as string) || "open",
        storeName: (seller?.["store_name"] as string) || "Marketplace support",
        storeSlug: (seller?.["slug"] as string) || "",
        lastMessage: (c["last_message"] as string) || "",
        lastMessageAt: new Date((c["last_message_at"] as Date) ?? Date.now()).toISOString(),
        unread: Number(c["unread_customer"] ?? 0),
        messages: messages
          .filter((m) => String(m["conversation"]) === String(c._id))
          .map((m) => ({
            id: String(m._id),
            body: (m["body"] as string) || "",
            senderRole: (m["sender_role"] as string) || "customer",
            createdAt: new Date((m["created_at"] as Date) ?? Date.now()).toISOString(),
          })),
      } satisfies ConversationView;
    });
  },
);

/** Message a store (or marketplace support when no store slug is given). */
export const sendStoreMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sellerSlug: z.string().trim().optional().or(z.literal("")),
        productSlug: z.string().trim().optional().or(z.literal("")),
        subject: z.string().trim().max(160).optional().or(z.literal("")),
        body: z.string().trim().min(2, "Type a message first."),
        conversationId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ conversationId: string }> => {
    const { db, user } = await (await auth()).requireUser();
    const now = new Date();

    let conversationId = data.conversationId ? await oid(data.conversationId) : null;

    if (!conversationId) {
      const seller = data.sellerSlug
        ? await db.collection("sellers").findOne({ slug: data.sellerSlug })
        : null;
      const product = data.productSlug
        ? await db.collection("products").findOne({ slug: data.productSlug })
        : null;

      const existing = await db.collection("conversations").findOne({
        customer: user._id,
        seller: seller?._id ?? null,
        product: product?._id ?? null,
        status: "open",
      });

      if (existing) {
        conversationId = existing._id as never;
      } else {
        const inserted = await db.collection("conversations").insertOne({
          kind: seller ? "store" : "support",
          customer: user._id,
          seller: seller?._id ?? null,
          product: product?._id ?? null,
          subject: data.subject || (product ? String(product["name"]) : "Store enquiry"),
          status: "open",
          last_message: data.body.slice(0, 300),
          last_message_at: now,
          created_at: now,
          unread_customer: 0,
          unread_staff: 1,
        });
        conversationId = inserted.insertedId as never;
      }
    }

    await db.collection("messages").insertOne({
      conversation: conversationId,
      sender: user._id,
      sender_role: "customer",
      body: data.body,
      created_at: now,
    });
    await db.collection("conversations").updateOne(
      { _id: conversationId },
      {
        $set: { last_message: data.body.slice(0, 300), last_message_at: now, status: "open" },
        $inc: { unread_staff: 1 },
      },
    );

    return { conversationId: String(conversationId) };
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ conversationId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { db, user } = await (await auth()).requireUser();
    await db.collection("conversations").updateOne(
      { _id: await oid(data.conversationId), customer: user._id },
      {
        $set: { unread_customer: 0 },
      },
    );
    return { ok: true };
  });
