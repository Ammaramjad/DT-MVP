import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCategories, getFaqs, getLang, getRoutes, getVehicles } from "@/lib/data";
import { pick, t } from "@/lib/i18n";

export const metadata = { title: "搜尋" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [lang, cats, routes, vehicles, faqs] = await Promise.all([getLang(), getCategories(), getRoutes(), getVehicles(), getFaqs()]);
  const n = q.trim().toLowerCase();
  const has = (...xs: string[]) => n && xs.some((x) => x.toLowerCase().includes(n));
  const results = [
    ...cats.filter((c) => has(c.nameZh, c.nameEn, c.descriptionZh, c.descriptionEn)).map((c) => ({ key: `c${c.id}`, title: pick(c, "name", lang), sub: pick(c, "subtitle", lang), href: `/services/${c.slug}`, img: c.image })),
    ...routes.filter((r) => has(r.fromZh, r.fromEn, r.toZh, r.toEn, r.descriptionZh, r.descriptionEn)).map((r) => ({ key: `r${r.id}`, title: `${pick(r, "from", lang)} → ${pick(r, "to", lang)}`, sub: pick(r, "description", lang), href: `/booking?category=${cats.find((c) => c.id === r.categoryId)?.slug ?? ""}&pickup=${encodeURIComponent(pick(r, "from", lang))}&dropoff=${encodeURIComponent(pick(r, "to", lang))}`, img: r.image })),
    ...vehicles.filter((v) => has(v.nameZh, v.nameEn, v.model)).map((v) => ({ key: `v${v.id}`, title: pick(v, "name", lang), sub: v.model, href: `/fleet#v-${v.id}`, img: v.image })),
    ...faqs.filter((f) => has(f.questionZh, f.questionEn, f.answerZh, f.answerEn)).map((f) => ({ key: `f${f.id}`, title: pick(f, "question", lang), sub: pick(f, "answer", lang), href: "/help", img: "" })),
  ];
  return (
    <div className="mx-auto max-w-3xl pt-2">
      <h1 className="mb-1 text-[26px] font-black">{t("search", lang)}: “{q}”</h1>
      <p className="mb-5 text-[13px] text-muted">{results.length} {t("results", lang)}</p>
      <div className="flex flex-col gap-3">
        {results.map((r) => (
          <Link key={r.key} href={r.href} className="neu-flat neu-press flex items-center gap-4 p-3">
            {r.img ? <img src={r.img} alt="" className="h-14 w-20 rounded-xl object-cover" /> : <span className="neu-inset h-14 w-20" />}
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{r.title}</span>
              <span className="block truncate text-[12.5px] text-muted">{r.sub}</span>
            </span>
            <ArrowRight size={16} className="text-muted" />
          </Link>
        ))}
        {results.length === 0 && <p className="neu p-10 text-center text-muted">{t("noResults", lang)}</p>}
      </div>
    </div>
  );
}
