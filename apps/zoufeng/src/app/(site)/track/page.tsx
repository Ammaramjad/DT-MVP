import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getLang } from "@/lib/data";
import { t } from "@/lib/i18n";

export const metadata = { title: "查詢預訂" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ code?: string; phone?: string }> }) {
  const sp = await searchParams;
  if (sp.code && sp.phone) redirect(`/booking/${encodeURIComponent(sp.code.trim().toUpperCase())}?phone=${encodeURIComponent(sp.phone)}`);
  const lang = await getLang();
  return (
    <div className="mx-auto max-w-md pt-8">
      <form className="neu flex flex-col gap-4 p-7" action="/track">
        <h1 className="text-[24px] font-black">{t("trackBooking", lang)}</h1>
        <label className="text-[12.5px] font-medium">
          {t("bookingCode", lang)}
          <input name="code" required className="input mt-1 font-mono uppercase" placeholder="ZF2610AB12CD" defaultValue={sp.code} />
        </label>
        <label className="text-[12.5px] font-medium">
          {t("phone", lang)}
          <input name="phone" required className="input mt-1" defaultValue={sp.phone} />
        </label>
        <button className="skeuo-btn flex items-center justify-center gap-2 py-3 text-[14px]">
          <Search size={16} /> {t("search", lang)}
        </button>
      </form>
    </div>
  );
}
