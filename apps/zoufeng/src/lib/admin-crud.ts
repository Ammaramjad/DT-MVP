import bcrypt from "bcryptjs";
import { isSafeHref } from "./safe-url";
import { and, asc, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { getDb } from "@/db";
import { HttpError } from "./api";
import { RESOURCES, type ResourceKey } from "./admin-resources";
import { TABLES } from "./admin-tables";

type Row = Record<string, unknown>;

function col(table: SQLiteTable, name: string): SQLiteColumn {
  const c = (table as unknown as Record<string, SQLiteColumn>)[name];
  if (!c) throw new HttpError(`Unknown field ${name}`, 400);
  return c;
}

export async function listRows(key: ResourceKey, opts: { q?: string; page?: number; pageSize?: number; filters?: Record<string, string> }) {
  const r = RESOURCES[key];
  const table = TABLES[key] as unknown as SQLiteTable;
  const db = await getDb();
  const conds: SQL[] = [];
  if (opts.q) {
    const term = `%${opts.q}%`;
    const ors = r.search.map((f) => like(col(table, f), term));
    if (ors.length) conds.push(or(...ors)!);
  }
  for (const [k, v] of Object.entries(opts.filters ?? {})) {
    const f = r.fields.find((x) => x.name === k);
    if (!f || v === "") continue;
    conds.push(eq(col(table, k), f.type === "bool" ? v === "true" : f.type === "relation" || f.type === "number" ? Number(v) : v));
  }
  const where = conds.length ? and(...conds) : undefined;
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
  const page = Math.max(1, opts.page ?? 1);
  const order = r.sort.dir === "asc" ? asc(col(table, r.sort.field)) : desc(col(table, r.sort.field));
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(table).where(where).orderBy(order, asc(col(table, "id"))).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ n: count() }).from(table).where(where),
  ]);
  return { rows: (rows as Row[]).map(strip), total: n, page, pageSize };
}

function strip(row: Row): Row {
  const { passwordHash, ...rest } = row;
  return passwordHash === undefined ? rest : { ...rest, hasPassword: Boolean(passwordHash) };
}

async function coerce(key: ResourceKey, body: Row, creating: boolean): Promise<Row> {
  const r = RESOURCES[key];
  const out: Row = {};
  for (const f of r.fields) {
    const has = Object.prototype.hasOwnProperty.call(body, f.name);
    let v = has ? body[f.name] : creating ? f.default : undefined;
    if (f.type === "password") {
      if (typeof v === "string" && v.length > 0) {
        if (v.length < 8) throw new HttpError("Password must be at least 8 characters", 422);
        out.passwordHash = await bcrypt.hash(v, 10);
      } else if (creating && key === "admins") throw new HttpError("Password is required", 422);
      continue;
    }
    if (v === undefined) {
      if (creating && f.required) throw new HttpError(`${f.label} is required`, 422);
      if (creating && ["text", "textarea", "image", "icon", "color", "date", "email", "select"].includes(f.type)) out[f.name] = "";
      continue;
    }
    switch (f.type) {
      case "number":
        v = v === "" || v === null ? 0 : Math.round(Number(v));
        if (!Number.isFinite(v)) throw new HttpError(`${f.label} must be a number`, 422);
        break;
      case "float":
        v = v === "" || v === null ? 0 : Number(v);
        if (!Number.isFinite(v)) throw new HttpError(`${f.label} must be a number`, 422);
        break;
      case "bool":
        v = v === true || v === "true" || v === 1 || v === "1" || v === "on";
        break;
      case "relation":
        v = v === "" || v === null ? null : Number(v);
        if (f.required && v === null) throw new HttpError(`${f.label} is required`, 422);
        break;
      case "select":
        v = String(v ?? "");
        if (f.options && !f.options.some((o) => o.value === v)) throw new HttpError(`${f.label} has an invalid value`, 422);
        break;
      default:
        v = String(v ?? "").trim();
        if (f.name === "email") v = (v as string).toLowerCase();
        if (f.name === "code" && key === "promotions") v = (v as string).toUpperCase();
        if (f.required && !v) throw new HttpError(`${f.label} is required`, 422);
        if ((f.name === "href" || f.type === "image") && v && !isSafeHref(v as string)) throw new HttpError(`${f.label} must be a site path (/...) or an http(s) URL`, 422);
    }
    out[f.name] = v;
  }
  return out;
}

export async function createRow(key: ResourceKey, body: Row) {
  if (RESOURCES[key].noCreate) throw new HttpError("Not allowed", 405);
  const table = TABLES[key] as unknown as SQLiteTable;
  const db = await getDb();
  const values = await coerce(key, body, true);
  const [row] = await db.insert(table).values(values).returning();
  return strip(row as Row);
}

export async function updateRow(key: ResourceKey, id: number, body: Row) {
  const table = TABLES[key] as unknown as SQLiteTable;
  const db = await getDb();
  const values = await coerce(key, body, false);
  if (!Object.keys(values).length) throw new HttpError("Nothing to update", 422);
  const [row] = await db.update(table).set(values).where(eq(col(table, "id"), id)).returning();
  if (!row) throw new HttpError("Not found", 404);
  return strip(row as Row);
}

export async function deleteRow(key: ResourceKey, id: number, currentAdminId?: string) {
  const table = TABLES[key] as unknown as SQLiteTable;
  const db = await getDb();
  if (key === "admins") {
    if (String(id) === currentAdminId) throw new HttpError("You cannot delete your own account", 409);
    const [{ n }] = await db.select({ n: count() }).from(table);
    if (n <= 1) throw new HttpError("At least one admin is required", 409);
  }
  const res = await db.delete(table).where(eq(col(table, "id"), id)).returning();
  if (!res.length) throw new HttpError("Not found", 404);
}

export async function relationOptions(key: ResourceKey) {
  const r = RESOURCES[key];
  const table = TABLES[key] as unknown as SQLiteTable;
  const db = await getDb();
  const rows = (await db.select().from(table)) as Row[];
  return rows.map((x) => ({ value: String(x.id), label: String(x[r.labelField] ?? x.id) }));
}
