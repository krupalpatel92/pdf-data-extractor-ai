import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Create postgres client
    client = postgres(process.env.DATABASE_URL, {
      prepare: false,
    });

    db = drizzle(client, { schema });
  }

  return db;
}

export * from "./schema";
