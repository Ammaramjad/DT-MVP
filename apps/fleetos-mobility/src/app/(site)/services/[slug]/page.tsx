import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { BookingWidget } from "@/components/site/BookingWidget";
import { getCategories, getLang, getRoutes, getSettings, getSubcategories, getVehicles } from "@/lib/data";
import { duration, money } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { Icon } from "@/lib/icons";
import { widgetCategories, widgetRoutes } from "@/lib/view";

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [lang, settings, cats, routes, vehicles] = await Promise.all([getLang(), getSettings(), getCategories(), getRoutes(), getVehicles()]);
  const c = cats.find((x) => x.slug === slug);
  if (!c) notFound();
  const subs = await getSubcategories(c.id);
  const catRoutes = routes.filter((r) => r.categoryId === c.id);
  const cur = settings.pricing.currency;
  const unit = c.pricingMode === "hourly" ? t("perHour", lang) : c.pricingMode === "daily" ? t("perDay", lang) : t("from", lang);
  const priceOf = (v: (typeof vehicles)[number]) => (c.pricingMode === "hourly" ? v.perHour : c.pricingMode === "daily" ? v.perDay : v.basePrice);

  return (
    <div className="flex flex-col gap-6 pt-2">
      <section className="relative overflow-hidden rounded-[34px]">
        <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#eef2f9] via-[#eef2f9]/85 to-[#eef2f9]/10" />
        <div className="relative max-w-xl p-6 sm:p-10">
          <span className="skeuo-icon h-14 w-14" style={{ ["--c" as string]: c.color }}>
            <Icon name={c.icon} size={24} />
          </span>
          <h1 className="mt-4 text-[34px] font-black leading-tight">{pick(c, "name", lang)}</h1>
          <p className="mt-1 text-[15px] font-semibold text-[#2c3758]">{pick(c, "subtitle", lang)}</p>
          <p className="mt-3 text-[14px] text-[#3b4669]">{pick(c, "description", lang)}</p>
        </div>
        <div className="relative px-3 pb-4 sm:px-6 sm:pb-6">
          <BookingWidget compact lang={lang} categories={widgetCategories(cats, lang)} routes={widgetRoutes(routes, cats, lang)} initial={{ category: c.slug }} />
        </div>
      </section>

      {subs.length > 0 && (
        <section>
          <h2 className="mb-4 text-[20px] font-black">{t("chooseOption", lang)}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subs.map((s) => (
              <Link key={s.id} href={`/booking?category=${c.slug}&sub=${s.slug}`} className="neu neu-press group overflow-hidden">
                <div className="h-36 overflow-hidden">
                  <img src={s.image || c.image} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-black">{pick(s, "name", lang)}</h3>
                    {s.priceMultiplier !== 1 && <span className="neu-inset !rounded-full px-2 py-0.5 text-[11px] font-bold">×{s.priceMultiplier}</span>}
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">{pick(s, "description", lang)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {catRoutes.length > 0 && (
        <section className="neu p-5 sm:p-6">
          <h2 className="mb-4 text-[20px] font-black">{t("popularRoutes", lang)}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {catRoutes.map((r) => (
              <Link key={r.id} href={`/booking?category=${c.slug}&pickup=${encodeURIComponent(pick(r, "from", lang))}&dropoff=${encodeURIComponent(pick(r, "to", lang))}`} className="neu-flat neu-press flex items-center gap-3 p-3">
                <img src={r.image} alt="" className="h-14 w-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <div className="text-[14px] font-bold">{pick(r, "from", lang)} → {pick(r, "to", lang)}</div>
                  <div className="flex items-center gap-1 text-[12px] text-muted"><Clock size={12} />{duration(r.durationMin, lang)} · {Math.round(r.distanceKm)} {t("km", lang)}</div>
                </div>
                <div className="font-black text-hot">{money(r.price, cur)}</div>
                <ArrowRight size={15} className="text-muted" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="neu p-5 sm:p-6">
        <h2 className="mb-4 text-[20px] font-black">{t("fleet", lang)}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <div key={v.id} className="neu-flat flex items-center gap-3 p-3">
              <img src={v.image} alt="" className="h-14 w-24 object-contain" />
              <div className="flex-1">
                <div className="text-[14px] font-bold">{pick(v, "name", lang)}</div>
                <div className="text-[11.5px] text-muted">{v.minPassengers}-{v.maxPassengers} {t("people", lang)} · {v.luggage} {t("luggage", lang)}</div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-black text-brand">{money(priceOf(v), cur)}</div>
                <div className="text-[10.5px] text-muted">{unit}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
