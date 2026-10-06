import Link from "next/link";
import { CopyCode } from "@/components/site/CopyCode";
import { PageHeader } from "@/components/site/SectionTitle";
import { getActivePromotions, getLang, getSettings } from "@/lib/data";
import { money } from "@/lib/format";
import { pick, t } from "@/lib/i18n";

export const metadata = { title: "優惠活動" };

export default async function PromotionsPage() {
  const [lang, settings, promos] = await Promise.all([getLang(), getSettings(), getActivePromotions()]);
  const cur = settings.pricing.currency;
  return (
    <div className="pt-2">
      <PageHeader title={t("promotions", lang)} subtitle={lang === "zh" ? "於結帳時輸入優惠代碼即可享折扣" : "Enter a promo code at checkout to save"} image="/seed/kenting.jpg" />
      {promos.length === 0 && <p className="neu p-8 text-center text-muted">{t("noResults", lang)}</p>}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {promos.map((p) => (
          <article key={p.id} className="ticket paper flex flex-col overflow-hidden rounded-[26px]">
            {p.image && <img src={p.image} alt="" className="h-40 w-full object-cover" />}
            <div className="flex flex-1 flex-col gap-2 p-5">
              <div className="text-[30px] font-black text-gradient">{p.discountType === "fixed" ? `-${money(p.discountValue, cur)}` : lang === "zh" ? `${(100 - p.discountValue) / 10} 折` : `${p.discountValue}% OFF`}</div>
              <h2 className="text-[17px] font-black">{pick(p, "title", lang)}</h2>
              <p className="text-[13px] text-[#3b4669]">{pick(p, "description", lang)}</p>
              <div className="text-[12px] text-muted">
                {p.minAmount > 0 && <span>{t("minSpend", lang)} {money(p.minAmount, cur)} · </span>}
                {p.endsAt && <span>{t("validUntil", lang)} {p.endsAt}</span>}
              </div>
            </div>
            <div className="ticket-perf mx-5" />
            <div className="flex items-center gap-3 p-5">
              <span className="neu-inset px-3 py-1.5 font-mono text-[15px] font-black tracking-widest">{p.code}</span>
              <CopyCode code={p.code} copy={t("copy", lang)} copied={t("copied", lang)} />
              <Link href="/booking" className="skeuo-btn ml-auto px-4 py-1.5 text-[12.5px]">{t("bookNow", lang)}</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
