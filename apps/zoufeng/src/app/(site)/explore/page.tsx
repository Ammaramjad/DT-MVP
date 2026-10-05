import Link from "next/link";
import { Clock, Route as RouteIcon } from "lucide-react";
import { FavoriteButton } from "@/components/site/FavoriteButton";
import { PageHeader } from "@/components/site/SectionTitle";
import { getCategories, getLang, getRoutes, getSettings } from "@/lib/data";
import { duration, money } from "@/lib/format";
import { pick, t } from "@/lib/i18n";

export const metadata = { title: "探索台灣" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const sp = await searchParams;
  const [lang, settings, routes, cats] = await Promise.all([getLang(), getSettings(), getRoutes(), getCategories()]);
  const cat = cats.find((c) => c.slug === sp.category);
  const list = cat ? routes.filter((r) => r.categoryId === cat.id) : routes;
  const usedCats = cats.filter((c) => routes.some((r) => r.categoryId === c.id));
  return (
    <div className="pt-2">
      <PageHeader title={t("explore", lang)} subtitle={t("popularRoutesSub", lang)} image="/seed/sun-moon-lake.jpg">
        <div className="mt-5 flex flex-wrap gap-2">
          {[{ slug: "", name: t("viewAll", lang) }, ...usedCats.map((c) => ({ slug: c.slug, name: pick(c, "name", lang) }))].map((c) => (
            <Link key={c.slug} href={c.slug ? `/explore?category=${c.slug}` : "/explore"} className={(cat?.slug ?? "") === c.slug ? "skeuo-btn px-4 py-1.5 text-[13px]" : "glass rounded-full px-4 py-1.5 text-[13px] font-semibold"}>
              {c.name}
            </Link>
          ))}
        </div>
      </PageHeader>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((r) => {
          const c = cats.find((x) => x.id === r.categoryId);
          return (
            <Link key={r.id} href={`/booking?category=${c?.slug ?? ""}&pickup=${encodeURIComponent(pick(r, "from", lang))}&dropoff=${encodeURIComponent(pick(r, "to", lang))}`} className="group relative h-[280px] overflow-hidden rounded-[28px] shadow-[0_14px_34px_rgba(31,52,112,0.22)]">
              <img src={r.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1736]/90 via-[#0b1736]/20 to-transparent" />
              <div className="absolute right-3 top-3"><FavoriteButton id={r.id} /></div>
              {c && <span className="glass-dark absolute left-3 top-3 rounded-full px-3 py-1 text-[11.5px] font-semibold">{pick(c, "name", lang)}</span>}
              <div className="glass-dark absolute inset-x-3 bottom-3 rounded-2xl p-4">
                <div className="text-[17px] font-black">{pick(r, "from", lang)} → {pick(r, "to", lang)}</div>
                <p className="mt-1 line-clamp-2 text-[12px] opacity-85">{pick(r, "description", lang)}</p>
                <div className="mt-2 flex items-center gap-3 text-[12px]">
                  <span className="flex items-center gap-1"><Clock size={12} />{duration(r.durationMin, lang)}</span>
                  <span className="flex items-center gap-1"><RouteIcon size={12} />{Math.round(r.distanceKm)} {t("km", lang)}</span>
                  <span className="ml-auto text-[15px] font-black">{money(r.price, settings.pricing.currency)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
