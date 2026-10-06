import { handle, HttpError, ok } from "@/lib/api";
import { isResource } from "@/lib/admin-resources";
import { requireAdmin } from "@/lib/admin-auth";
import { createRow, listRows } from "@/lib/admin-crud";

type Ctx = { params: Promise<{ resource: string }> };

async function key(ctx: Ctx) {
  const { resource } = await ctx.params;
  if (!isResource(resource)) throw new HttpError("Unknown resource", 404);
  return resource;
}

export const GET = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const k = await key(ctx);
  const u = new URL(req.url);
  const filters: Record<string, string> = {};
  u.searchParams.forEach((v, name) => {
    if (name.startsWith("f_")) filters[name.slice(2)] = v;
  });
  return ok(await listRows(k, { q: u.searchParams.get("q") ?? "", page: Number(u.searchParams.get("page")) || 1, pageSize: Number(u.searchParams.get("pageSize")) || 50, filters }));
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const k = await key(ctx);
  return ok(await createRow(k, await req.json()), { status: 201 });
});
