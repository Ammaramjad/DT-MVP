import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { handle, HttpError, parseBody } from "@/lib/api";
import { cookieOptions, CUSTOMER_COOKIE, signSession } from "@/lib/auth";

export const POST = handle(async (req: Request) => {
  const b = await parseBody(
    req,
    z.object({
      name: z.string().trim().min(1).max(80),
      email: z.string().trim().toLowerCase().email().max(120),
      phone: z.string().trim().max(30).optional().default(""),
      password: z.string().min(8, "Password must be at least 8 characters").max(100),
    }),
  );
  const db = await getDb();
  const existing = await db.query.customers.findFirst({ where: eq(s.customers.email, b.email) });
  const hash = await bcrypt.hash(b.password, 10);
  let id: number;
  if (existing) {
    if (existing.passwordHash) throw new HttpError("This email is already registered", 409);
    await db.update(s.customers).set({ name: b.name, phone: b.phone || existing.phone, passwordHash: hash }).where(eq(s.customers.id, existing.id));
    id = existing.id;
  } else {
    const [row] = await db.insert(s.customers).values({ name: b.name, email: b.email, phone: b.phone, passwordHash: hash }).returning({ id: s.customers.id });
    id = row.id;
  }
  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(CUSTOMER_COOKIE, await signSession({ sub: String(id), role: "customer", name: b.name, email: b.email }), cookieOptions);
  return res;
});
