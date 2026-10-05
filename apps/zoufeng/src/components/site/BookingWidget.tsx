"use client";

import { ArrowRight, ArrowUpDown, CalendarDays, ChevronDown, Clock, MapPin, Minus, Plus, Search, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Icon } from "@/lib/icons";
import type { Lang } from "@/lib/i18n";

export interface WidgetCategory {
  id: number;
  slug: string;
  name: string;
  short: string;
  icon: string;
  color: string;
  pricingMode: string;
}
export interface WidgetRoute {
  id: number;
  from: string;
  to: string;
  categorySlug: string | null;
}
export interface WidgetInitial {
  category?: string;
  pickup?: string;
  dropoff?: string;
  at?: string;
  pax?: number;
  bags?: number;
  hours?: number;
  days?: number;
}

const L = {
  pickup: { zh: "上車地點", en: "Pickup" },
  pickupPh: { zh: "請輸入上車地點", en: "Enter pickup location" },
  dropoff: { zh: "目的地", en: "Destination" },
  dropoffPh: { zh: "請輸入目的地", en: "Enter destination" },
  returnPh: { zh: "還車地點（選填）", en: "Return location (optional)" },
  date: { zh: "日期與時間", en: "Date & time" },
  pax: { zh: "乘客與行李", en: "Passengers & luggage" },
  hours: { zh: "包車時數", en: "Hours" },
  days: { zh: "租用天數", en: "Rental days" },
  search: { zh: "搜尋車輛", en: "Search vehicles" },
  quick: { zh: "常用路線", en: "Popular" },
  person: { zh: "位乘客", en: "pax" },
  bag: { zh: "件行李", en: "bags" },
  hourUnit: { zh: "小時", en: "h" },
  dayUnit: { zh: "天", en: "days" },
  pickupRequired: { zh: "請輸入上車地點", en: "Please enter a pickup location" },
};

function defaultAt() {
  const d = new Date(Date.now() + 24 * 3600_000);
  d.setMinutes(0, 0, 0);
  d.setHours(10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Counter({ value, set, min, max, label }: { value: number; set: (n: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={`- ${label}`} onClick={() => set(Math.max(min, value - 1))} className="skeuo-btn-light grid h-6 w-6 place-items-center !rounded-full">
        <Minus size={11} />
      </button>
      <span className="min-w-5 text-center text-[13px] font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label={`+ ${label}`} onClick={() => set(Math.min(max, value + 1))} className="skeuo-btn-light grid h-6 w-6 place-items-center !rounded-full">
        <Plus size={11} />
      </button>
      <span className="text-[12px] text-muted">{label}</span>
    </div>
  );
}

export function BookingWidget({
  lang,
  categories,
  routes,
  initial,
  compact,
}: {
  lang: Lang;
  categories: WidgetCategory[];
  routes: WidgetRoute[];
  initial?: WidgetInitial;
  compact?: boolean;
}) {
  const router = useRouter();
  const [cat, setCat] = useState(initial?.category && categories.some((c) => c.slug === initial.category) ? initial.category : categories[0]?.slug);
  const [pickup, setPickup] = useState(initial?.pickup ?? "");
  const [dropoff, setDropoff] = useState(initial?.dropoff ?? "");
  const [at, setAt] = useState(initial?.at || defaultAt());
  const [pax, setPax] = useState(initial?.pax ?? 2);
  const [bags, setBags] = useState(initial?.bags ?? 2);
  const [hours, setHours] = useState(initial?.hours ?? 4);
  const [days, setDays] = useState(initial?.days ?? 1);
  const [showPax, setShowPax] = useState(false);
  const [err, setErr] = useState("");
  const current = categories.find((c) => c.slug === cat);
  const mode = current?.pricingMode ?? "distance";
  const tr = (k: keyof typeof L) => L[k][lang];

  const quick = useMemo(() => {
    const forCat = routes.filter((r) => r.categorySlug === cat);
    return (forCat.length ? forCat : routes).slice(0, 5);
  }, [routes, cat]);

  const submit = (e?: React.FormEvent, override?: { pickup: string; dropoff: string }) => {
    e?.preventDefault();
    const p = override?.pickup ?? pickup;
    const d = override?.dropoff ?? dropoff;
    if (!p.trim()) {
      setErr(tr("pickupRequired"));
      return;
    }
    const q = new URLSearchParams({ category: cat ?? "", pickup: p, dropoff: d, at, pax: String(pax), bags: String(bags) });
    if (mode === "hourly") q.set("hours", String(hours));
    if (mode === "daily") q.set("days", String(days));
    router.push(`/booking?${q.toString()}`);
  };

  return (
    <form onSubmit={submit} className={clsx("glass-strong rounded-[28px] p-3 sm:p-4", compact ? "" : "shadow-2xl")}>
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-3" role="tablist">
        {categories.map((c) => {
          const on = c.slug === cat;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={on}
              key={c.id}
              onClick={() => setCat(c.slug)}
              className={clsx(
                "flex min-w-fit flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 transition-all",
                on
                  ? "bg-gradient-to-br from-[#bff3f0] via-[#c9eefc] to-[#d7e4ff] text-[#0b2a5a] shadow-[inset_0_1px_0_#fff,0_8px_18px_rgba(25,195,230,0.3)] ring-1 ring-white"
                  : "text-[#2c3758] hover:bg-white/60",
              )}
            >
              <Icon name={c.icon} size={20} />
              <span className="text-left leading-tight">
                <span className="block whitespace-nowrap text-[13.5px] font-bold">{c.name}</span>
                {on && <span className="block whitespace-nowrap text-[10.5px] opacity-75">{c.short}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="neu-flat flex flex-1 items-center gap-2.5 !rounded-2xl bg-white/80 px-3.5 py-2.5">
            <MapPin size={18} className="shrink-0 text-hot" />
            <span className="w-full min-w-0">
              <span className="block text-[11px] text-muted">{tr("pickup")}</span>
              <input value={pickup} onChange={(e) => (setPickup(e.target.value), setErr(""))} placeholder={tr("pickupPh")} className="field-input text-[13.5px]" list="zf-places" />
            </span>
          </label>
          {mode !== "hourly" && (
            <>
              <button type="button" onClick={() => (setPickup(dropoff), setDropoff(pickup))} aria-label="Swap" className="skeuo-btn-light grid h-10 w-10 shrink-0 place-items-center self-center !rounded-full text-brand">
                <ArrowUpDown size={15} />
              </button>
              <label className="neu-flat flex flex-1 items-center gap-2.5 !rounded-2xl bg-white/80 px-3.5 py-2.5">
                <MapPin size={18} className="shrink-0 text-hot" />
                <span className="w-full min-w-0">
                  <span className="block text-[11px] text-muted">{tr("dropoff")}</span>
                  <input value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder={mode === "daily" ? tr("returnPh") : tr("dropoffPh")} className="field-input text-[13.5px]" list="zf-places" />
                </span>
              </label>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="neu-flat flex items-center gap-2.5 !rounded-2xl bg-white/80 px-3.5 py-2.5 lg:w-[210px]">
            <CalendarDays size={18} className="shrink-0 text-hot" />
            <span className="w-full">
              <span className="block text-[11px] text-muted">{tr("date")}</span>
              <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="field-input text-[13px]" required />
            </span>
          </label>
          <div className="neu-flat relative flex items-center gap-2.5 !rounded-2xl bg-white/80 px-3.5 py-2.5 lg:w-[190px]">
            {mode === "hourly" || mode === "daily" ? <Clock size={18} className="shrink-0 text-ink" /> : <UsersRound size={18} className="shrink-0 text-ink" />}
            <button type="button" onClick={() => setShowPax((v) => !v)} className="w-full text-left" aria-expanded={showPax}>
              <span className="block text-[11px] text-muted">{mode === "hourly" ? tr("hours") : mode === "daily" ? tr("days") : tr("pax")}</span>
              <span className="flex items-center justify-between gap-1 whitespace-nowrap text-[13px] font-medium">
                {mode === "hourly"
                  ? `${hours} ${tr("hourUnit")} · ${pax} ${tr("person")}`
                  : mode === "daily"
                    ? `${days} ${tr("dayUnit")} · ${pax} ${tr("person")}`
                    : `${pax} ${tr("person")}・${bags} ${tr("bag")}`}
                <ChevronDown size={14} />
              </span>
            </button>
            {showPax && (
              <div className="glass-strong absolute right-0 top-full z-50 mt-2 flex w-[230px] flex-col gap-3 rounded-2xl p-4">
                <Counter value={pax} set={setPax} min={1} max={55} label={tr("person")} />
                <Counter value={bags} set={setBags} min={0} max={40} label={tr("bag")} />
                {mode === "hourly" && <Counter value={hours} set={setHours} min={4} max={12} label={tr("hourUnit")} />}
                {mode === "daily" && <Counter value={days} set={setDays} min={1} max={30} label={tr("dayUnit")} />}
                <button type="button" onClick={() => setShowPax(false)} className="skeuo-btn-light py-1.5 text-[12px]">
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
        <button type="submit" className="skeuo-btn flex min-h-[54px] items-center justify-center gap-2 px-7 text-[16px] lg:min-w-[190px]">
          <Search size={18} />
          {tr("search")}
          <ArrowRight size={18} />
        </button>
      </div>
      {err && <p className="mt-2 px-2 text-[12px] font-medium text-hot">{err}</p>}

      {quick.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-[12px]">
          <span className="font-semibold text-[#2c3758]">{tr("quick")}：</span>
          {quick.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => {
                setPickup(r.from);
                setDropoff(r.to);
                submit(undefined, { pickup: r.from, dropoff: r.to });
              }}
              className="neu-press rounded-full bg-white/70 px-3 py-1 font-medium text-[#33405f] shadow-[0_2px_6px_rgba(100,120,170,0.18)] ring-1 ring-white"
            >
              {r.from} → {r.to}
            </button>
          ))}
        </div>
      )}
      <datalist id="zf-places">
        {Array.from(new Set(routes.flatMap((r) => [r.from, r.to]))).map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </form>
  );
}
