import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number.parseInt(id, 10);
  if (!Number.isInteger(n)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const m = await db.query.media.findFirst({ where: eq(s.media.id, n) });
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(m.data), {
    headers: {
      "content-type": m.mime,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      ...(m.mime === "image/svg+xml" ? { "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}),
    },
  });
}
