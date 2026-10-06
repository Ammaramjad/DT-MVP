import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { applyPromo, findPromo } from "@/lib/quote";

export const POST = handle(async (req: Request) => {
  const { code, subtotal } = await parseBody(req, z.object({ code: z.string().trim().min(1).max(30), subtotal: z.coerce.number().min(0) }));
  const promo = await findPromo(code);
  if (!promo) return ok({ valid: false, reason: "invalid" });
  const discount = applyPromo(subtotal, promo);
  if (!discount) return ok({ valid: false, reason: "min", minAmount: promo.minAmount });
  return ok({ valid: true, code: promo.code, discount, titleZh: promo.titleZh, titleEn: promo.titleEn });
});
