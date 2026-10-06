export interface Bilingual {
  zh: string;
  en: string;
}

export interface IconText extends Bilingual {
  icon: string;
}

export interface StatItem {
  icon: string;
  value: string;
  zh: string;
  en: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: Bilingual;
  logo: string;
  heroTitle1: Bilingual;
  heroTitle2: Bilingual;
  heroHighlight: Bilingual;
  heroSubtitle1: Bilingual;
  heroSubtitle2: Bilingual;
  heroImage: string;
  heroFeatures: IconText[];
  airportChip: { title: Bilingual; meta: Bilingual; href: string };
  weather: { city: Bilingual; latitude: number; longitude: number };
  videoUrl: string;
  videoLabel: Bilingual;
  searchPlaceholder: Bilingual;
  stats: StatItem[];
  rating: { score: string; label: Bilingual };
  app: {
    title: Bilingual;
    subtitle: Bilingual;
    appStoreUrl: string;
    playStoreUrl: string;
    qrLink: string;
  };
  promo: { title: Bilingual; subtitle: Bilingual; button: Bilingual; image: string; href: string };
  contact: { phone: string; email: string; line: string; address: Bilingual; hours: Bilingual };
  pricing: { currency: string; includedKm: number; nightSurchargePercent: number; nightStartHour: number; nightEndHour: number; minHours: number };
  footer: Bilingual;
}

export const defaultSettings: SiteSettings = {
  siteName: "ZOUFENG",
  tagline: { zh: "台灣專業移動服務", en: "Taiwan Premium Mobility" },
  logo: "",
  heroTitle1: { zh: "專業移動，", en: "Premium mobility," },
  heroTitle2: { zh: "連結更精彩的", en: "connecting a brighter" },
  heroHighlight: { zh: "台灣", en: "Taiwan" },
  heroSubtitle1: { zh: "機場接送・包車旅遊・城市接駁・企業用車", en: "Airport transfers · Chartered tours · City shuttles · Corporate rides" },
  heroSubtitle2: { zh: "讓每一段旅程都舒適、安全、值得信賴", en: "Every journey comfortable, safe and trustworthy" },
  heroImage: "/seed/hero-taipei-van.jpg",
  heroFeatures: [
    { icon: "UserRound", zh: "專業司機", en: "Pro drivers" },
    { icon: "CarFront", zh: "多元車型", en: "Diverse fleet" },
    { icon: "CalendarCheck", zh: "即時預訂", en: "Instant booking" },
    { icon: "ShieldCheck", zh: "安全保障", en: "Safety first" },
  ],
  airportChip: {
    title: { zh: "桃園國際機場 (TPE)", en: "Taoyuan Int'l Airport (TPE)" },
    meta: { zh: "38 分鐘・34 公里", en: "38 min · 34 km" },
    href: "/services/airport",
  },
  weather: { city: { zh: "台北市", en: "Taipei" }, latitude: 25.033, longitude: 121.5654 },
  videoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Timelapse-_Taipei%2C_Taiwan.webm",
  videoLabel: { zh: "觀看品牌影片", en: "Watch brand film" },
  searchPlaceholder: { zh: "搜尋目的地・景點・行程...", en: "Search destinations, sights, trips..." },
  stats: [
    { icon: "ShieldCheck", value: "10,000+", zh: "專業司機", en: "Pro drivers" },
    { icon: "Users", value: "50,000+", zh: "滿意客戶", en: "Happy customers" },
    { icon: "Clock", value: "24/7", zh: "全年客服", en: "Support" },
    { icon: "BadgeCheck", value: "100%", zh: "安全保障", en: "Safety" },
    { icon: "CarFront", value: "多元車型", zh: "滿足不同需求", en: "For every need" },
  ],
  rating: { score: "4.8", label: { zh: "來自 10,000+ 則評價", en: "from 10,000+ reviews" } },
  app: {
    title: { zh: "下載 ZOUFENG APP", en: "Get the ZOUFENG app" },
    subtitle: { zh: "隨時隨地・輕鬆預訂行程", en: "Book anytime, anywhere" },
    appStoreUrl: "https://www.apple.com/app-store/",
    playStoreUrl: "https://play.google.com/store",
    qrLink: "https://zoufeng.tw/app",
  },
  promo: {
    title: { zh: "探索台灣", en: "Explore Taiwan" },
    subtitle: { zh: "從這一程開始", en: "starts with this ride" },
    button: { zh: "探索行程", en: "Explore" },
    image: "/seed/sun-moon-lake.jpg",
    href: "/explore",
  },
  contact: {
    phone: "0800-888-168",
    email: "service@zoufeng.tw",
    line: "@zoufeng",
    address: { zh: "台北市信義區信義路五段 7 號", en: "No. 7, Sec. 5, Xinyi Rd, Taipei" },
    hours: { zh: "全年無休 24 小時", en: "24/7, all year" },
  },
  pricing: { currency: "NT$", includedKm: 10, nightSurchargePercent: 20, nightStartHour: 23, nightEndHour: 6, minHours: 4 },
  footer: { zh: "© ZOUFENG 走瘋移動 版權所有", en: "© ZOUFENG Mobility. All rights reserved." },
};

export function mergeSettings(stored: Partial<SiteSettings> | null | undefined): SiteSettings {
  const out: Record<string, unknown> = { ...defaultSettings };
  if (!stored) return out as unknown as SiteSettings;
  for (const [k, v] of Object.entries(stored)) {
    const d = (defaultSettings as unknown as Record<string, unknown>)[k];
    if (v && typeof v === "object" && !Array.isArray(v) && d && typeof d === "object" && !Array.isArray(d)) {
      out[k] = { ...(d as object), ...(v as object) };
    } else if (v !== undefined && v !== null) {
      out[k] = v;
    }
  }
  return out as unknown as SiteSettings;
}
