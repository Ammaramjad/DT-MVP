import QRCode from "qrcode";
import type { SiteSettings } from "@/lib/settings-shape";
import { bi, type Lang } from "@/lib/i18n";

export async function AppPanel({ s, lang }: { s: SiteSettings; lang: Lang }) {
  const qr = await QRCode.toDataURL(s.app.qrLink || "https://zoufeng.tw", { margin: 1, width: 220, color: { dark: "#1b2440", light: "#ffffff" } });
  const store = "flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#2a2f3d] to-black px-3 py-2 text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_6px_14px_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5";
  return (
    <div className="glass-strong relative flex h-full overflow-hidden rounded-[28px] p-5">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-cyan/40 to-brand-2/30 blur-3xl" />
      <div className="relative z-10 flex flex-col">
        <h3 className="text-[19px] font-black">{bi(s.app.title, lang)}</h3>
        <p className="text-[12.5px] text-muted">{bi(s.app.subtitle, lang)}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="neu-inset p-2">
            <img src={qr} alt="QR code" className="h-[96px] w-[96px] rounded-lg" />
          </div>
          <div className="flex flex-col gap-2">
            <a href={s.app.appStoreUrl} target="_blank" rel="noreferrer" className={store}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.2-.8s1.9.8 3.3.8 2.2-1.2 3-2.5c1-1.4 1.4-2.8 1.4-2.8s-2.6-1-2.6-4.1zM14 5.4c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" />
              </svg>
              <span className="leading-none">
                <span className="block text-[9px] opacity-80">Download on the</span>
                <span className="block text-[13px] font-semibold">App Store</span>
              </span>
            </a>
            <a href={s.app.playStoreUrl} target="_blank" rel="noreferrer" className={store}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M4 2.5 14 12 4 21.5c-.3-.2-.5-.6-.5-1v-17c0-.4.2-.8.5-1z" fill="#2196f3" />
                <path d="m17.3 8.8-3.3 3.2-10-9.5c.2-.1.6-.1.9.1z" fill="#4caf50" />
                <path d="m17.3 15.2-12.4 6.4c-.3.2-.7.2-.9.1l10-9.5z" fill="#f44336" />
                <path d="M20.6 12c0 .5-.3 1-.8 1.3l-2.5 1.9-3.3-3.2 3.3-3.2 2.5 1.9c.5.3.8.8.8 1.3z" fill="#ffc107" />
              </svg>
              <span className="leading-none">
                <span className="block text-[9px] opacity-80">GET IT ON</span>
                <span className="block text-[13px] font-semibold">Google Play</span>
              </span>
            </a>
          </div>
        </div>
      </div>
      <div className="relative ml-auto hidden w-[120px] shrink-0 sm:block">
        <div className="floaty absolute right-0 top-2 h-[200px] w-[104px] rotate-[10deg] rounded-[22px] border-[5px] border-[#1b2440] bg-gradient-to-b from-white to-[#e8eefb] p-2 shadow-[0_20px_40px_rgba(27,36,64,0.35)]">
          <div className="mx-auto mb-2 h-1.5 w-8 rounded-full bg-[#1b2440]/80" />
          <div className="text-center text-[11px] font-black text-[#ef2b3c]">{s.siteName}</div>
          <div className="mt-2 space-y-1.5">
            <div className="h-2 rounded bg-[#dbe4f5]" />
            <div className="h-2 w-3/4 rounded bg-[#dbe4f5]" />
            <div className="mt-3 h-10 rounded-lg bg-gradient-to-br from-cyan/60 to-brand/60" />
            <div className="h-2 rounded bg-[#dbe4f5]" />
            <div className="mt-2 h-5 rounded-md bg-gradient-to-r from-[#ef2b3c] to-[#ff6b78]" />
          </div>
        </div>
      </div>
    </div>
  );
}
