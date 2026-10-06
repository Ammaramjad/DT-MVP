import Link from "next/link";
import { AlertCircle, Clock, Luggage, MapPin, Moon, Route as RouteIcon, UsersRound } from "lucide-react";
import { BookingWidget } from "@/components/site/BookingWidget";
import { getCategories, getLang, getRoutes, getSettings } from "@/lib/data";
import { duration, formatDateTime, money } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { Icon } from "@/lib/icons";
import { isNight } from "@/lib/pricing";
import { buildTrip, type SearchParams } from "@/lib/quote";
import { widgetCategories, widgetRoutes } from "@/lib/view";

export const metadata = { title: "預訂行程" };

export default async function BookingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [lang, settings, cats, routes] = await Promise.all([getLang(), getSettings(), getCategories(), getRoutes()]);
  const ctx = sp.pickup ? await buildTrip(sp) : null;
  const cur = settings.pricing.currency;
  const qs = (extra: Record<string, string>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v) q.set(k, String(v));
    return q.toString();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="pt-2">
        <h1 className="mb-3 text-[28px] font-black">{t("searchVehicles", lang)}</h1>
        <BookingWidget
          compact
          lang={lang}
          categories={widgetCategories(cats, lang)}
          routes={widgetRoutes(routes, cats, lang)}
          initial={{ category: sp.category, pickup: sp.pickup, dropoff: sp.dropoff, at: sp.at, pax: Number(sp.pax) || undefined, bags: sp.bags ? Number(sp.bags) : undefined, hours: Number(sp.hours) || undefined, days: Number(sp.days) || undefined }}
        />
      </div>

      {!ctx ? (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {cats.map((c) => (
            <Link key={c.id} href={`/services/${c.slug}`} className="neu neu-press flex items-center gap-3 p-4">
              <span className="skeuo-icon h-11 w-11" style={{ ["--c" as string]: c.color }}>
                <Icon name={c.icon} size={18} />
              </span>
              <span>
                <span className="block font-bold">{pick(c, "name", lang)}</span>
                <span className="block text-[12px] text-muted">{pick(c, "subtitle", lang)}</span>
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <div className="neu p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="skeuo-icon h-9 w-9" style={{ ["--c" as string]: ctx.category.color }}>
                  <Icon name={ctx.category.icon} size={16} />
                </span>
                <span className="font-black">{pick(ctx.category, "name", lang)}</span>
              </div>
              <ul className="space-y-2.5 text-[13px]">
                <li className="flex gap-2">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                  {ctx.trip.pickup}
                </li>
                {ctx.trip.dropoff && (
                  <li className="flex gap-2">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-hot" />
                    {ctx.trip.dropoff}
                  </li>
                )}
                <li className="flex gap-2">
                  <Clock size={15} className="mt-0.5 shrink-0 text-brand" />
                  {formatDateTime(ctx.trip.pickupAt, lang)}
                </li>
                <li className="flex gap-2">
                  <UsersRound size={15} className="mt-0.5 shrink-0 text-brand" />
                  {ctx.trip.passengers} {t("passengers", lang)} · {ctx.trip.luggage} {t("luggage", lang)}
                </li>
                {ctx.category.pricingMode === "distance" && (
                  <li className="flex gap-2">
                    <RouteIcon size={15} className="mt-0.5 shrink-0 text-brand" />
                    {t("estimated", lang)} {Math.round(ctx.estimate.distanceKm)} {t("km", lang)} · {duration(ctx.estimate.durationMin, lang)}
                  </li>
                )}
                {ctx.category.pricingMode === "hourly" && <li className="flex gap-2"><Clock size={15} className="mt-0.5 shrink-0 text-brand" />{ctx.trip.hours} {t("hourUnit", lang)}</li>}
                {ctx.category.pricingMode === "daily" && <li className="flex gap-2"><Clock size={15} className="mt-0.5 shrink-0 text-brand" />{ctx.trip.days} {t("dayUnit", lang)}</li>}
                {ctx.category.pricingMode !== "daily" && isNight(ctx.trip.pickupAt, settings.pricing) && (
                  <li className="flex gap-2 text-amber-600">
                    <Moon size={15} className="mt-0.5 shrink-0" />
                    {t("nightSurcharge", lang)} +{settings.pricing.nightSurchargePercent}%
                  </li>
                )}
              </ul>
            </div>
            {ctx.subcategories.length > 0 && (
              <div className="neu p-5">
                <div className="mb-3 text-[14px] font-bold">{t("chooseOption", lang)}</div>
                <div className="flex flex-col gap-2">
                  {[null, ...ctx.subcategories].map((sc) => {
                    const on = sc ? ctx.subcategory?.id === sc.id : !ctx.subcategory;
                    return (
                      <Link
                        key={sc?.id ?? 0}
                        href={`/booking?${qs({ sub: sc?.slug ?? "" })}`}
                        scroll={false}
                        className={on ? "skeuo-btn px-3 py-2 text-[13px]" : "neu-sm px-3 py-2 text-[13px] hover:text-brand"}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span>{sc ? pick(sc, "name", lang) : lang === "zh" ? "標準" : "Standard"}</span>
                          {sc && sc.priceMultiplier !== 1 && <span className="text-[11px] opacity-80">×{sc.priceMultiplier}</span>}
                        </span>
                        {sc && <span className={`block text-[11px] ${on ? "opacity-85" : "text-muted"}`}>{pick(sc, "description", lang)}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          <section className="flex flex-col gap-4">
            <div className="text-[13px] text-muted">
              {ctx.vehicles.filter((v) => v.fits).length} {t("results", lang)}
            </div>
            {ctx.vehicles.map(({ vehicle: v, quote, fits }) => (
              <div key={v.id} className={`neu flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${fits ? "" : "opacity-55"}`}>
                <div className="relative grid h-[120px] place-items-center rounded-2xl bg-gradient-to-b from-white to-[#e7edf7] sm:w-[220px]">
                  <div className="absolute bottom-3 h-3 w-2/3 rounded-[50%] bg-[#1b2440]/15 blur-md" />
                  <img src={v.image} alt="" className="relative max-h-[100px] object-contain" />
                </div>
                <div className="flex-1">
                  <div className="text-[17px] font-black">{pick(v, "name", lang)}</div>
                  <div className="text-[12px] text-muted">{v.model}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[12.5px] text-[#3b4669]">
                    <span className="flex items-center gap-1"><UsersRound size={14} /> {v.minPassengers}-{v.maxPassengers} {t("people", lang)}</span>
                    <span className="flex items-center gap-1"><Luggage size={14} /> {v.luggage} {t("luggage", lang)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pick(v, "features", lang).split(/[,，]/).filter(Boolean).slice(0, 4).map((f) => (
                      <span key={f} className="neu-inset !rounded-full px-2.5 py-0.5 text-[11px]">{f.trim()}</span>
                    ))}
                  </div>
                  {!fits && (
                    <div className="mt-2 flex items-center gap-1 text-[12px] font-medium text-hot">
                      <AlertCircle size={13} /> {lang === "zh" ? "乘客或行李超過車輛容量" : "Exceeds passenger or luggage capacity"}
                    </div>
                  )}
                </div>
                <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <div className="text-right">
                    <div className="text-[24px] font-black text-brand">{money(quote.subtotal, cur)}</div>
                    {quote.surcharge > 0 && <div className="text-[11px] text-amber-600">{t("nightSurcharge", lang)} {money(quote.surcharge, cur)}</div>}
                  </div>
                  {fits ? (
                    <Link href={`/booking/checkout?${qs({ vehicle: String(v.id), sub: ctx.subcategory?.slug ?? "", category: ctx.category.slug })}`} className="skeuo-btn px-6 py-2.5 text-[14px]">
                      {t("select", lang)}
                    </Link>
                  ) : (
                    <span className="skeuo-btn-light cursor-not-allowed px-6 py-2.5 text-[14px] opacity-60">{t("select", lang)}</span>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
