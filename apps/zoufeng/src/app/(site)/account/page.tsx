import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { CalendarCheck, MapPin } from "lucide-react";
import { getDb, schema as s } from "@/db";
import { LogoutButton } from "@/components/site/LogoutButton";
import { getCategories, getCustomer, getLang, getSettings } from "@/lib/data";
import { formatDateTime, money } from "@/lib/format";
import { pick, statusLabels, t } from "@/lib/i18n";
import { Icon } from "@/lib/icons";

export const metadata = { title: "會員中心" };

export default async function AccountPage() {
  const me = await getCustomer();
  if (!me) redirect("/login?next=/account");
  const [lang, settings, cats] = await Promise.all([getLang(), getSettings(), getCategories()]);
  const db = await getDb();
  const rows = await db.select().from(s.bookings).where(eq(s.bookings.customerId, me.id)).orderBy(desc(s.bookings.pickupAt)).limit(100);
  const now = new Date().toISOString();
  const upcoming = rows.filter((b) => b.pickupAt >= now && !["cancelled", "completed"].includes(b.status));
  const spent = rows.filter((b) => b.status === "completed").reduce((a, b) => a + b.total, 0);
  return (
    <div className="flex flex-col gap-6 pt-2">
      <section className="glass-strong flex flex-col gap-4 rounded-[28px] p-6 sm:flex-row sm:items-center">
        <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(me.email)}`} alt="" className="h-16 w-16 rounded-full bg-[#dfe7f5] ring-4 ring-white" />
        <div className="flex-1">
          <h1 className="text-[24px] font-black">{me.name}</h1>
          <div className="text-[13px] text-muted">{me.email} {me.phone && `· ${me.phone}`}</div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            [rows.length, lang === "zh" ? "總訂單" : "Bookings"],
            [upcoming.length, lang === "zh" ? "即將出發" : "Upcoming"],
            [money(spent, settings.pricing.currency), lang === "zh" ? "累計消費" : "Spent"],
          ].map(([v, l]) => (
            <div key={String(l)} className="neu-sm px-4 py-2">
              <div className="text-[16px] font-black">{v}</div>
              <div className="text-[11px] text-muted">{l}</div>
            </div>
          ))}
        </div>
        <LogoutButton label={t("logout", lang)} />
      </section>
      <section className="neu p-5 sm:p-6">
        <div className="mb-4 flex items-center">
          <h2 className="text-[18px] font-black">{t("myBookings", lang)}</h2>
          <Link href="/booking" className="skeuo-btn ml-auto px-4 py-2 text-[13px]">{t("bookNow", lang)}</Link>
        </div>
        {rows.length === 0 && <p className="py-10 text-center text-muted">{t("noResults", lang)}</p>}
        <div className="flex flex-col gap-3">
          {rows.map((b) => {
            const c = cats.find((x) => x.id === b.categoryId);
            const st = statusLabels[b.status];
            return (
              <Link key={b.id} href={`/booking/${b.code}`} className="neu-flat neu-press flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className="skeuo-icon h-10 w-10 shrink-0" style={{ ["--c" as string]: c?.color ?? "#2f6bff" }}>
                  <Icon name={c?.icon ?? "Car"} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[14px] font-bold">
                    <span className="font-mono">{b.code}</span>
                    <span className="text-muted">· {c ? pick(c, "name", lang) : ""}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate text-[12.5px] text-[#3b4669]"><MapPin size={12} />{b.pickup}{b.dropoff && ` → ${b.dropoff}`}</div>
                  <div className="flex items-center gap-1 text-[12px] text-muted"><CalendarCheck size={12} />{formatDateTime(b.pickupAt, lang)}</div>
                </div>
                <span className="rounded-full px-3 py-1 text-[11.5px] font-bold text-white" style={{ background: st?.color }}>{st?.[lang]}</span>
                <span className="text-[16px] font-black text-brand">{money(b.total, settings.pricing.currency)}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
