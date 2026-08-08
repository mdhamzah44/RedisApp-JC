/**
 * Razorpay checkout. Live keys are mandatory: with no key configured the
 * server refuses the order instead of simulating a payment.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const auth = () => import("./auth.server");
const oid = async (v: string) => new (await import("mongodb")).ObjectId(v);

const keys = () => ({
  id: process.env["RAZORPAY_KEY_ID"] ?? "",
  secret: process.env["RAZORPAY_KEY_SECRET"] ?? "",
});

const enc = new TextEncoder();

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { id, secret } = keys();
  return { enabled: Boolean(id && secret), keyId: id && secret ? id : "" };
});

const lineItem = z.object({
  slug: z.string().min(1),
  qty: z.number().int().min(1).max(20),
  variant: z.string().default("Standard"),
});

/**
 * Prices are recomputed on the server from the live catalog — the browser can
 * never dictate what an order costs.
 */
async function priceOrder(items: z.infer<typeof lineItem>[]) {
  const { getDb } = await import("./mongo.server");
  const db = await getDb();
  const docs = await db
    .collection("products")
    .find({ slug: { $in: items.map((i) => i.slug) } })
    .toArray();
  if (docs.length !== new Set(items.map((i) => i.slug)).size) {
    throw new Error("One of the items is no longer available.");
  }

  const priced = items.map((i) => {
    const doc = docs.find((d) => d["slug"] === i.slug)!;
    const price = Number(doc["price"] ?? 0);
    return {
      product: doc["_id"],
      product_name: String(doc["name"] ?? "Item"),
      seller: doc["seller"] ?? null,
      quantity: i.qty,
      price,
      variant: i.variant,
    };
  });
  const subtotal = priced.reduce((a, i) => a + i.price * i.quantity, 0);
  const shippingFee = subtotal >= 1499 || subtotal === 0 ? 0 : 99;
  return { db, priced, subtotal, shippingFee, total: subtotal + shippingFee };
}

export const createPaymentOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ items: z.array(lineItem).min(1), addressId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { id, secret } = keys();
    if (!id || !secret) {
      throw new Error(
        "Payments are not live yet — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable checkout.",
      );
    }
    const { db, user } = await (await auth()).requireUser();
    const address = await db
      .collection("addresses")
      .findOne({ _id: await oid(data.addressId), user: user._id });
    if (!address) throw new Error("Choose a delivery address first.");

    const { priced, subtotal, shippingFee, total } = await priceOrder(data.items);
    const orderNumber = `MIH${Date.now().toString(36).toUpperCase()}`;

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(total * 100),
        currency: "INR",
        receipt: orderNumber,
        notes: { user: String(user._id), orderNumber },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Razorpay order failed [${res.status}]: ${body}`);
      throw new Error(`Payment gateway error [${res.status}]. Please try again.`);
    }
    const rzp = (await res.json()) as { id: string; amount: number };

    await db.collection("orders").insertOne({
      order_number: orderNumber,
      user: user._id,
      address: address._id,
      subtotal,
      shipping_fee: shippingFee,
      total_amount: total,
      status: "pending",
      razorpay_order_id: rzp.id,
      razorpay_payment_id: "",
      razorpay_signature: "",
      created_at: new Date(),
      items: priced,
    });

    return {
      keyId: id,
      razorpayOrderId: rzp.id,
      amount: rzp.amount,
      orderNumber,
      customer: {
        name: String(address["full_name"] ?? user["name"] ?? ""),
        email: String(user["email"] ?? ""),
        contact: String(address["phone"] ?? user["phone"] ?? ""),
      },
    };
  });

export const confirmPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        razorpayOrderId: z.string().min(1),
        razorpayPaymentId: z.string().min(1),
        razorpaySignature: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { secret } = keys();
    if (!secret) throw new Error("Payments are not configured.");
    const { db, user } = await (await auth()).requireUser();

    const expected = await hmacHex(`${data.razorpayOrderId}|${data.razorpayPaymentId}`, secret);
    if (expected !== data.razorpaySignature) {
      await db
        .collection("orders")
        .updateOne(
          { razorpay_order_id: data.razorpayOrderId, user: user._id },
          { $set: { status: "failed" } },
        );
      throw new Error("Payment verification failed. You have not been charged.");
    }

    const result = await db.collection("orders").findOneAndUpdate(
      { razorpay_order_id: data.razorpayOrderId, user: user._id },
      {
        $set: {
          status: "paid",
          razorpay_payment_id: data.razorpayPaymentId,
          razorpay_signature: data.razorpaySignature,
          paid_at: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    const order = result?.["order_number"] ? result : result?.["value"];
    const orderNumber = String(
      (order as Record<string, unknown> | undefined)?.["order_number"] ?? "",
    );

    // Decrement stock so the Seller Hub inventory stays truthful.
    const items = ((order as Record<string, unknown> | undefined)?.["items"] ?? []) as Record<
      string,
      unknown
    >[];
    for (const item of items) {
      if (!item["product"]) continue;
      await db.collection("products").updateOne(
        { _id: item["product"] as never },
        {
          $inc: { stock: -Number(item["quantity"] ?? 1) },
        },
      );
    }

    return { orderNumber };
  });

/** Cash on delivery — no gateway involved, still a real order row. */
export const placeCodOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ items: z.array(lineItem).min(1), addressId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db, user } = await (await auth()).requireUser();
    const address = await db
      .collection("addresses")
      .findOne({ _id: await oid(data.addressId), user: user._id });
    if (!address) throw new Error("Choose a delivery address first.");

    const { priced, subtotal, shippingFee, total } = await priceOrder(data.items);
    const orderNumber = `MIH${Date.now().toString(36).toUpperCase()}`;
    await db.collection("orders").insertOne({
      order_number: orderNumber,
      user: user._id,
      address: address._id,
      subtotal,
      shipping_fee: shippingFee,
      total_amount: total,
      status: "cod_pending",
      payment_method: "cod",
      created_at: new Date(),
      items: priced,
    });
    return { orderNumber };
  });
