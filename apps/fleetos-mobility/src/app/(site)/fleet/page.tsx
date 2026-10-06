import Link from "next/link";
import { Check, Luggage, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/site/SectionTitle";
import { getLang, getSettings, getVehicles, getVehicleTypes } from "@/lib/data";
import { money } from "@/lib/format";
import { pick, t } from "@/lib/i18n";

export const metadata = { title: "車隊介紹" };

export default async function FleetPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const [lang, settings, vehicles, types] = await Promise.all([getLang(), getSettings(), getVehicles(), getVehicleTypes()]);
  const type = types.find((ty) => ty.slug === sp.type);
  const list = type ? vehicles.filter((v) => v.typeId === type.id) : vehicles;
  const cur = settings.pricing.currency;
  return (
    <div className="pt-2">
      <PageHeader title={t("fleet", lang)} subtitle={t("featuredFleetSub", lang)} image="/seed/tour-bus.jpg">
        <div className="mt-5 flex flex-wrap gap-2">
          {[{ slug: "", name: t("allTypes", lang) }, ...types.map((ty) => ({ slug: ty.slug, name: pick(ty, "name", lang) }))].map((ty) => (
            <Link key={ty.slug} href={ty.slug ? `/fleet?type=${ty.slug}` : "/fleet"} className={(type?.slug ?? "") === ty.slug ? "skeuo-btn px-4 py-1.5 text-[13px]" : "glass rounded-full px-4 py-1.5 text-[13px] font-semibold"}>
              {ty.name}
            </Link>
          ))}
        </div>
      </PageHeader>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((v) => (
          <article id={`v-${v.id}`} key={v.id} className="neu flex scroll-mt-24 flex-col p-5">
            <div className="relative grid h-44 place-items-center rounded-2xl bg-gradient-to-b from-white to-[#e4ebf6]">
              <div className="absolute bottom-6 h-5 w-2/3 rounded-[50%] bg-[#1b2440]/15 blur-md" />
              <img src={v.image} alt={pick(v, "name", lang)} className="floaty relative max-h-36 object-contain" />
            </div>
            <h2 className="mt-4 text-[19px] font-black">{pick(v, "name", lang)}</h2>
            <div className="text-[12.5px] text-muted">{v.model}</div>
            <div className="mt-3 flex gap-4 text-[13px]">
              <span className="flex items-center gap-1"><UsersRound size={15} /> {v.minPassengers}-{v.maxPassengers} {t("people", lang)}</span>
              <span className="flex items-center gap-1"><Luggage size={15} /> {v.luggage} {t("luggage", lang)}</span>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[12.5px]">
              {pick(v, "features", lang).split(/[,，]/).filter(Boolean).map((f) => (
                <li key={f} className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" />{f.trim()}</li>
              ))}
            </ul>
            <div className="neu-inset mt-4 grid grid-cols-3 divide-x divide-white/80 py-2 text-center text-[12px]">
              <div><div className="font-black text-brand">{money(v.basePrice, cur)}</div><div className="text-muted">{t("from", lang)}</div></div>
              <div><div className="font-black">{money(v.perHour, cur)}</div><div className="text-muted">{t("perHour", lang)}</div></div>
              <div><div className="font-black">{money(v.perDay, cur)}</div><div className="text-muted">{t("perDay", lang)}</div></div>
            </div>
            <Link href={`/booking?pax=${v.minPassengers}`} className="skeuo-btn mt-4 py-2.5 text-center text-[14px]">{t("bookNow", lang)}</Link>
          </article>
        ))}
      </div>
    </div>
  );
}
