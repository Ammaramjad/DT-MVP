import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "./auth";
import { HttpError } from "./api";

export async function getAdmin() {
  const c = await cookies();
  return verifySession(c.get(ADMIN_COOKIE)?.value, "admin");
}

export async function requireAdmin() {
  const a = await getAdmin();
  if (!a) throw new HttpError("Unauthorized", 401);
  return a;
}
