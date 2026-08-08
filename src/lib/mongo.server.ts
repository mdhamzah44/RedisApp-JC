/**
 * MongoDB connection shared with the Seller Hub app.
 *
 * Server-only: never import this from a component. Reads MONGODB_URI /
 * MONGODB_DB at call time (env is injected per request).
 */
import { MongoClient, type Db } from "mongodb";

let clientPromise: Promise<MongoClient> | undefined;

export function isMongoConfigured(): boolean {
  return Boolean(process.env["MONGODB_URI"]);
}

export async function getDb(): Promise<Db> {
  const uri = process.env["MONGODB_URI"];
  if (!uri) throw new Error("MONGODB_URI is not configured");
  const dbName = process.env["MONGODB_DB"] ?? "areebadesignco";

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    }).connect();
  }

  try {
    const client = await clientPromise;
    return client.db(dbName);
  } catch (error) {
    clientPromise = undefined;
    throw error;
  }
}
