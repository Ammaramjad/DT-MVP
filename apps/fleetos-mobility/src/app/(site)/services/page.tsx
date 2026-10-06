import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/site/SectionTitle";
import { getCategories, getLang, getSubcategories } from "@/lib/data";
import { pick, t } from "@/lib/i18n";
import { Icon } from "@/lib/icons";

export const metadata = { title: "服務項目" };

export default async function ServicesPage() {
  const [lang, cats, subs] = await Promise.all([getLang(), getCategories(), getSubcategories()]);
  return (
    <div className="pt-2">
      <PageHeader title={t("services", lang)} subtitle={lang === "zh" ? "從機場接送到婚禮禮車，一站式滿足所有移動需求" : "From airport transfers to wedding cars — every ride in one place"} image="/seed/taipei-skyline.jpg" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cats.map((c) => (
          <Link key={c.id} href={`/services/${c.slug}`} className="neu neu-press group flex flex-col overflow-hidden">
            <div className="h-44 overflow-hidden">
              <img src={c.image} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <div className="flex items-center gap-3">
                <span className="skeuo-icon -mt-10 h-12 w-12" style={{ ["--c" as string]: c.color }}>
                  <Icon name={c.icon} size={20} />
                </span>
                <h2 className="text-[18px] font-black">{pick(c, "name", lang)}</h2>
              </div>
              <p className="text-[13px] text-[#3b4669]">{pick(c, "description", lang)}</p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                {subs
                  .filter((s) => s.categoryId === c.id)
                  .map((s) => (
                    <span key={s.id} className="neu-inset !rounded-full px-2.5 py-0.5 text-[11.5px]">
                      {pick(s, "name", lang)}
                    </span>
                  ))}
              </div>
              <span className="mt-2 flex items-center gap-1 text-[13px] font-bold text-brand">
                {t("bookNow", lang)} <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
