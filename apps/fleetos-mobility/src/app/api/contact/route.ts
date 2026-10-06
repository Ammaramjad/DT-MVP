import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { handle, ok, parseBody } from "@/lib/api";

export const POST = handle(async (req: Request) => {
  const b = await parseBody(
    req,
    z.object({
      name: z.string().trim().min(1).max(80),
      email: z.string().trim().email().max(120),
      phone: z.string().trim().max(30).optional().default(""),
      subject: z.string().trim().max(120).optional().default(""),
      body: z.string().trim().min(2).max(3000),
    }),
  );
  const db = await getDb();
  await db.insert(s.messages).values(b);
  return ok({ ok: true }, { status: 201 });
});
