import { desc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { handle, HttpError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";

const MAX = 4 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "image/avif"];

export const GET = handle(async () => {
  await requireAdmin();
  const db = await getDb();
  const rows = await db.select({ id: s.media.id, filename: s.media.filename, mime: s.media.mime, size: s.media.size, createdAt: s.media.createdAt }).from(s.media).orderBy(desc(s.media.id));
  return ok(rows.map((r) => ({ ...r, url: `/media/${r.id}` })));
});

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!files.length) throw new HttpError("No file uploaded", 422);
  const db = await getDb();
  const out = [];
  for (const f of files) {
    if (!TYPES.includes(f.type)) throw new HttpError(`Unsupported file type: ${f.type || "unknown"}`, 415);
    if (f.size > MAX) throw new HttpError(`${f.name} is larger than 4 MB`, 413);
    const [row] = await db
      .insert(s.media)
      .values({ filename: f.name.slice(0, 200), mime: f.type, size: f.size, data: Buffer.from(await f.arrayBuffer()) })
      .returning({ id: s.media.id, filename: s.media.filename, mime: s.media.mime, size: s.media.size, createdAt: s.media.createdAt });
    out.push({ ...row, url: `/media/${row.id}` });
  }
  return ok(out, { status: 201 });
});
