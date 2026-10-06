import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "zf_admin";
export const CUSTOMER_COOKIE = "zf_customer";

export interface SessionPayload {
  sub: string;
  role: "admin" | "customer";
  name: string;
  email: string;
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET environment variable is required in production");
  return new TextEncoder().encode(s || "zoufeng-dev-secret");
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ role: p.role, name: p.name, email: p.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string | undefined, role: SessionPayload["role"]): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== role || !payload.sub) return null;
    return { sub: payload.sub, role, name: String(payload.name ?? ""), email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};
