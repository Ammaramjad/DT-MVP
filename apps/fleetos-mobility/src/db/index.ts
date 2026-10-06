import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";
import { seed } from "./seed";

export type DB = LibSQLDatabase<typeof schema>;

const g = globalThis as unknown as { __foDb?: DB; __foReady?: Promise<void> };

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.VERCEL) return "file:/tmp/fleetos.db";
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return "file:" + path.join(dir, "fleetos.db");
}

function rawDb(): DB {
  if (!g.__foDb) {
    const client = createClient({ url: databaseUrl(), authToken: process.env.DATABASE_AUTH_TOKEN });
    g.__foDb = drizzle(client, { schema });
  }
  return g.__foDb;
}

export async function getDb(): Promise<DB> {
  const db = rawDb();
  if (!g.__foReady) {
    g.__foReady = (async () => {
      await db.run("PRAGMA foreign_keys = ON");
      await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
      await seed(db);
    })().catch((e) => {
      g.__foReady = undefined;
      throw e;
    });
  }
  await g.__foReady;
  return db;
}

export { schema };
