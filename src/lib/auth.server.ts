/**
 * Session + password helpers shared by every authenticated server function.
 *
 * Passwords are stored in the same `users.password_hash` column the Flask
 * Seller Hub writes, using the Werkzeug string format
 * `pbkdf2:sha256:<iterations>$<salt>$<hex>` so both apps can verify each other.
 */
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import type { Db, Document, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getDb } from "./mongo.server";

const COOKIE = "mih_session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days
const PBKDF2_ITERATIONS = 600_000;

const enc = new TextEncoder();

function secret(): string {
  return process.env["SESSION_SECRET"] || process.env["MONGODB_URI"] || "makinithome-dev-secret";
}

const toB64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromB64 = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const hex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmac(payload: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(payload));
  return toB64(new Uint8Array(sig));
}

async function pbkdf2(password: string, salt: string, iterations: number): Promise<string> {
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-256" },
    baseKey,
    256,
  );
  return hex(new Uint8Array(bits));
}

/** Werkzeug-compatible hash so the Seller Hub can read the same user rows. */
export async function hashPassword(password: string): Promise<string> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(8)));
  const digest = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2:sha256:${PBKDF2_ITERATIONS}$${salt}$${digest}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  const [method, salt, digest] = stored.split("$");
  if (!method || !salt || !digest) return false;
  const parts = method.split(":");
  if (parts[0] !== "pbkdf2" || parts[1] !== "sha256") return false;
  const iterations = Number(parts[2] || PBKDF2_ITERATIONS);
  const computed = await pbkdf2(password, salt, iterations);
  return computed === digest;
}

export async function issueSession(userId: string): Promise<void> {
  const payload = toB64(enc.encode(JSON.stringify({ u: userId, e: Date.now() + MAX_AGE * 1000 })));
  const token = `${payload}.${await hmac(payload)}`;
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSession(): void {
  deleteCookie(COOKIE, { path: "/" });
}

export async function currentUserId(): Promise<string | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if ((await hmac(payload)) !== sig) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64(payload))) as {
      u: string;
      e: number;
    };
    if (!data.u || data.e < Date.now()) return null;
    return data.u;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  createdAt: string;
};

export function toSessionUser(doc: WithId<Document>): SessionUser {
  return {
    id: String(doc._id),
    name: (doc["name"] as string) || "Guest",
    email: (doc["email"] as string) || "",
    phone: (doc["phone"] as string) || "",
    avatarUrl: (doc["avatar_url"] as string) || "",
    createdAt: new Date((doc["created_at"] as Date | undefined) ?? Date.now()).toISOString(),
  };
}

/** Returns the signed-in user document, or null. */
export async function getSessionUser(): Promise<{ db: Db; user: WithId<Document> } | null> {
  const id = await currentUserId();
  if (!id || !ObjectId.isValid(id)) return null;
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
  if (!user || user["is_suspended"] === true) return null;
  return { db, user };
}

/** Same as getSessionUser but throws — use inside protected server functions. */
export async function requireUser(): Promise<{ db: Db; user: WithId<Document> }> {
  const session = await getSessionUser();
  if (!session) throw new Error("Please sign in to continue.");
  return session;
}
