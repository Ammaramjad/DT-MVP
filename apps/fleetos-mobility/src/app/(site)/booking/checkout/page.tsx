import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock, Luggage, MapPin, UsersRound } from "lucide-react";
import { CheckoutForm } from "@/components/site/booking/CheckoutForm";
import { getCustomer, getLang, getSettings } from "@/lib/data";
import { duration, formatDateTime, money } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { Icon } from "@/lib/icons";
import { buildTrip, type SearchParams } from "@/lib/quote";

export const metadata = { title: "確認預訂" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [lang, settings, customer] = await Promise.all([getLang(), getSettings(), getCustomer()]);
  const ctx = sp.pickup ? await buildTrip(sp) : null;
  const sel = ctx?.vehicles.find((v) => String(v.vehicle.id) === sp.vehicle);
  if (!ctx || !sel) redirect("/booking");
  const back = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "vehicle" && v) as [string, string][]).toString();
  const cur = settings.pricing.currency;
  const v = sel.vehicle;

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Link href={`/booking?${back}`} className="flex items-center gap-1 text-[13px] font-semibold text-brand">
        <ArrowLeft size={14} /> {t("editSearch", lang)}
      </Link>
      <h1 className="text-[28px] font-black">{t("confirmBooking", lang)}</h1>
      <section className="glass-strong flex flex-col gap-5 rounded-[28px] p-5 md:flex-row md:items-center">
        <div className="relative grid h-[110px] place-items-center rounded-2xl bg-gradient-to-b from-white to-[#e7edf7] md:w-[200px]">
          <img src={v.image} alt="" className="max-h-[92px] object-contain" />
        </div>
        <div className="grid flex-1 gap-2 text-[13.5px] sm:grid-cols-2">
          <div className="flex items-center gap-2 font-black sm:col-span-2">
            <span className="skeuo-icon h-8 w-8" style={{ ["--c" as string]: ctx.category.color }}>
              <Icon name={ctx.category.icon} size={14} />
            </span>
            {pick(ctx.category, "name", lang)}
            {ctx.subcategory && <span className="text-muted">· {pick(ctx.subcategory, "name", lang)}</span>}
            <span className="text-muted">· {pick(v, "name", lang)}</span>
          </div>
          <span className="flex gap-2"><MapPin size={15} className="text-emerald-500" />{ctx.trip.pickup}</span>
          {ctx.trip.dropoff && <span className="flex gap-2"><MapPin size={15} className="text-hot" />{ctx.trip.dropoff}</span>}
          <span className="flex gap-2"><Clock size={15} className="text-brand" />{formatDateTime(ctx.trip.pickupAt, lang)}</span>
          <span className="flex gap-2">
            <UsersRound size={15} className="text-brand" />
            {ctx.trip.passengers} {t("passengers", lang)} <Luggage size={15} className="ml-2 text-brand" /> {ctx.trip.luggage} {t("luggage", lang)}
          </span>
          {ctx.category.pricingMode === "distance" && (
            <span className="text-muted sm:col-span-2">
              {t("estimated", lang)} {Math.round(ctx.estimate.distanceKm)} {t("km", lang)} · {duration(ctx.estimate.durationMin, lang)}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-[12px] text-muted">{t("subtotal", lang)}</div>
          <div className="text-[26px] font-black text-brand">{money(sel.quote.subtotal, cur)}</div>
        </div>
      </section>
      <CheckoutForm
        lang={lang}
        currency={cur}
        subtotal={sel.quote.subtotal}
        needFlight={ctx.category.slug === "airport"}
        defaults={{ name: customer?.name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "" }}
        trip={{
          category: ctx.category.slug,
          sub: ctx.subcategory?.slug ?? "",
          vehicle: String(v.id),
          pickup: ctx.trip.pickup,
          dropoff: ctx.trip.dropoff,
          at: ctx.trip.pickupAt,
          pax: String(ctx.trip.passengers),
          bags: String(ctx.trip.luggage),
          hours: String(ctx.trip.hours),
          days: String(ctx.trip.days),
        }}
      />
    </div>
  );
}
