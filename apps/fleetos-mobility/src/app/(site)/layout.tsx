import Link from "next/link";
import { Suspense } from "react";
import { UserRound } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SidebarNav, type NavLink } from "@/components/site/SidebarNav";
import { LangSwitch } from "@/components/site/LangSwitch";
import { MobileMenu } from "@/components/site/MobileMenu";
import { SearchBox } from "@/components/site/SearchBox";
import { getCustomer, getLang, getNav, getSettings } from "@/lib/data";
import { bi, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [lang, settings, sidebar, footer, customer] = await Promise.all([getLang(), getSettings(), getNav("sidebar"), getNav("footer"), getCustomer()]);
  const toLinks = (rows: typeof sidebar): NavLink[] =>
    rows.map((r) => ({ id: r.id, label: lang === "zh" ? r.labelZh : r.labelEn, href: r.href, icon: r.icon, newTab: r.newTab }));
  const side = toLinks(sidebar);
  const foot = toLinks(footer);
  const logo = <Logo name={settings.siteName} tagline={bi(settings.tagline, lang)} logo={settings.logo} />;

  return (
    <div className="relative min-h-screen">
      <aside className="glass fixed inset-y-3 left-3 z-40 hidden w-[188px] flex-col gap-6 rounded-[28px] px-3 py-5 lg:flex">
        <Link href="/" className="px-2">
          {logo}
        </Link>
        <div className="no-scrollbar -mx-1 flex-1 overflow-y-auto px-1">
          <SidebarNav items={side} />
        </div>
        <Link href={settings.promo.href} className="group relative mx-1 min-h-[130px] overflow-hidden rounded-2xl shadow-[0_10px_24px_rgba(31,52,112,0.2)]">
          <img src={settings.promo.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/40 to-transparent" />
          <div className="relative p-3">
            <div className="text-[14px] font-black leading-tight">{bi(settings.promo.title, lang)}</div>
            <div className="text-[12px] font-semibold text-[#2c3758]">{bi(settings.promo.subtitle, lang)}</div>
            <span className="glass mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold">{bi(settings.promo.button, lang)} →</span>
          </div>
        </Link>
        <div className="border-t border-white/70 pt-3">
          <SidebarNav items={foot.filter((f) => f.href !== "/admin")} />
        </div>
      </aside>

      <div className="lg:pl-[204px]">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 pb-2 pt-3 lg:px-6">
          <Link href="/" className="lg:hidden">
            {logo}
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden md:block">
              <Suspense>
                <SearchBox placeholder={bi(settings.searchPlaceholder, lang)} />
              </Suspense>
            </div>
            <LangSwitch lang={lang} />
            <Link href={customer ? "/account" : "/login"} className="skeuo-btn flex h-10 items-center gap-2 rounded-full px-4 text-[13px]">
              <UserRound size={16} />
              <span className="hidden sm:inline">{customer ? customer.name : t("login", lang)}</span>
            </Link>
            <div className="lg:hidden">
              <MobileMenu items={side} footer={foot} header={logo} />
            </div>
          </div>
        </header>
        <main className="px-4 pb-10 lg:px-6">{children}</main>
        <footer className="px-4 pb-6 lg:px-6">
          <div className="neu-flat flex flex-col items-center justify-between gap-3 px-6 py-4 text-[12px] text-muted md:flex-row">
            <span>{bi(settings.footer, lang)}</span>
            <span className="flex flex-wrap items-center gap-4">
              <a href={`tel:${settings.contact.phone}`}>☎ {settings.contact.phone}</a>
              <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a>
              <span>LINE {settings.contact.line}</span>
              <Link href="/admin" className="underline-offset-2 hover:underline">
                {lang === "zh" ? "管理後台" : "Admin"}
              </Link>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
