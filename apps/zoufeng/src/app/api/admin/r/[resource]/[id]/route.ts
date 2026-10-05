import { handle, HttpError, ok } from "@/lib/api";
import { isResource } from "@/lib/admin-resources";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteRow, updateRow } from "@/lib/admin-crud";

type Ctx = { params: Promise<{ resource: string; id: string }> };

async function parse(ctx: Ctx) {
  const { resource, id } = await ctx.params;
  if (!isResource(resource)) throw new HttpError("Unknown resource", 404);
  const n = Number(id);
  if (!Number.isInteger(n)) throw new HttpError("Invalid id", 400);
  return { k: resource, id: n };
}

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { k, id } = await parse(ctx);
  return ok(await updateRow(k, id, await req.json()));
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const me = await requireAdmin();
  const { k, id } = await parse(ctx);
  await deleteRow(k, id, me.sub);
  return ok({ ok: true });
});
