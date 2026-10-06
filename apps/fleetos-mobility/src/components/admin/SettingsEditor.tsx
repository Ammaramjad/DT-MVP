"use client";

import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import type { SiteSettings } from "@/lib/settings-shape";
import { IconField } from "./IconField";
import { ImageField } from "./ImageField";

type Kind = "text" | "bi" | "image" | "number" | "textarea";
type F = { path: string; label: string; kind: Kind };
type Section = { id: string; title: string; fields: F[]; list?: { path: "heroFeatures" | "stats"; label: string } };

const SECTIONS: Section[] = [
  { id: "brand", title: "Brand · 品牌", fields: [{ path: "siteName", label: "Site name", kind: "text" }, { path: "tagline", label: "Tagline", kind: "bi" }, { path: "logo", label: "Logo image (blank = built-in logo)", kind: "image" }, { path: "footer", label: "Footer text", kind: "bi" }, { path: "searchPlaceholder", label: "Search placeholder", kind: "bi" }] },
  {
    id: "hero",
    title: "Hero · 首頁主視覺",
    fields: [
      { path: "heroImage", label: "Hero image", kind: "image" },
      { path: "heroTitle1", label: "Title line 1", kind: "bi" },
      { path: "heroTitle2", label: "Title line 2", kind: "bi" },
      { path: "heroHighlight", label: "Highlighted word", kind: "bi" },
      { path: "heroSubtitle1", label: "Subtitle 1", kind: "bi" },
      { path: "heroSubtitle2", label: "Subtitle 2", kind: "bi" },
      { path: "airportChip.title", label: "Airport chip title", kind: "bi" },
      { path: "airportChip.meta", label: "Airport chip meta", kind: "bi" },
      { path: "airportChip.href", label: "Airport chip link", kind: "text" },
      { path: "videoUrl", label: "Video URL (YouTube or .mp4/.webm)", kind: "text" },
      { path: "videoLabel", label: "Video button label", kind: "bi" },
    ],
    list: { path: "heroFeatures", label: "Feature pills" },
  },
  { id: "weather", title: "Weather · 天氣", fields: [{ path: "weather.city", label: "City", kind: "bi" }, { path: "weather.latitude", label: "Latitude", kind: "number" }, { path: "weather.longitude", label: "Longitude", kind: "number" }] },
  { id: "stats", title: "Stats & rating · 數據", fields: [{ path: "rating.score", label: "Rating score", kind: "text" }, { path: "rating.label", label: "Rating label", kind: "bi" }], list: { path: "stats", label: "Statistics" } },
  { id: "app", title: "App download · APP", fields: [{ path: "app.title", label: "Title", kind: "bi" }, { path: "app.subtitle", label: "Subtitle", kind: "bi" }, { path: "app.appStoreUrl", label: "App Store URL", kind: "text" }, { path: "app.playStoreUrl", label: "Google Play URL", kind: "text" }, { path: "app.qrLink", label: "QR code link", kind: "text" }] },
  { id: "promo", title: "Sidebar promo · 側欄廣告", fields: [{ path: "promo.image", label: "Image", kind: "image" }, { path: "promo.title", label: "Title", kind: "bi" }, { path: "promo.subtitle", label: "Subtitle", kind: "bi" }, { path: "promo.button", label: "Button", kind: "bi" }, { path: "promo.href", label: "Link", kind: "text" }] },
  { id: "contact", title: "Contact · 聯絡", fields: [{ path: "contact.phone", label: "Phone", kind: "text" }, { path: "contact.email", label: "Email", kind: "text" }, { path: "contact.line", label: "LINE ID", kind: "text" }, { path: "contact.address", label: "Address", kind: "bi" }, { path: "contact.hours", label: "Hours", kind: "bi" }] },
  {
    id: "pricing",
    title: "Pricing rules · 計價",
    fields: [
      { path: "pricing.currency", label: "Currency symbol", kind: "text" },
      { path: "pricing.includedKm", label: "Km included in base price", kind: "number" },
      { path: "pricing.nightSurchargePercent", label: "Night surcharge %", kind: "number" },
      { path: "pricing.nightStartHour", label: "Night starts (hour 0-23)", kind: "number" },
      { path: "pricing.nightEndHour", label: "Night ends (hour 0-23)", kind: "number" },
      { path: "pricing.minHours", label: "Minimum hours (hourly services)", kind: "number" },
    ],
  },
];

const get = (o: unknown, p: string): unknown => p.split(".").reduce<unknown>((a, k) => (a as Record<string, unknown> | undefined)?.[k], o);
function setPath<T>(o: T, p: string, v: unknown): T {
  const [k, ...rest] = p.split(".");
  const cur = (o as Record<string, unknown>)[k];
  return { ...o, [k]: rest.length ? setPath(cur ?? {}, rest.join("."), v) : v } as T;
}

export function SettingsEditor({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [tab, setTab] = useState(SECTIONS[0].id);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sec = SECTIONS.find((x) => x.id === tab)!;
  const upd = (p: string, v: unknown) => setS((x) => setPath(x, p, v));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(s) });
    setBusy(false);
    if (r.ok) {
      setS(await r.json());
      setMsg({ ok: true, text: "Saved — the website is updated." });
      router.refresh();
    } else setMsg({ ok: false, text: (await r.json().catch(() => ({}))).error || "Save failed" });
  };

  const field = (f: F) => {
    const v = get(s, f.path);
    if (f.kind === "image") return <ImageField value={String(v ?? "")} onChange={(x) => upd(f.path, x)} />;
    if (f.kind === "bi") {
      const b = (v ?? { zh: "", en: "" }) as { zh: string; en: string };
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={b.zh} onChange={(e) => upd(f.path, { ...b, zh: e.target.value })} placeholder="中文" className="input" />
          <input value={b.en} onChange={(e) => upd(f.path, { ...b, en: e.target.value })} placeholder="English" className="input" />
        </div>
      );
    }
    if (f.kind === "number") return <input type="number" step="any" value={String(v ?? 0)} onChange={(e) => upd(f.path, Number(e.target.value))} className="input" />;
    return <input value={String(v ?? "")} onChange={(e) => upd(f.path, e.target.value)} className="input" />;
  };

  const list = sec.list;
  const items = list ? ((s[list.path] as unknown as Record<string, string>[]) ?? []) : [];

  return (
    <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
      <nav className="neu flex flex-row flex-wrap gap-1 p-2 lg:flex-col lg:self-start">
        {SECTIONS.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)} className={clsx("rounded-2xl px-3 py-2 text-left text-[13px]", tab === x.id ? "neu-inset font-bold text-brand" : "hover:bg-white/60")}>
            {x.title}
          </button>
        ))}
      </nav>
      <div className="neu flex flex-col gap-4 p-5">
        <h2 className="text-[18px] font-black">{sec.title}</h2>
        {sec.fields.map((f) => (
          <label key={f.path} className="flex flex-col gap-1 text-[12.5px] font-semibold">
            {f.label}
            {field(f)}
          </label>
        ))}
        {list && (
          <div className="flex flex-col gap-2">
            <div className="text-[12.5px] font-semibold">{list.label}</div>
            {items.map((it, i) => (
              <div key={i} className="neu-flat grid items-center gap-2 p-2 sm:grid-cols-[150px_repeat(auto-fit,minmax(110px,1fr))_40px]">
                <IconField value={it.icon} onChange={(v) => upd(list.path, items.map((x, j) => (j === i ? { ...x, icon: v } : x)))} />
                {(list.path === "stats" ? ["value", "zh", "en"] : ["zh", "en"]).map((k) => (
                  <input key={k} value={it[k] ?? ""} placeholder={k} onChange={(e) => upd(list.path, items.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} className="input !py-2" />
                ))}
                <button onClick={() => upd(list.path, items.filter((_, j) => j !== i))} className="skeuo-icon-soft h-9 w-9 text-hot" aria-label="Remove">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => upd(list.path, [...items, list.path === "stats" ? { icon: "Star", value: "", zh: "", en: "" } : { icon: "Star", zh: "", en: "" }])} className="skeuo-btn-light flex items-center gap-1 self-start px-3 py-1.5 text-[12.5px]">
              <Plus size={13} /> Add
            </button>
          </div>
        )}
        <div className="flex items-center gap-3 border-t border-white/70 pt-4">
          <button onClick={save} disabled={busy} className="skeuo-btn flex items-center gap-1.5 px-6 py-2.5 text-[14px]">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save settings
          </button>
          {msg && <span className={clsx("text-[13px] font-medium", msg.ok ? "text-emerald-600" : "text-hot")}>{msg.text}</span>}
        </div>
      </div>
    </div>
  );
}
