import { and, asc, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb, schema as s } from "@/db";
import { CUSTOMER_COOKIE, verifySession } from "./auth";
import { LANG_COOKIE, type Lang } from "./i18n";
import { mergeSettings, type SiteSettings } from "./settings-shape";

export const getLang = cache(async (): Promise<Lang> => {
  const c = await cookies();
  return c.get(LANG_COOKIE)?.value === "en" ? "en" : "zh";
});

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(s.settings.key, "site") });
  return mergeSettings(row ? JSON.parse(row.value) : null);
});

export const getCustomer = cache(async () => {
  const c = await cookies();
  const sess = await verifySession(c.get(CUSTOMER_COOKIE)?.value, "customer");
  if (!sess) return null;
  const db = await getDb();
  const user = await db.query.customers.findFirst({ where: eq(s.customers.id, Number(sess.sub)) });
  if (!user || !user.active) return null;
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
});

export async function getNav(location: "sidebar" | "footer") {
  const db = await getDb();
  return db
    .select()
    .from(s.navItems)
    .where(and(eq(s.navItems.location, location), eq(s.navItems.visible, true)))
    .orderBy(asc(s.navItems.sortOrder), asc(s.navItems.id));
}

export async function getCategories() {
  const db = await getDb();
  return db.select().from(s.categories).where(eq(s.categories.active, true)).orderBy(asc(s.categories.sortOrder), asc(s.categories.id));
}

export async function getSubcategories(categoryId?: number) {
  const db = await getDb();
  const where = categoryId
    ? and(eq(s.subcategories.active, true), eq(s.subcategories.categoryId, categoryId))
    : eq(s.subcategories.active, true);
  return db.select().from(s.subcategories).where(where).orderBy(asc(s.subcategories.sortOrder), asc(s.subcategories.id));
}

export async function getVehicles() {
  const db = await getDb();
  return db.select().from(s.vehicles).where(eq(s.vehicles.active, true)).orderBy(asc(s.vehicles.sortOrder), asc(s.vehicles.id));
}

export async function getVehicleTypes() {
  const db = await getDb();
  return db.select().from(s.vehicleTypes).where(eq(s.vehicleTypes.active, true)).orderBy(asc(s.vehicleTypes.sortOrder));
}

export async function getRoutes() {
  const db = await getDb();
  return db.select().from(s.routes).where(eq(s.routes.active, true)).orderBy(asc(s.routes.sortOrder), asc(s.routes.id));
}

export async function getActivePromotions() {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.select().from(s.promotions).where(eq(s.promotions.active, true)).orderBy(asc(s.promotions.id));
  return rows.filter((p) => (!p.startsAt || p.startsAt <= today) && (!p.endsAt || p.endsAt >= today) && (!p.usageLimit || p.usedCount < p.usageLimit));
}

export async function getReviews(limit = 50) {
  const db = await getDb();
  return db.select().from(s.reviews).where(eq(s.reviews.approved, true)).orderBy(desc(s.reviews.createdAt)).limit(limit);
}

export async function getFaqs() {
  const db = await getDb();
  return db.select().from(s.faqs).where(eq(s.faqs.active, true)).orderBy(asc(s.faqs.sortOrder));
}

export interface Weather {
  temp: number;
  code: number;
  aqi: number | null;
}

export async function getWeather(lat: number, lon: number): Promise<Weather | null> {
  try {
    const ctrl = AbortSignal.timeout(2500);
    const [w, a] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Asia%2FTaipei`, { next: { revalidate: 1800 }, signal: ctrl }).then((r) => r.json()),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`, { next: { revalidate: 3600 }, signal: ctrl })
        .then((r) => r.json())
        .catch(() => null),
    ]);
    return { temp: Math.round(w.current.temperature_2m), code: w.current.weather_code, aqi: a?.current?.us_aqi ?? null };
  } catch {
    return null;
  }
}

export function weatherText(code: number, lang: Lang): { text: string; icon: "sun" | "cloud-sun" | "cloud" | "rain" | "storm" } {
  const m: [number[], string, string, "sun" | "cloud-sun" | "cloud" | "rain" | "storm"][] = [
    [[0], "晴朗", "Clear", "sun"],
    [[1, 2], "晴時多雲", "Partly cloudy", "cloud-sun"],
    [[3, 45, 48], "多雲", "Cloudy", "cloud"],
    [[51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], "有雨", "Rain", "rain"],
    [[95, 96, 99], "雷陣雨", "Thunderstorm", "storm"],
  ];
  const hit = m.find(([codes]) => codes.includes(code)) ?? m[1];
  return { text: lang === "zh" ? hit[1] : hit[2], icon: hit[3] };
}

export function aqiText(aqi: number | null, lang: Lang): string {
  if (aqi == null) return lang === "zh" ? "空氣良好" : "Good air";
  if (aqi <= 50) return lang === "zh" ? "空氣良好" : "Good air";
  if (aqi <= 100) return lang === "zh" ? "空氣普通" : "Moderate air";
  return lang === "zh" ? "空氣不佳" : "Poor air";
}
