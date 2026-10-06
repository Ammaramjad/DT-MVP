"use client";

import { Banknote, CreditCard, Loader2, MessageCircle, TicketPercent } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import type { Lang } from "@/lib/i18n";

const L = {
  contact: { zh: "聯絡資訊", en: "Contact details" },
  name: { zh: "姓名", en: "Full name" },
  phone: { zh: "手機號碼", en: "Mobile number" },
  email: { zh: "電子郵件", en: "Email" },
  flight: { zh: "航班編號", en: "Flight number" },
  notes: { zh: "備註（兒童座椅、舉牌名稱等）", en: "Notes (child seat, name sign, etc.)" },
  promo: { zh: "優惠代碼", en: "Promo code" },
  apply: { zh: "套用", en: "Apply" },
  payment: { zh: "付款方式", en: "Payment method" },
  cash: { zh: "現金 / 上車付款", en: "Cash on board" },
  card: { zh: "信用卡", en: "Credit card" },
  linepay: { zh: "LINE Pay", en: "LINE Pay" },
  subtotal: { zh: "小計", en: "Subtotal" },
  discount: { zh: "折扣", en: "Discount" },
  total: { zh: "總計", en: "Total" },
  confirm: { zh: "確認預訂", en: "Confirm booking" },
  invalid: { zh: "優惠代碼無效或已過期", en: "Invalid or expired code" },
  min: { zh: "未達最低消費", en: "Minimum spend not reached" },
  cardNo: { zh: "卡號", en: "Card number" },
  exp: { zh: "有效期限", en: "Expiry" },
  demoPay: { zh: "示範環境：不會實際扣款", en: "Demo environment: no real charge" },
};

export function CheckoutForm({
  lang,
  trip,
  subtotal,
  currency,
  needFlight,
  defaults,
}: {
  lang: Lang;
  trip: Record<string, string>;
  subtotal: number;
  currency: string;
  needFlight: boolean;
  defaults: { name: string; phone: string; email: string };
}) {
  const tr = (k: keyof typeof L) => L[k][lang];
  const router = useRouter();
  const [form, setForm] = useState({ ...defaults, flightNo: "", notes: "", paymentMethod: "cash" as "cash" | "card" | "linepay" });
  const [promo, setPromo] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fmt = (n: number) => `${currency} ${Math.round(n).toLocaleString("en-US")}`;

  const applyPromo = async () => {
    setPromoMsg("");
    if (!promo.trim()) return;
    const r = await fetch("/api/promo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: promo, subtotal }) }).then((x) => x.json());
    if (r.valid) {
      setApplied({ code: r.code, discount: r.discount });
      setPromoMsg(lang === "zh" ? r.titleZh : r.titleEn);
    } else {
      setApplied(null);
      setPromoMsg(r.reason === "min" ? `${tr("min")} ${fmt(r.minAmount)}` : tr("invalid"));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...trip, ...form, promoCode: applied?.code ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      router.push(`/booking/${data.code}?phone=${encodeURIComponent(form.phone)}&new=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const total = subtotal - (applied?.discount ?? 0);
  const pays = [
    { id: "cash", icon: Banknote, label: tr("cash") },
    { id: "card", icon: CreditCard, label: tr("card") },
    { id: "linepay", icon: MessageCircle, label: tr("linepay") },
  ] as const;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-6">
        <section className="neu p-5 sm:p-6">
          <h2 className="mb-4 text-[17px] font-black">{tr("contact")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-[12.5px] font-medium">
              {tr("name")} *
              <input required value={form.name} onChange={set("name")} className="input mt-1" autoComplete="name" />
            </label>
            <label className="text-[12.5px] font-medium">
              {tr("phone")} *
              <input required minLength={6} value={form.phone} onChange={set("phone")} className="input mt-1" autoComplete="tel" placeholder="0912-345-678" />
            </label>
            <label className="text-[12.5px] font-medium">
              {tr("email")}
              <input type="email" value={form.email} onChange={set("email")} className="input mt-1" autoComplete="email" />
            </label>
            {needFlight && (
              <label className="text-[12.5px] font-medium">
                {tr("flight")}
                <input value={form.flightNo} onChange={set("flightNo")} className="input mt-1" placeholder="BR198" />
              </label>
            )}
            <label className="text-[12.5px] font-medium sm:col-span-2">
              {tr("notes")}
              <textarea rows={3} value={form.notes} onChange={set("notes")} className="input mt-1 resize-none" />
            </label>
          </div>
        </section>
        <section className="neu p-5 sm:p-6">
          <h2 className="mb-4 text-[17px] font-black">{tr("payment")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {pays.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setForm((f) => ({ ...f, paymentMethod: p.id }))}
                className={clsx("flex items-center gap-3 rounded-2xl p-4 text-left text-[13.5px] font-semibold transition", form.paymentMethod === p.id ? "skeuo-btn" : "neu-sm hover:text-brand")}
                aria-pressed={form.paymentMethod === p.id}
              >
                <p.icon size={20} />
                {p.label}
              </button>
            ))}
          </div>
          {form.paymentMethod === "card" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
              <input className="input" placeholder={`${tr("cardNo")} 4242 4242 4242 4242`} inputMode="numeric" />
              <input className="input" placeholder={`${tr("exp")} MM/YY`} />
              <p className="text-[11.5px] text-muted sm:col-span-2">{tr("demoPay")}</p>
            </div>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <div className="glass-strong rounded-[26px] p-5">
          <label className="text-[12.5px] font-medium">{tr("promo")}</label>
          <div className="mt-1 flex gap-2">
            <div className="neu-inset flex flex-1 items-center gap-2 px-3">
              <TicketPercent size={16} className="text-brand" />
              <input value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} className="field-input py-2.5 text-[13px] uppercase" placeholder="WELCOME10" />
            </div>
            <button type="button" onClick={applyPromo} className="skeuo-btn-light px-4 text-[13px]">
              {tr("apply")}
            </button>
          </div>
          {promoMsg && <p className={clsx("mt-2 text-[12px] font-medium", applied ? "text-emerald-600" : "text-hot")}>{promoMsg}</p>}
          <dl className="mt-5 space-y-2 text-[13.5px]">
            <div className="flex justify-between">
              <dt className="text-muted">{tr("subtotal")}</dt>
              <dd>{fmt(subtotal)}</dd>
            </div>
            {applied && (
              <div className="flex justify-between text-emerald-600">
                <dt>
                  {tr("discount")} ({applied.code})
                </dt>
                <dd>-{fmt(applied.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-dashed border-[#c9d2e3] pt-3 text-[18px] font-black">
              <dt>{tr("total")}</dt>
              <dd className="text-brand">{fmt(total)}</dd>
            </div>
          </dl>
          {err && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] font-medium text-hot">{err}</p>}
          <button disabled={busy} className="skeuo-btn mt-5 flex w-full items-center justify-center gap-2 py-3.5 text-[15px]">
            {busy && <Loader2 size={16} className="animate-spin" />}
            {tr("confirm")}
          </button>
        </div>
      </aside>
    </form>
  );
}
