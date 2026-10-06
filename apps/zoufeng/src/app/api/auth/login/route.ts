import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { handle, HttpError, parseBody } from "@/lib/api";
import { cookieOptions, CUSTOMER_COOKIE, signSession } from "@/lib/auth";

export const POST = handle(async (req: Request) => {
  const { email, password } = await parseBody(req, z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }));
  const db = await getDb();
  const user = await db.query.customers.findFirst({ where: eq(s.customers.email, email) });
  if (!user || !user.active || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError("Invalid email or password", 401);
  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(CUSTOMER_COOKIE, await signSession({ sub: String(user.id), role: "customer", name: user.name, email: user.email }), cookieOptions);
  return res;
});
