export function money(n: number, currency = "NT$"): string {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

export function duration(min: number, lang: "zh" | "en"): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (lang === "zh") return h ? `${h} 小時${m ? ` ${m} 分` : ""}` : `${m} 分鐘`;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m} min`;
}

export function formatDateTime(iso: string, lang: "zh" | "en"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === "zh" ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  });
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
