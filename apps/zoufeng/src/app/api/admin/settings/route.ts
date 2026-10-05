import { getDb, schema as s } from "@/db";
import { handle, HttpError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/data";
import { mergeSettings } from "@/lib/settings-shape";

export const GET = handle(async () => {
  await requireAdmin();
  return ok(await getSettings());
});

export const PUT = handle(async (req: Request) => {
  await requireAdmin();
  const body = await req.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError("Invalid settings", 422);
  const merged = mergeSettings(body);
  const db = await getDb();
  await db.insert(s.settings).values({ key: "site", value: JSON.stringify(merged) }).onConflictDoUpdate({ target: s.settings.key, set: { value: JSON.stringify(merged) } });
  return ok(merged);
});
