import { Quote, Star } from "lucide-react";
import { PageHeader } from "@/components/site/SectionTitle";
import { getLang, getReviews, getSettings } from "@/lib/data";
import { bi, t } from "@/lib/i18n";

export const metadata = { title: "旅客評價" };

export default async function ReviewsPage() {
  const [lang, settings, reviews] = await Promise.all([getLang(), getSettings(), getReviews(100)]);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  return (
    <div className="pt-2">
      <PageHeader title={lang === "zh" ? "旅客評價" : "Reviews"} subtitle={bi(settings.rating.label, lang)} image="/seed/jiufen.jpg">
        <div className="glass mt-5 inline-flex items-center gap-3 rounded-2xl px-4 py-3">
          <span className="text-[34px] font-black">{settings.rating.score}</span>
          <span>
            <span className="flex text-amber-400">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} fill="currentColor" />)}</span>
            <span className="text-[12px] text-muted">{reviews.length} {lang === "zh" ? "則精選評價" : "featured reviews"} · avg {avg.toFixed(1)}</span>
          </span>
        </div>
      </PageHeader>
      <div className="columns-1 gap-5 md:columns-2 xl:columns-3">
        {reviews.map((r) => (
          <article key={r.id} className="neu mb-5 break-inside-avoid p-5">
            <Quote size={22} className="text-brand/40" />
            <p className="mt-2 text-[14px] leading-relaxed">{r.content}</p>
            <div className="mt-4 flex items-center gap-3">
              <img src={r.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(r.name)}`} alt="" className="h-10 w-10 rounded-full bg-[#dfe7f5]" />
              <div className="flex-1">
                <div className="text-[13.5px] font-bold">{r.name}</div>
                <div className="text-[11.5px] text-muted">{r.trip}</div>
              </div>
              <span className="flex text-amber-400">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={13} fill="currentColor" />)}</span>
            </div>
          </article>
        ))}
      </div>
      {reviews.length === 0 && <p className="neu p-8 text-center text-muted">{t("noResults", lang)}</p>}
    </div>
  );
}
