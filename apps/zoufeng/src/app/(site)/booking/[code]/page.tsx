import Link from "next/link";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { CheckCircle2, Clock, Luggage, MapPin, Phone, Plane, UserRound, UsersRound } from "lucide-react";
import { getDb, schema as s } from "@/db";
import { BookingActions } from "@/components/site/booking/BookingActions";
import { findAccessibleBooking } from "@/lib/booking-access";
import { getLang, getSettings } from "@/lib/data";
import { formatDateTime, money } from "@/lib/format";
import { pick, statusLabels, t } from "@/lib/i18n";

export const metadata = { title: "預訂詳情" };

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ phone?: string; new?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  const [lang, settings] = await Promise.all([getLang(), getSettings()]);
  const b = await findAccessibleBooking(code, sp.phone);
  if (!b) {
    return (
      <div className="mx-auto max-w-md pt-10 text-center">
        <div className="neu p-8">
          <h1 className="text-[22px] font-black">{lang === "zh" ? "找不到預訂" : "Booking not found"}</h1>
          <p className="mt-2 text-[13px] text-muted">{lang === "zh" ? "請確認預訂代碼與手機號碼" : "Please check your booking code and phone number"}</p>
          <Link href="/track" className="skeuo-btn mt-5 inline-block px-6 py-2.5 text-[14px]">
            {t("trackBooking", lang)}
          </Link>
        </div>
      </div>
    );
  }
  const db = await getDb();
  const [cat, sub, veh, drv] = await Promise.all([
    b.categoryId ? db.query.categories.findFirst({ where: eq(s.categories.id, b.categoryId) }) : null,
    b.subcategoryId ? db.query.subcategories.findFirst({ where: eq(s.subcategories.id, b.subcategoryId) }) : null,
    b.vehicleId ? db.query.vehicles.findFirst({ where: eq(s.vehicles.id, b.vehicleId) }) : null,
    b.driverId ? db.query.drivers.findFirst({ where: eq(s.drivers.id, b.driverId) }) : null,
  ]);
  const st = statusLabels[b.status] ?? statusLabels.pending;
  const cur = settings.pricing.currency;
  const qr = await QRCode.toDataURL(b.code, { margin: 1, width: 160 });
  const steps = ["pending", "confirmed", "assigned", "in_progress", "completed"];
  const idx = steps.indexOf(b.status);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pt-2">
      {sp.new && (
        <div className="glass-strong fade-up flex items-center gap-4 rounded-[26px] p-5">
          <span className="skeuo-icon h-14 w-14 shrink-0" style={{ ["--c" as string]: "#10b981" }}>
            <CheckCircle2 size={26} />
          </span>
          <div>
            <h1 className="text-[22px] font-black">{t("thankYou", lang)}</h1>
            <p className="text-[13px] text-muted">{t("thankYouSub", lang)}</p>
          </div>
        </div>
      )}

      <div className="ticket paper rounded-[28px]">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="text-[12px] text-muted">{t("bookingCode", lang)}</div>
            <div className="font-mono text-[28px] font-black tracking-wider text-ink">{b.code}</div>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold text-white" style={{ background: st.color }}>
              {st[lang]}
            </span>
          </div>
          <img src={qr} alt="QR" className="h-[110px] w-[110px] rounded-xl border border-[#e3e8f1] bg-white p-1" />
        </div>
        {b.status !== "cancelled" && (
          <div className="px-6 pb-5">
            <div className="flex items-center">
              {steps.map((stp, i) => (
                <div key={stp} className="flex flex-1 items-center last:flex-none">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${i <= idx ? "skeuo-icon" : "neu-inset !rounded-full text-muted"}`} style={{ ["--c" as string]: "#2f6bff" }} title={statusLabels[stp][lang]}>
                    {i + 1}
                  </span>
                  {i < steps.length - 1 && <span className={`mx-1 h-1 flex-1 rounded-full ${i < idx ? "bg-gradient-to-r from-cyan to-brand" : "bg-[#dfe5ef]"}`} />}
                </div>
              ))}
            </div>
            <div className="mt-1 hidden justify-between text-[10.5px] text-muted sm:flex">
              {steps.map((stp) => (
                <span key={stp}>{statusLabels[stp][lang]}</span>
              ))}
            </div>
          </div>
        )}
        <div className="ticket-perf mx-6" />
        <div className="grid gap-4 p-6 text-[13.5px] sm:grid-cols-2">
          <div className="space-y-2.5">
            <div className="text-[12px] font-bold uppercase tracking-wide text-muted">{t("tripDetails", lang)}</div>
            <div className="font-bold">
              {cat ? pick(cat, "name", lang) : ""}
              {sub ? ` · ${pick(sub, "name", lang)}` : ""}
            </div>
            <div className="flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-emerald-500" />{b.pickup}</div>
            {b.dropoff && <div className="flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-hot" />{b.dropoff}</div>}
            <div className="flex gap-2"><Clock size={15} className="mt-0.5 shrink-0 text-brand" />{formatDateTime(b.pickupAt, lang)}</div>
            <div className="flex gap-2">
              <UsersRound size={15} className="mt-0.5 text-brand" />
              {b.passengers} {t("passengers", lang)}
              <Luggage size={15} className="ml-2 mt-0.5 text-brand" />
              {b.luggage} {t("luggage", lang)}
            </div>
            {b.flightNo && <div className="flex gap-2"><Plane size={15} className="mt-0.5 text-brand" />{b.flightNo}</div>}
          </div>
          <div className="space-y-2.5">
            <div className="text-[12px] font-bold uppercase tracking-wide text-muted">{t("vehicle", lang)}</div>
            {veh && (
              <div className="flex items-center gap-3">
                <img src={veh.image} alt="" className="h-12 w-20 object-contain" />
                <span className="font-bold">{pick(veh, "name", lang)}</span>
              </div>
            )}
            {drv && (
              <div className="neu-flat flex items-center gap-2 px-3 py-2">
                <UserRound size={15} />
                <span className="font-semibold">{drv.name}</span>
                <span className="text-muted">{drv.plateNumber}</span>
                <a href={`tel:${drv.phone}`} className="ml-auto text-brand"><Phone size={15} /></a>
              </div>
            )}
            <div className="text-[12px] font-bold uppercase tracking-wide text-muted">{t("contactInfo", lang)}</div>
            <div>{b.contactName} · {b.contactPhone}</div>
            {b.contactEmail && <div className="text-muted">{b.contactEmail}</div>}
          </div>
        </div>
        <div className="ticket-perf mx-6" />
        <dl className="space-y-1.5 p-6 text-[13.5px]">
          <div className="flex justify-between"><dt className="text-muted">{t("subtotal", lang)}</dt><dd>{money(b.subtotal, cur)}</dd></div>
          {b.discount > 0 && <div className="flex justify-between text-emerald-600"><dt>{t("discount", lang)} ({b.promoCode})</dt><dd>-{money(b.discount, cur)}</dd></div>}
          <div className="flex justify-between text-[20px] font-black"><dt>{t("total", lang)}</dt><dd className="text-brand">{money(b.total, cur)}</dd></div>
          <div className="flex justify-between text-[12px] text-muted">
            <dt>{t("payment", lang)}</dt>
            <dd>{t(b.paymentMethod as "cash" | "card" | "linepay", lang)} · {b.paymentStatus === "paid" ? (lang === "zh" ? "已付款" : "Paid") : lang === "zh" ? "未付款" : "Unpaid"}</dd>
          </div>
        </dl>
      </div>

      <BookingActions lang={lang} code={b.code} phone={sp.phone ?? ""} canCancel={["pending", "confirmed"].includes(b.status)} canReview={b.status === "completed" && !b.rating} />
    </div>
  );
}
