import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";
import { seed } from "./seed";

export type DB = LibSQLDatabase<typeof schema>;

const g = globalThis as unknown as { __zfDb?: DB; __zfReady?: Promise<void> };

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.VERCEL) return "file:/tmp/zoufeng.db";
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return "file:" + path.join(dir, "zoufeng.db");
}

function rawDb(): DB {
  if (!g.__zfDb) {
    const client = createClient({ url: databaseUrl(), authToken: process.env.DATABASE_AUTH_TOKEN });
    g.__zfDb = drizzle(client, { schema });
  }
  return g.__zfDb;
}

export async function getDb(): Promise<DB> {
  const db = rawDb();
  if (!g.__zfReady) {
    g.__zfReady = (async () => {
      await db.run("PRAGMA foreign_keys = ON");
      await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
      await seed(db);
    })().catch((e) => {
      g.__zfReady = undefined;
      throw e;
    });
  }
  await g.__zfReady;
  return db;
}

export { schema };
