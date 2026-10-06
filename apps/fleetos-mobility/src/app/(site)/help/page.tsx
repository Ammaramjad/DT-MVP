import Link from "next/link";
import { ChevronDown, Clock, Mail, MapPin, MessageCircle, Phone, Search } from "lucide-react";
import { ContactForm } from "@/components/site/ContactForm";
import { PageHeader } from "@/components/site/SectionTitle";
import { getFaqs, getLang, getSettings } from "@/lib/data";
import { bi, pick, t } from "@/lib/i18n";

export const metadata = { title: "幫助中心" };

export default async function HelpPage() {
  const [lang, settings, faqs] = await Promise.all([getLang(), getSettings(), getFaqs()]);
  const groups = Array.from(new Set(faqs.map((f) => pick(f, "group", lang))));
  const c = settings.contact;
  return (
    <div className="flex flex-col gap-6 pt-2">
      <PageHeader title={t("helpCenter", lang)} subtitle={lang === "zh" ? "常見問題、預訂查詢與客服聯繫" : "FAQs, booking lookup and customer support"} image="/seed/taipei-101-night.jpg">
        <Link href="/track" className="skeuo-btn mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-[14px]">
          <Search size={16} /> {t("trackBooking", lang)}
        </Link>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g} className="neu p-5 sm:p-6">
              <h2 className="mb-3 text-[18px] font-black">{g}</h2>
              <div className="flex flex-col gap-2.5">
                {faqs
                  .filter((f) => pick(f, "group", lang) === g)
                  .map((f) => (
                    <details key={f.id} className="neu-flat group px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 text-[14px] font-bold">
                        {pick(f, "question", lang)}
                        <ChevronDown size={16} className="shrink-0 transition group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-[13px] leading-relaxed text-[#3b4669]">{pick(f, "answer", lang)}</p>
                    </details>
                  ))}
              </div>
            </section>
          ))}
        </div>
        <aside id="contact" className="flex scroll-mt-24 flex-col gap-6">
          <div className="glass-strong rounded-[26px] p-5">
            <h2 className="mb-4 text-[18px] font-black">{t("contactUs", lang)}</h2>
            <ul className="space-y-3 text-[13.5px]">
              <li className="flex items-center gap-3"><span className="skeuo-icon h-9 w-9" style={{ ["--c" as string]: "#10b981" }}><Phone size={15} /></span><a href={`tel:${c.phone}`} className="font-bold">{c.phone}</a></li>
              <li className="flex items-center gap-3"><span className="skeuo-icon h-9 w-9" style={{ ["--c" as string]: "#2f6bff" }}><Mail size={15} /></span><a href={`mailto:${c.email}`}>{c.email}</a></li>
              <li className="flex items-center gap-3"><span className="skeuo-icon h-9 w-9" style={{ ["--c" as string]: "#06c755" }}><MessageCircle size={15} /></span>LINE {c.line}</li>
              <li className="flex items-center gap-3"><span className="skeuo-icon h-9 w-9" style={{ ["--c" as string]: "#ef4444" }}><MapPin size={15} /></span>{bi(c.address, lang)}</li>
              <li className="flex items-center gap-3"><span className="skeuo-icon h-9 w-9" style={{ ["--c" as string]: "#f59e0b" }}><Clock size={15} /></span>{bi(c.hours, lang)}</li>
            </ul>
          </div>
          <div className="neu p-5">
            <h3 className="mb-3 text-[16px] font-black">{t("message", lang)}</h3>
            <ContactForm lang={lang} />
          </div>
        </aside>
      </div>
    </div>
  );
}
