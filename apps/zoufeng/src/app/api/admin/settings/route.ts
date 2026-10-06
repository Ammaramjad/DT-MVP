import { getDb, schema as s } from "@/db";
import { handle, HttpError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/data";
import { mergeSettings } from "@/lib/settings-shape";
import { isSafeHref } from "@/lib/safe-url";

function checkLinks(o: unknown, path = "") {
  if (!o || typeof o !== "object") return;
  for (const [k, v] of Object.entries(o)) {
    const p = path ? `${path}.${k}` : k;
    if (typeof v === "string") {
      if (/href|url|link|image|logo/i.test(k) && v && !isSafeHref(v)) throw new HttpError(`${p} must be a site path (/...) or an http(s) URL`, 422);
    } else checkLinks(v, p);
  }
}

export const GET = handle(async () => {
  await requireAdmin();
  return ok(await getSettings());
});

export const PUT = handle(async (req: Request) => {
  await requireAdmin();
  const body = await req.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError("Invalid settings", 422);
  checkLinks(body);
  const merged = mergeSettings(body);
  const db = await getDb();
  await db.insert(s.settings).values({ key: "site", value: JSON.stringify(merged) }).onConflictDoUpdate({ target: s.settings.key, set: { value: JSON.stringify(merged) } });
  return ok(merged);
});
