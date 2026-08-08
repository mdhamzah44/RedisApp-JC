/**
 * Real authentication against the shared Seller Hub `users` collection.
 * Email + password, phone OTP, and Google Sign-In all resolve to the same
 * user document so orders and messages show up in the Seller Hub.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SessionUser } from "./auth.server";

// Server-only modules are loaded inside handlers so nothing leaks to the browser bundle.
const auth = () => import("./auth.server");
const mongo = () => import("./mongo.server");
const oid = async (v: string) => new (await import("mongodb")).ObjectId(v);

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const password = z.string().min(8, "Use at least 8 characters.");
const phone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number.");

const randomColor = () => {
  const palette = ["#2C3B26", "#7A5C3E", "#3E5A6B", "#6B3E4E", "#4E6B3E"];
  return palette[Math.floor(Math.random() * palette.length)]!;
};

export const getMe = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    const session = await (await auth()).getSessionUser();
    return session ? (await auth()).toSessionUser(session.user) : null;
  },
);

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2, "Tell us your name."),
        email,
        phone: phone.optional().or(z.literal("")),
        password,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<SessionUser> => {
    const { getDb } = await mongo();
    const db = await getDb();
    const existing = await db.collection("users").findOne({ email: data.email });
    if (existing) throw new Error("An account with this email already exists. Please sign in.");

    const doc = {
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      password_hash: await (await auth()).hashPassword(data.password),
      avatar_color: randomColor(),
      is_admin: false,
      is_suspended: false,
      created_at: new Date(),
    };
    const res = await db.collection("users").insertOne(doc);
    await (await auth()).issueSession(String(res.insertedId));
    return (await auth()).toSessionUser({ ...doc, _id: res.insertedId });
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email, password: z.string().min(1, "Enter your password.") }).parse(input),
  )
  .handler(async ({ data }): Promise<SessionUser> => {
    const { getDb } = await mongo();
    const db = await getDb();
    const user = await db.collection("users").findOne({ email: data.email });
    if (!user) throw new Error("No account found for that email.");
    if (user["is_suspended"] === true) throw new Error("This account has been suspended.");
    const ok = await (
      await auth()
    ).verifyPassword(data.password, String(user["password_hash"] ?? ""));
    if (!ok) {
      throw new Error(
        "Incorrect password. If you signed up in the Seller Hub, reset your password there.",
      );
    }
    await db
      .collection("login_events")
      .insertOne({ user: user._id, at: new Date(), source: "marketplace" })
      .catch(() => undefined);
    await (await auth()).issueSession(String(user._id));
    return (await auth()).toSessionUser(user);
  });

/** Google Sign-In — the client sends the Google ID token, we verify it with Google. */
export const signInWithGoogle = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ credential: z.string().min(10) }).parse(input))
  .handler(async ({ data }): Promise<SessionUser> => {
    const clientId = process.env["GOOGLE_CLIENT_ID"];
    if (!clientId) throw new Error("Google sign-in is not configured.");

    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(data.credential)}`,
    );
    if (!res.ok) throw new Error("Google sign-in failed. Please try again.");
    const payload = (await res.json()) as {
      aud?: string;
      email?: string;
      email_verified?: string | boolean;
      name?: string;
      picture?: string;
    };
    if (payload.aud !== clientId) throw new Error("Google sign-in failed (client mismatch).");
    if (!payload.email || String(payload.email_verified) !== "true") {
      throw new Error("Your Google email is not verified.");
    }

    const { getDb } = await mongo();
    const db = await getDb();
    const address = payload.email.toLowerCase();
    let user = await db.collection("users").findOne({ email: address });
    if (!user) {
      const doc = {
        name: payload.name || address.split("@")[0],
        email: address,
        phone: "",
        password_hash: await (await auth()).hashPassword(crypto.randomUUID()),
        avatar_color: randomColor(),
        avatar_url: payload.picture ?? "",
        is_admin: false,
        is_suspended: false,
        created_at: new Date(),
      };
      const inserted = await db.collection("users").insertOne(doc);
      user = { ...doc, _id: inserted.insertedId };
    } else if (payload.picture && !user["avatar_url"]) {
      await db
        .collection("users")
        .updateOne({ _id: user._id }, { $set: { avatar_url: payload.picture } });
    }
    if (user["is_suspended"] === true) throw new Error("This account has been suspended.");
    await (await auth()).issueSession(String(user._id));
    return (await auth()).toSessionUser(user);
  });

/** Phone OTP — step 1. The code is stored hashed with a 10-minute expiry. */
export const requestPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ phone }).parse(input))
  .handler(async ({ data }): Promise<{ sent: boolean; devCode?: string }> => {
    const { getDb } = await mongo();
    const db = await getDb();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await db.collection("phone_otps").updateOne(
      { phone: data.phone },
      {
        $set: {
          phone: data.phone,
          code_hash: await (await auth()).hashPassword(code),
          expires_at: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 0,
          created_at: new Date(),
        },
      },
      { upsert: true },
    );

    const sid = process.env["TWILIO_ACCOUNT_SID"];
    const token = process.env["TWILIO_AUTH_TOKEN"];
    const from = process.env["TWILIO_FROM_NUMBER"];
    if (sid && token && from) {
      const body = new URLSearchParams({
        To: `+91${data.phone}`,
        From: from,
        Body: `${code} is your MakinItHome verification code. It expires in 10 minutes.`,
      });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) throw new Error("Could not send the OTP. Please try again.");
      return { sent: true };
    }

    // No SMS provider configured — surface the code so the flow is still usable
    // to the site owner, and never silently pretend an SMS went out.
    return { sent: false, devCode: code };
  });

/** Phone OTP — step 2. Creates the account on first verified login. */
export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ phone, code: z.string().trim().length(6, "Enter the 6-digit code.") }).parse(input),
  )
  .handler(async ({ data }): Promise<SessionUser> => {
    const { getDb } = await mongo();
    const db = await getDb();
    const record = await db.collection("phone_otps").findOne({ phone: data.phone });
    if (!record) throw new Error("Request a new code first.");
    if (new Date(record["expires_at"] as Date).getTime() < Date.now()) {
      throw new Error("That code expired. Request a new one.");
    }
    if (Number(record["attempts"] ?? 0) > 5) throw new Error("Too many attempts. Start again.");
    const ok = await (await auth()).verifyPassword(data.code, String(record["code_hash"] ?? ""));
    if (!ok) {
      await db.collection("phone_otps").updateOne({ phone: data.phone }, { $inc: { attempts: 1 } });
      throw new Error("That code is not correct.");
    }
    await db.collection("phone_otps").deleteOne({ phone: data.phone });

    let user = await db.collection("users").findOne({ phone: data.phone });
    if (!user) {
      const doc = {
        name: `Guest ${data.phone.slice(-4)}`,
        email: `${data.phone}@phone.makinithome.in`,
        phone: data.phone,
        password_hash: await (await auth()).hashPassword(crypto.randomUUID()),
        avatar_color: randomColor(),
        is_admin: false,
        is_suspended: false,
        created_at: new Date(),
      };
      const inserted = await db.collection("users").insertOne(doc);
      user = { ...doc, _id: inserted.insertedId };
    }
    if (user["is_suspended"] === true) throw new Error("This account has been suspended.");
    await (await auth()).issueSession(String(user._id));
    return (await auth()).toSessionUser(user);
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  (await auth()).clearSession();
  return { ok: true };
});

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2),
        phone: z.string().trim().optional().or(z.literal("")),
        avatarUrl: z.string().trim().url().optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<SessionUser> => {
    const { db, user } = await (await auth()).requireUser();
    await db.collection("users").updateOne(
      { _id: await oid(String(user._id)) },
      {
        $set: {
          name: data.name,
          phone: data.phone ?? "",
          avatar_url: data.avatarUrl ?? "",
        },
      },
    );
    return (await auth()).toSessionUser({ ...user, name: data.name, phone: data.phone ?? "" });
  });

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ currentPassword: z.string().min(1), newPassword: password }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db, user } = await (await auth()).requireUser();
    const ok = await (
      await auth()
    ).verifyPassword(data.currentPassword, String(user["password_hash"] ?? ""));
    if (!ok) throw new Error("Your current password is not correct.");
    await db
      .collection("users")
      .updateOne(
        { _id: await oid(String(user._id)) },
        { $set: { password_hash: await (await auth()).hashPassword(data.newPassword) } },
      );
    return { ok: true };
  });
