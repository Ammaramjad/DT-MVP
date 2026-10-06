import Link from "next/link";
import { ArrowRight, ChevronRight, Clock, MapPin, Plane, Star } from "lucide-react";
import { BookingWidget } from "@/components/site/BookingWidget";
import { FavoriteButton } from "@/components/site/FavoriteButton";
import { FleetSection } from "@/components/site/FleetSection";
import { AppPanel } from "@/components/site/home/AppPanel";
import { VideoButton } from "@/components/site/VideoButton";
import { WeatherIcon } from "@/components/site/WeatherIcon";
import { aqiText, getCategories, getLang, getReviews, getRoutes, getSettings, getVehicles, getVehicleTypes, getWeather, weatherText } from "@/lib/data";
import { duration, money } from "@/lib/format";
import { bi, pick, t } from "@/lib/i18n";
import { Icon } from "@/lib/icons";
import { fleetVehicles, widgetCategories, widgetRoutes } from "@/lib/view";

export default async function HomePage() {
  const [lang, s, cats, routes, vehicles, types, reviews] = await Promise.all([
    getLang(),
    getSettings(),
    getCategories(),
    getRoutes(),
    getVehicles(),
    getVehicleTypes(),
    getReviews(5),
  ]);
  const weather = await getWeather(s.weather.latitude, s.weather.longitude);
  const wt = weather ? weatherText(weather.code, lang) : null;
  const popular = routes.filter((r) => r.popular).slice(0, 6);
  const homeCats = cats.filter((c) => c.showOnHome);
  const featured = vehicles.filter((v) => v.featured);
  const km = lang === "zh" ? "公里" : "km";

  return (
    <div className="flex flex-col gap-5">
      {/* HERO */}
      <section className="relative">
        <div className="relative min-h-[540px] overflow-hidden rounded-[34px] bg-gradient-to-br from-[#f4f7fd] via-[#e9f1fb] to-[#dde8f8] lg:min-h-[560px]">
          <img src={s.heroImage} alt="" className="hero-mask absolute inset-y-0 right-0 h-full w-full object-cover object-center md:w-[78%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#eef3fb] via-[#eef3fb]/70 to-transparent md:via-[#eef3fb]/25" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#eef2f9] via-[#eef2f9]/70 to-transparent" />

          <div className="relative z-10 flex flex-col gap-4 p-6 pb-52 sm:p-10 sm:pb-52 md:max-w-[58%]">
            <h1 className="fade-up text-[34px] font-black leading-[1.15] tracking-tight text-[#14204a] sm:text-[46px] xl:text-[54px]">
              {bi(s.heroTitle1, lang)}
              <br />
              {bi(s.heroTitle2, lang)}
              <span className="text-gradient">{bi(s.heroHighlight, lang)}</span>
            </h1>
            <p className="fade-up text-[15px] font-medium leading-relaxed text-[#2c3758]" style={{ animationDelay: ".1s" }}>
              {bi(s.heroSubtitle1, lang)}
              <br />
              {bi(s.heroSubtitle2, lang)}
            </p>
            <div className="fade-up flex flex-wrap gap-2.5" style={{ animationDelay: ".2s" }}>
              {s.heroFeatures.map((f, i) => (
                <span key={i} className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-[13px] font-semibold">
                  <span className="skeuo-icon h-8 w-8" style={{ ["--c" as string]: ["#7b4dff", "#2f6bff", "#19a3e6", "#10b981"][i % 4] }}>
                    <Icon name={f.icon} size={14} />
                  </span>
                  {bi(f, lang)}
                </span>
              ))}
            </div>
          </div>

          <div className="absolute right-5 top-5 z-10 flex flex-col items-end gap-3">
            <div className="glass hidden min-w-[210px] rounded-3xl p-4 sm:block">
              <div className="flex items-center gap-1 text-[13px] font-bold">
                <MapPin size={12} />
                {bi(s.weather.city, lang)}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <WeatherIcon icon={wt?.icon ?? "cloud-sun"} />
                <span>
                  <span className="block text-[26px] font-black leading-none">{weather ? `${weather.temp}°C` : "--°C"}</span>
                  <span className="block text-[11.5px] text-[#3b4669]">
                    {wt?.text ?? "—"}・{aqiText(weather?.aqi ?? null, lang)}
                  </span>
                </span>
              </div>
            </div>
            <div className="glass hidden rounded-full py-1.5 pl-1.5 pr-5 sm:block">
              <VideoButton url={s.videoUrl} label={bi(s.videoLabel, lang)} />
            </div>
          </div>

          <Link href={s.airportChip.href} className="glass-dark absolute right-[270px] top-6 z-10 hidden items-center gap-3 rounded-2xl px-4 py-2.5 xl:flex">
            <Plane size={22} />
            <span>
              <span className="block text-[13.5px] font-bold">{bi(s.airportChip.title, lang)}</span>
              <span className="block text-[11.5px] opacity-85">{bi(s.airportChip.meta, lang)}</span>
            </span>
          </Link>
        </div>

        <div className="relative z-20 -mt-48 px-2 sm:px-5">
          <BookingWidget lang={lang} categories={widgetCategories(cats, lang)} routes={widgetRoutes(routes, cats, lang)} />
        </div>
      </section>

      {/* SERVICES */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {homeCats.map((c) => (
          <Link key={c.id} href={`/services/${c.slug}`} className="neu neu-press group flex flex-col overflow-hidden !rounded-3xl">
            <div className="h-[118px] overflow-hidden">
              {c.image && <img src={c.image} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />}
            </div>
            <div className="flex items-center gap-2.5 p-3">
              <span className="skeuo-icon -mt-8 h-11 w-11 shrink-0" style={{ ["--c" as string]: c.color }}>
                <Icon name={c.icon} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-black">{pick(c, "name", lang)}</span>
                <span className="block text-[11px] leading-tight text-muted">{pick(c, "subtitle", lang)}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
          </Link>
        ))}
      </section>

      {/* ROUTES */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <span className="skeuo-icon h-6 w-6" style={{ ["--c" as string]: "#f59e0b" }}>
            <MapPin size={12} />
          </span>
          <h2 className="text-[20px] font-black">{t("popularRoutes", lang)}</h2>
          <span className="hidden text-[12.5px] text-muted sm:inline">{t("popularRoutesSub", lang)}</span>
          <Link href="/explore" className="ml-auto flex items-center gap-1 text-[13px] font-semibold text-ink hover:text-brand">
            {t("viewAll", lang)} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {popular.map((r) => {
            const q = new URLSearchParams({ pickup: pick(r, "from", lang), dropoff: pick(r, "to", lang), category: cats.find((c) => c.id === r.categoryId)?.slug ?? "" });
            return (
              <Link key={r.id} href={`/booking?${q}`} className="neu neu-press group flex flex-col overflow-hidden !rounded-3xl">
                <div className="relative h-[108px] overflow-hidden">
                  <img src={r.image} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute right-2 top-2">
                    <FavoriteButton id={r.id} />
                  </div>
                </div>
                <div className="flex items-end gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">
                      {pick(r, "from", lang)} → {pick(r, "to", lang)}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted">
                      <Clock size={11} />
                      {duration(r.durationMin, lang)}・{Math.round(r.distanceKm)} {km}
                    </div>
                    <div className="mt-1 text-[15px] font-black text-hot">
                      {money(r.price, s.pricing.currency)} <span className="text-[11px] font-semibold">{lang === "zh" ? "起" : "from"}</span>
                    </div>
                  </div>
                  <span className="skeuo-btn-light grid h-7 w-7 shrink-0 place-items-center !rounded-full">
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FLEET + APP */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <FleetSection
          title={t("featuredFleet", lang)}
          subtitle={t("featuredFleetSub", lang)}
          allLabel={t("allTypes", lang)}
          types={types.map((ty) => ({ id: ty.id, name: pick(ty, "name", lang) }))}
          vehicles={fleetVehicles(featured, lang, s.pricing.currency)}
          labels={{ from: t("from", lang), people: t("people", lang), bags: t("luggage", lang), book: t("bookNow", lang) }}
        />
        <AppPanel s={s} lang={lang} />
      </section>

      {/* STATS */}
      <section className="glass-strong flex flex-col gap-4 rounded-[28px] p-4 xl:flex-row xl:items-center">
        <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-5">
          {s.stats.map((st, i) => (
            <div key={i} className="flex items-center gap-3 md:border-r md:border-white/80 md:last:border-0">
              <span className="skeuo-icon h-10 w-10 shrink-0" style={{ ["--c" as string]: ["#10b981", "#7b4dff", "#2f6bff", "#10b981", "#2f6bff"][i % 5] }}>
                <Icon name={st.icon} size={17} />
              </span>
              <span>
                <span className="block text-[16px] font-black leading-tight">{st.value}</span>
                <span className="block text-[11.5px] text-muted">{bi(st, lang)}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="neu-flat flex items-center gap-3 px-4 py-2.5">
          <Star size={30} className="text-amber-400 drop-shadow-[0_3px_6px_rgba(245,158,11,0.5)]" fill="currentColor" />
          <span>
            <span className="block text-[16px] font-black">{s.rating.score}/5</span>
            <span className="block text-[11px] text-muted">{bi(s.rating.label, lang)}</span>
          </span>
          <span className="ml-3 flex -space-x-2">
            {reviews.slice(0, 4).map((r) => (
              <img key={r.id} src={r.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(r.name)}`} alt={r.name} className="h-8 w-8 rounded-full border-2 border-white bg-[#dfe7f5] object-cover" />
            ))}
          </span>
          <Link href="/reviews" className="skeuo-btn-light ml-2 flex items-center gap-1 px-4 py-2 text-[12.5px]">
            {t("moreReviews", lang)} <ArrowRight size={13} />
          </Link>
        </div>
      </section>
    </div>
  );
}
