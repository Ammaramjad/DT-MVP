import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema as s } from "@/db";
import { ADMIN_COOKIE, verifySession } from "./auth";
import { HttpError } from "./api";

export async function getAdmin() {
  const c = await cookies();
  const session = await verifySession(c.get(ADMIN_COOKIE)?.value, "admin");
  if (!session) return null;
  const db = await getDb();
  const a = await db.query.admins.findFirst({ where: eq(s.admins.id, Number(session.sub)), columns: { name: true, email: true } });
  if (!a || a.email !== session.email) return null;
  return { ...session, name: a.name, email: a.email };
}

export async function requireAdmin() {
  const a = await getAdmin();
  if (!a) throw new HttpError("Unauthorized", 401);
  return a;
}
