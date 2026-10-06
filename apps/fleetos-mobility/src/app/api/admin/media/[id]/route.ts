import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { handle, HttpError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const res = await db.delete(s.media).where(eq(s.media.id, Number(id))).returning({ id: s.media.id });
  if (!res.length) throw new HttpError("Not found", 404);
  return ok({ ok: true });
});
