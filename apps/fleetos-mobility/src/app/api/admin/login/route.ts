import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { handle, HttpError, parseBody } from "@/lib/api";
import { ADMIN_COOKIE, cookieOptions, signSession } from "@/lib/auth";

export const POST = handle(async (req: Request) => {
  const { email, password } = await parseBody(req, z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }));
  const db = await getDb();
  const a = await db.query.admins.findFirst({ where: eq(s.admins.email, email) });
  if (!a || !(await bcrypt.compare(password, a.passwordHash))) throw new HttpError("Invalid email or password", 401);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await signSession({ sub: String(a.id), role: "admin", name: a.name, email: a.email }), cookieOptions);
  return res;
});
