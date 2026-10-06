import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { defaultSettings } from "@/lib/settings-shape";
import { estimateTrip, quoteVehicle } from "@/lib/pricing";
import * as s from "./schema";

type DB = LibSQLDatabase<typeof s>;

function rng(seedN: number) {
  let a = seedN;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function seed(db: DB) {
  await db.transaction(
    async (tx) => {
      const [{ n }] = await tx.select({ n: count() }).from(s.admins);
      if (n > 0) return;
      await seedAll(tx as unknown as DB);
    },
    { behavior: "immediate" },
  );
}

async function seedAll(db: DB) {
  const prod = process.env.NODE_ENV === "production";
  if (prod && !process.env.ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD environment variable is required to create the initial admin in production");
  const rand = rng(20260924);
  const pickOne = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  await db.insert(s.settings).values({ key: "site", value: JSON.stringify(defaultSettings) });
  await db.insert(s.admins).values({
    name: "Administrator",
    email: (process.env.ADMIN_EMAIL || "admin@fleetos.tw").toLowerCase(),
    passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin12345", 10),
    role: "owner",
  });

  await db.insert(s.navItems).values([
    { labelZh: "首頁", labelEn: "Home", href: "/", icon: "Home", sortOrder: 1 },
    { labelZh: "預訂行程", labelEn: "Book a ride", href: "/booking", icon: "CalendarCheck", sortOrder: 2 },
    { labelZh: "機場接送", labelEn: "Airport transfer", href: "/services/airport", icon: "Plane", sortOrder: 3 },
    { labelZh: "包車旅遊", labelEn: "Chartered tours", href: "/services/chauffeur", icon: "CarFront", sortOrder: 4 },
    { labelZh: "企業用車", labelEn: "Corporate", href: "/services/group", icon: "Building2", sortOrder: 5 },
    { labelZh: "車隊介紹", labelEn: "Our fleet", href: "/fleet", icon: "Car", sortOrder: 6 },
    { labelZh: "探索台灣", labelEn: "Explore Taiwan", href: "/explore", icon: "ShieldCheck", sortOrder: 7 },
    { labelZh: "優惠活動", labelEn: "Promotions", href: "/promotions", icon: "Gift", sortOrder: 8 },
    { labelZh: "幫助中心", labelEn: "Help center", href: "/help", icon: "CircleHelp", sortOrder: 9 },
    { labelZh: "會員中心", labelEn: "My account", href: "/account", icon: "UserRound", location: "footer", sortOrder: 1 },
    { labelZh: "旅客評價", labelEn: "Reviews", href: "/reviews", icon: "Star", location: "footer", sortOrder: 2 },
    { labelZh: "聯絡我們", labelEn: "Contact", href: "/help#contact", icon: "Mail", location: "footer", sortOrder: 3 },
    { labelZh: "管理後台", labelEn: "Admin", href: "/admin", icon: "LayoutGrid", location: "footer", sortOrder: 4 },
  ]);

  const cats = await db
    .insert(s.categories)
    .values([
      { slug: "airport", nameZh: "機場接送", nameEn: "Airport Transfer", shortZh: "(機場 → 地點)", shortEn: "(Airport ↔ City)", subtitleZh: "準時・舒適・安心", subtitleEn: "Punctual · Comfortable · Safe", descriptionZh: "航班即時追蹤、免費等候 60 分鐘，專業司機舉牌接機，讓您一下飛機就能輕鬆上路。", descriptionEn: "Live flight tracking, 60 minutes free waiting and meet & greet so you can relax from the moment you land.", icon: "Plane", color: "#3b82f6", image: "/seed/category-airport.jpg", pricingMode: "distance", sortOrder: 1 },
      { slug: "point-to-point", nameZh: "地點對地點", nameEn: "Point to Point", shortZh: "(A → B)", shortEn: "(A → B)", subtitleZh: "城市之間・隨心出發", subtitleEn: "City to city, on your schedule", descriptionZh: "市區、城際、高鐵站接駁，一口價透明計費，無隱藏費用。", descriptionEn: "Urban, intercity and HSR station transfers with transparent fixed pricing.", icon: "MapPin", color: "#f59e0b", image: "/seed/category-p2p.jpg", pricingMode: "distance", sortOrder: 2 },
      { slug: "self-drive", nameZh: "無司機租車", nameEn: "Self-drive Rental", shortZh: "(自駕)", shortEn: "(Self-drive)", subtitleZh: "自由駕駛・彈性租期", subtitleEn: "Drive freely, flexible terms", descriptionZh: "全新車款、全險方案、甲租乙還，自由探索寶島。", descriptionEn: "New vehicles, full insurance and one-way rentals to explore Taiwan freely.", icon: "Car", color: "#10b981", image: "/seed/category-self-drive.jpg", pricingMode: "daily", sortOrder: 3 },
      { slug: "chauffeur", nameZh: "有司機包車", nameEn: "Chauffeured Charter", shortZh: "(包車)", shortEn: "(Charter)", subtitleZh: "專屬司機・高端體驗", subtitleEn: "Private driver, premium experience", descriptionZh: "半日、全日、多日包車旅遊，司機兼導遊，行程客製化。", descriptionEn: "Half-day, full-day and multi-day charters with driver-guides and custom itineraries.", icon: "UserRound", color: "#ef4444", image: "/seed/category-chauffeur.jpg", pricingMode: "hourly", sortOrder: 4 },
      { slug: "group", nameZh: "團體運輸", nameEn: "Group Transport", shortZh: "(中巴・大巴)", shortEn: "(Coaches)", subtitleZh: "中巴・大巴・企業接送", subtitleEn: "Minibus · Coach · Corporate", descriptionZh: "企業通勤、員工旅遊、旅行團與校園活動，專業調度一次搞定。", descriptionEn: "Corporate commutes, company trips, tour groups and school events — fully managed.", icon: "Bus", color: "#6366f1", image: "/seed/category-group.jpg", pricingMode: "distance", sortOrder: 5 },
      { slug: "events", nameZh: "特殊活動", nameEn: "Special Events", shortZh: "(婚禮・VIP)", shortEn: "(Weddings · VIP)", subtitleZh: "婚禮・會議・VIP接待", subtitleEn: "Weddings · Conferences · VIP", descriptionZh: "禮車佈置、會議接駁、貴賓禮遇，為重要時刻增添光彩。", descriptionEn: "Decorated wedding cars, conference shuttles and VIP hospitality for important moments.", icon: "Sparkles", color: "#ec4899", image: "/seed/category-event.jpg", pricingMode: "hourly", sortOrder: 6 },
    ])
    .returning();
  const cat = Object.fromEntries(cats.map((c) => [c.slug, c]));

  const subs = await db
    .insert(s.subcategories)
    .values([
      { categoryId: cat.airport.id, slug: "pickup", nameZh: "接機", nameEn: "Airport pickup", descriptionZh: "機場 → 市區，含舉牌與 60 分鐘免費等候", descriptionEn: "Airport → city with meet & greet and 60 min free waiting", image: "/seed/taoyuan-airport.jpg", priceMultiplier: 1, sortOrder: 1 },
      { categoryId: cat.airport.id, slug: "dropoff", nameZh: "送機", nameEn: "Airport drop-off", descriptionZh: "市區 → 機場，準時抵達不誤點", descriptionEn: "City → airport, always on time", image: "/seed/taipei-skyline.jpg", priceMultiplier: 0.95, sortOrder: 2 },
      { categoryId: cat.airport.id, slug: "vip", nameZh: "VIP 快速通關", nameEn: "VIP fast track", descriptionZh: "專人協助通關與行李服務", descriptionEn: "Dedicated fast-track and porter service", image: "/seed/taipei-101-night.jpg", priceMultiplier: 1.5, sortOrder: 3 },
      { categoryId: cat["point-to-point"].id, slug: "city", nameZh: "市區接送", nameEn: "City ride", descriptionZh: "市區內點對點接送", descriptionEn: "Point-to-point rides within the city", image: "/seed/taipei-skyline.jpg", priceMultiplier: 1, sortOrder: 1 },
      { categoryId: cat["point-to-point"].id, slug: "intercity", nameZh: "城際接送", nameEn: "Intercity", descriptionZh: "跨縣市長途接送", descriptionEn: "Long-distance intercity transfers", image: "/seed/taichung.jpg", priceMultiplier: 1, sortOrder: 2 },
      { categoryId: cat["point-to-point"].id, slug: "hsr", nameZh: "高鐵站接送", nameEn: "HSR station", descriptionZh: "高鐵站與飯店之間快速接駁", descriptionEn: "Fast HSR station to hotel shuttles", image: "/seed/kaohsiung.jpg", priceMultiplier: 0.9, sortOrder: 3 },
      { categoryId: cat["self-drive"].id, slug: "daily", nameZh: "日租", nameEn: "Daily", descriptionZh: "1-6 天彈性租用", descriptionEn: "Flexible 1-6 day rental", image: "/seed/category-self-drive.jpg", priceMultiplier: 1, sortOrder: 1 },
      { categoryId: cat["self-drive"].id, slug: "weekly", nameZh: "週租", nameEn: "Weekly", descriptionZh: "7 天以上享 85 折", descriptionEn: "7+ days at 15% off", image: "/seed/kenting.jpg", priceMultiplier: 0.85, sortOrder: 2 },
      { categoryId: cat["self-drive"].id, slug: "monthly", nameZh: "月租", nameEn: "Monthly", descriptionZh: "長租方案享 7 折", descriptionEn: "Long-term rental at 30% off", image: "/seed/qingshui-cliff.jpg", priceMultiplier: 0.7, sortOrder: 3 },
      { categoryId: cat.chauffeur.id, slug: "half-day", nameZh: "半日包車", nameEn: "Half-day charter", descriptionZh: "4 小時市區或近郊旅遊", descriptionEn: "4-hour city or suburban tour", image: "/seed/jiufen.jpg", priceMultiplier: 1, sortOrder: 1 },
      { categoryId: cat.chauffeur.id, slug: "full-day", nameZh: "全日包車", nameEn: "Full-day charter", descriptionZh: "8 小時深度旅遊享 95 折", descriptionEn: "8-hour in-depth tour at 5% off", image: "/seed/sun-moon-lake.jpg", priceMultiplier: 0.95, sortOrder: 2 },
      { categoryId: cat.chauffeur.id, slug: "multi-day", nameZh: "多日旅遊", nameEn: "Multi-day tour", descriptionZh: "環島與多日行程客製化", descriptionEn: "Round-island and custom multi-day trips", image: "/seed/taroko.jpg", priceMultiplier: 0.9, sortOrder: 3 },
      { categoryId: cat.group.id, slug: "corporate", nameZh: "企業通勤", nameEn: "Corporate commute", descriptionZh: "員工上下班固定班次", descriptionEn: "Scheduled staff shuttles", image: "/seed/tour-bus.jpg", priceMultiplier: 1, sortOrder: 1 },
      { categoryId: cat.group.id, slug: "tour", nameZh: "旅行團", nameEn: "Tour group", descriptionZh: "團體旅遊專車", descriptionEn: "Dedicated coaches for tour groups", image: "/seed/alishan.jpg", priceMultiplier: 1, sortOrder: 2 },
      { categoryId: cat.group.id, slug: "campus", nameZh: "校園活動", nameEn: "School events", descriptionZh: "校外教學與畢業旅行", descriptionEn: "Field trips and graduation tours", image: "/seed/kenting.jpg", priceMultiplier: 0.95, sortOrder: 3 },
      { categoryId: cat.events.id, slug: "wedding", nameZh: "婚禮禮車", nameEn: "Wedding car", descriptionZh: "含禮車佈置與白手套司機", descriptionEn: "Includes decoration and white-glove chauffeur", image: "/seed/category-event.jpg", priceMultiplier: 1.3, sortOrder: 1 },
      { categoryId: cat.events.id, slug: "conference", nameZh: "會議接待", nameEn: "Conference shuttle", descriptionZh: "會展與論壇貴賓接駁", descriptionEn: "Expo and forum guest shuttles", image: "/seed/taipei-101-night.jpg", priceMultiplier: 1.1, sortOrder: 2 },
      { categoryId: cat.events.id, slug: "vip", nameZh: "VIP 接待", nameEn: "VIP reception", descriptionZh: "政商貴賓全程禮遇", descriptionEn: "Full white-glove hospitality for VIPs", image: "/seed/taipei-skyline.jpg", priceMultiplier: 1.5, sortOrder: 3 },
    ])
    .returning();

  const types = await db
    .insert(s.vehicleTypes)
    .values([
      { slug: "sedan", nameZh: "轎車", nameEn: "Sedan", sortOrder: 1 },
      { slug: "suv", nameZh: "SUV", nameEn: "SUV", sortOrder: 2 },
      { slug: "mpv", nameZh: "MPV", nameEn: "MPV", sortOrder: 3 },
      { slug: "business", nameZh: "商務車", nameEn: "Business van", sortOrder: 4 },
      { slug: "minibus", nameZh: "中巴", nameEn: "Minibus", sortOrder: 5 },
      { slug: "coach", nameZh: "大巴", nameEn: "Coach", sortOrder: 6 },
    ])
    .returning();
  const ty = Object.fromEntries(types.map((t) => [t.slug, t.id]));

  const vehicles = await db
    .insert(s.vehicles)
    .values([
      { typeId: ty.sedan, nameZh: "豪華轎車", nameEn: "Luxury Sedan", model: "Mercedes-Benz E-Class 或同級", image: "/seed/vehicle-sedan.png", minPassengers: 1, maxPassengers: 4, luggage: 3, basePrice: 1280, perKm: 28, perHour: 650, perDay: 2800, featuresZh: "真皮座椅,免費 Wi-Fi,瓶裝水,手機充電", featuresEn: "Leather seats,Free Wi-Fi,Bottled water,Phone charging", sortOrder: 1 },
      { typeId: ty.suv, nameZh: "頂級休旅車", nameEn: "Premium SUV", model: "Lexus RX 或同級", image: "/seed/vehicle-van-premium.png", minPassengers: 1, maxPassengers: 6, luggage: 4, basePrice: 1580, perKm: 32, perHour: 750, perDay: 3500, featuresZh: "寬敞空間,全景天窗,免費 Wi-Fi,兒童座椅", featuresEn: "Spacious cabin,Panoramic roof,Free Wi-Fi,Child seat", sortOrder: 2 },
      { typeId: ty.mpv, nameZh: "豪華 MPV", nameEn: "Luxury MPV", model: "Toyota Alphard 或同級", image: "/seed/vehicle-mpv.png", minPassengers: 1, maxPassengers: 7, luggage: 5, basePrice: 1980, perKm: 36, perHour: 850, perDay: 4200, featuresZh: "航空座椅,電動滑門,氛圍燈,USB 充電", featuresEn: "Captain seats,Power sliding doors,Ambient lighting,USB charging", sortOrder: 3 },
      { typeId: ty.business, nameZh: "商務箱型車", nameEn: "Business Van", model: "Mercedes-Benz V-Class 或同級", image: "/seed/vehicle-business-van.png", minPassengers: 1, maxPassengers: 10, luggage: 8, basePrice: 2280, perKm: 40, perHour: 950, perDay: 4800, featuresZh: "會議座位,大行李空間,免費 Wi-Fi,冰箱", featuresEn: "Conference seating,Large luggage space,Free Wi-Fi,Fridge", sortOrder: 4 },
      { typeId: ty.minibus, nameZh: "中巴", nameEn: "Minibus", model: "Toyota Coaster 或同級", image: "/seed/vehicle-minibus.png", minPassengers: 10, maxPassengers: 20, luggage: 15, basePrice: 4980, perKm: 60, perHour: 1600, perDay: 9800, featuresZh: "麥克風系統,冷氣空調,行李艙", featuresEn: "PA system,Air conditioning,Luggage hold", sortOrder: 5 },
      { typeId: ty.coach, nameZh: "大巴", nameEn: "Coach", model: "Volvo B11R 或同級", image: "/seed/vehicle-coach.png", minPassengers: 20, maxPassengers: 45, luggage: 40, basePrice: 8680, perKm: 80, perHour: 2400, perDay: 15800, featuresZh: "影音設備,USB 充電,大型行李艙,安全帶", featuresEn: "AV system,USB charging,Large luggage hold,Seat belts", sortOrder: 6 },
    ])
    .returning();

  const routes = await db
    .insert(s.routes)
    .values([
      { fromZh: "台北", fromEn: "Taipei", toZh: "桃園國際機場 (TPE)", toEn: "Taoyuan Airport (TPE)", categoryId: cat.airport.id, durationMin: 38, distanceKm: 34, price: 1280, image: "/seed/taoyuan-airport.jpg", descriptionZh: "台北市區直達桃園機場第一、二航廈。", descriptionEn: "Direct from downtown Taipei to TPE terminals 1 & 2.", sortOrder: 1, quickLink: true },
      { fromZh: "台北", fromEn: "Taipei", toZh: "九份", toEn: "Jiufen", categoryId: cat["point-to-point"].id, durationMin: 40, distanceKm: 36, price: 1580, image: "/seed/jiufen.jpg", descriptionZh: "山城老街、紅燈籠夜景，神隱少女的靈感來源。", descriptionEn: "Lantern-lit mountain old street that inspired Spirited Away.", sortOrder: 2, quickLink: true },
      { fromZh: "台中", fromEn: "Taichung", toZh: "日月潭", toEn: "Sun Moon Lake", categoryId: cat["point-to-point"].id, durationMin: 70, distanceKm: 78, price: 2480, image: "/seed/sun-moon-lake.jpg", descriptionZh: "台灣最美高山湖泊，環湖單車與遊艇。", descriptionEn: "Taiwan's most beautiful alpine lake — cycling and boat tours.", sortOrder: 3 },
      { fromZh: "高雄", fromEn: "Kaohsiung", toZh: "高雄國際機場 (KHH)", toEn: "Kaohsiung Airport (KHH)", categoryId: cat.airport.id, durationMin: 30, distanceKm: 22, price: 980, image: "/seed/kaohsiung.jpg", descriptionZh: "高雄市區快速往返小港機場。", descriptionEn: "Fast transfers between downtown Kaohsiung and KHH.", sortOrder: 4, quickLink: true },
      { fromZh: "花蓮", fromEn: "Hualien", toZh: "太魯閣國家公園", toEn: "Taroko National Park", categoryId: cat.chauffeur.id, durationMin: 50, distanceKm: 42, price: 1880, image: "/seed/taroko.jpg", descriptionZh: "大理石峽谷、燕子口與長春祠。", descriptionEn: "Marble canyons, Swallow Grotto and Eternal Spring Shrine.", sortOrder: 5 },
      { fromZh: "高雄", fromEn: "Kaohsiung", toZh: "墾丁", toEn: "Kenting", categoryId: cat["point-to-point"].id, durationMin: 80, distanceKm: 90, price: 2680, image: "/seed/kenting.jpg", descriptionZh: "南國陽光沙灘，鵝鑾鼻燈塔。", descriptionEn: "Tropical beaches and Eluanbi Lighthouse.", sortOrder: 6 },
      { fromZh: "台中", fromEn: "Taichung", toZh: "清泉崗機場 (RMQ)", toEn: "Taichung Airport (RMQ)", categoryId: cat.airport.id, durationMin: 25, distanceKm: 18, price: 880, image: "/seed/taichung.jpg", sortOrder: 7, popular: false, quickLink: true },
      { fromZh: "台北", fromEn: "Taipei", toZh: "日月潭", toEn: "Sun Moon Lake", categoryId: cat.chauffeur.id, durationMin: 180, distanceKm: 182, price: 5800, image: "/seed/sun-moon-lake.jpg", sortOrder: 8, popular: false, quickLink: true },
      { fromZh: "嘉義", fromEn: "Chiayi", toZh: "阿里山", toEn: "Alishan", categoryId: cat.chauffeur.id, durationMin: 120, distanceKm: 72, price: 3280, image: "/seed/alishan.jpg", descriptionZh: "神木、雲海與日出小火車。", descriptionEn: "Giant trees, sea of clouds and the sunrise railway.", sortOrder: 9, popular: false },
      { fromZh: "花蓮", fromEn: "Hualien", toZh: "清水斷崖", toEn: "Qingshui Cliff", categoryId: cat.chauffeur.id, durationMin: 40, distanceKm: 30, price: 1480, image: "/seed/qingshui-cliff.jpg", descriptionZh: "太平洋海岸最壯觀的斷崖景觀。", descriptionEn: "The most dramatic cliffs on the Pacific coast.", sortOrder: 10, popular: false },
    ])
    .returning();

  const driverNames = ["陳志明", "林建宏", "黃俊傑", "張家豪", "李宗翰", "王文彬", "吳承恩", "劉冠廷", "蔡明哲", "楊凱文"];
  const drivers = await db
    .insert(s.drivers)
    .values(
      driverNames.map((name, i) => ({
        name,
        phone: `09${String(12345678 + i * 1111111).slice(0, 8)}`,
        licenseNo: `TW-PRO-${1000 + i * 37}`,
        vehicleId: vehicles[i % vehicles.length].id,
        plateNumber: `RAB-${(2301 + i * 113).toString().slice(0, 4)}`,
        languages: i % 3 === 0 ? "中文, English, 日本語" : i % 2 ? "中文, English" : "中文, 台語",
        rating: Math.round((4.6 + rand() * 0.4) * 10) / 10,
        status: i % 4 === 3 ? "off" : "available",
      })),
    )
    .returning();

  const surnames = ["陳", "林", "黃", "張", "李", "王", "吳", "劉", "蔡", "楊", "許", "鄭", "謝", "郭", "洪"];
  const given = ["怡君", "雅婷", "志豪", "家瑋", "淑芬", "冠宇", "佩珊", "承翰", "詩涵", "柏翰", "欣怡", "俊宏"];
  const pw = await bcrypt.hash(prod ? crypto.randomUUID() + crypto.randomUUID() : "password123", 10);
  const customerRows = Array.from({ length: 48 }, (_, i) => {
    const name = surnames[i % surnames.length] + given[(i * 7) % given.length];
    return { name, email: `customer${i + 1}@example.com`, phone: `09${String(20000000 + i * 1234567).slice(0, 8)}`, passwordHash: pw };
  });
  if (!prod) customerRows.unshift({ name: "Demo Customer", email: "demo@fleetos.tw", phone: "0912345678", passwordHash: pw });
  const customers = await db.insert(s.customers).values(customerRows).returning();

  const now = Date.now();
  const promos = await db
    .insert(s.promotions)
    .values([
      { code: "WELCOME10", titleZh: "新會員首趟 9 折", titleEn: "10% off your first ride", descriptionZh: "首次預訂任一服務即享 9 折優惠。", descriptionEn: "Get 10% off any service on your first booking.", image: "/seed/taipei-skyline.jpg", discountType: "percent", discountValue: 10, minAmount: 0, startsAt: new Date(now - 30 * 864e5).toISOString().slice(0, 10), endsAt: new Date(now + 90 * 864e5).toISOString().slice(0, 10) },
      { code: "AIRPORT200", titleZh: "機場接送折 NT$200", titleEn: "NT$200 off airport transfers", descriptionZh: "機場接送滿 NT$1,000 現折 200 元。", descriptionEn: "NT$200 off airport transfers over NT$1,000.", image: "/seed/taoyuan-airport.jpg", discountType: "fixed", discountValue: 200, minAmount: 1000, startsAt: new Date(now - 10 * 864e5).toISOString().slice(0, 10), endsAt: new Date(now + 60 * 864e5).toISOString().slice(0, 10) },
      { code: "TOUR15", titleZh: "包車旅遊 85 折", titleEn: "15% off chartered tours", descriptionZh: "全日包車享 85 折，探索台灣好風光。", descriptionEn: "15% off full-day charters across Taiwan.", image: "/seed/sun-moon-lake.jpg", discountType: "percent", discountValue: 15, minAmount: 3000, startsAt: new Date(now - 5 * 864e5).toISOString().slice(0, 10), endsAt: new Date(now + 45 * 864e5).toISOString().slice(0, 10) },
    ])
    .returning();

  await db.insert(s.reviews).values([
    { name: "陳小姐", rating: 5, content: "司機準時在機場舉牌等候，車內乾淨舒適，下次還會再預訂！", trip: "桃園機場 → 台北" },
    { name: "Michael T.", rating: 5, content: "Fantastic chauffeur service around Taroko. Our driver spoke great English and knew all the best spots.", trip: "Hualien → Taroko" },
    { name: "林先生", rating: 5, content: "公司年度旅遊包了兩台大巴，調度非常專業，全程順暢。", trip: "團體運輸" },
    { name: "Yuki S.", rating: 4, content: "九份の夜景が最高でした。運転手さんも親切でした。", trip: "Taipei → Jiufen" },
    { name: "黃太太", rating: 5, content: "婚禮禮車佈置得很漂亮，司機穿著正式又有禮貌。", trip: "婚禮禮車" },
    { name: "David L.", rating: 5, content: "Booked a V-Class for a business delegation. Spotless vehicle and very professional.", trip: "Business Van" },
  ]);

  await db.insert(s.faqs).values([
    { groupZh: "預訂", groupEn: "Booking", questionZh: "如何預訂行程？", questionEn: "How do I book a ride?", answerZh: "於首頁選擇服務類型、輸入上車地點與目的地、日期時間後點選「搜尋車輛」，選擇車型並填寫聯絡資訊即可完成預訂。", answerEn: "Choose a service on the home page, enter pickup, destination and time, click “Search vehicles”, pick a vehicle and fill in your contact details.", sortOrder: 1 },
    { groupZh: "預訂", groupEn: "Booking", questionZh: "需要註冊會員才能預訂嗎？", questionEn: "Do I need an account to book?", answerZh: "不需要，訪客也可以直接預訂；註冊會員可在會員中心查看所有訂單。", answerEn: "No — guests can book directly. Members can see all bookings in their account.", sortOrder: 2 },
    { groupZh: "機場接送", groupEn: "Airport", questionZh: "航班延誤怎麼辦？", questionEn: "What if my flight is delayed?", answerZh: "我們會即時追蹤航班，接機服務提供 60 分鐘免費等候，延誤不另收費。", answerEn: "We track your flight live and include 60 minutes free waiting — delays cost nothing extra.", sortOrder: 3 },
    { groupZh: "付款", groupEn: "Payment", questionZh: "有哪些付款方式？", questionEn: "Which payment methods are accepted?", answerZh: "支援現金、信用卡與 LINE Pay。企業客戶可申請月結。", answerEn: "Cash, credit card and LINE Pay. Corporate clients can apply for monthly invoicing.", sortOrder: 4 },
    { groupZh: "付款", groupEn: "Payment", questionZh: "夜間有加價嗎？", questionEn: "Is there a night surcharge?", answerZh: "23:00 至 06:00 上車享夜間加成 20%，報價時會清楚標示。", answerEn: "Pickups between 23:00 and 06:00 carry a 20% surcharge, clearly shown in your quote.", sortOrder: 5 },
    { groupZh: "取消", groupEn: "Cancellation", questionZh: "如何取消訂單？", questionEn: "How do I cancel?", answerZh: "於訂單確認頁或會員中心點選「取消訂單」，行程前 24 小時取消免收費。", answerEn: "Use “Cancel booking” on the confirmation page or in your account. Free up to 24 hours before pickup.", sortOrder: 6 },
  ]);

  await db.insert(s.messages).values([
    { name: "王經理", email: "wang@corp.example.com", phone: "02-2345-6789", subject: "企業月結合作", body: "您好，我們公司每月約有 80 趟機場接送需求，想洽詢企業月結方案。" },
    { name: "Sarah K.", email: "sarah@example.com", subject: "Child seats", body: "Do you provide child seats for a 2-year-old on airport pickups?" },
  ]);

  // Historical bookings for dashboard charts
  const pricing = defaultSettings.pricing;
  const catWeights: [string, number][] = [["airport", 0.38], ["point-to-point", 0.22], ["chauffeur", 0.16], ["group", 0.1], ["self-drive", 0.08], ["events", 0.06]];
  const pickCat = () => {
    let r = rand();
    for (const [slug, w] of catWeights) {
      if ((r -= w) <= 0) return cat[slug];
    }
    return cat.airport;
  };
  const places = ["台北101", "台北車站", "信義區君悅酒店", "新北板橋", "桃園", "台中", "高雄", "新竹科學園區", "台南", "花蓮"];
  const rows: (typeof s.bookings.$inferInsert)[] = [];
  const DAYS = 180;
  for (let d = DAYS; d >= -10; d--) {
    const day = new Date(now - d * 864e5);
    const growth = 3 + ((DAYS - d) / DAYS) * 9;
    const weekend = [0, 5, 6].includes(day.getDay()) ? 1.35 : 1;
    const nToday = Math.max(0, Math.round(growth * weekend * (0.6 + rand() * 0.8)));
    for (let k = 0; k < nToday; k++) {
      const category = pickCat();
      const catSubs = subs.filter((x) => x.categoryId === category.id);
      const sub = pickOne(catSubs);
      const catRoutes = routes.filter((r) => r.categoryId === category.id);
      const useRoute = category.pricingMode === "distance" && catRoutes.length > 0 && rand() < 0.7;
      const route = useRoute ? pickOne(catRoutes) : null;
      const pickupStr = route ? route.fromZh : pickOne(places);
      const dropStr = route ? route.toZh : category.pricingMode === "distance" ? pickOne(places.filter((p) => p !== pickupStr)) : "";
      const isGroup = category.slug === "group";
      const pax = isGroup ? 10 + Math.floor(rand() * 30) : 1 + Math.floor(rand() * 5);
      const eligible = vehicles.filter((v) => v.maxPassengers >= pax && (isGroup || v.maxPassengers <= 10));
      const vehicle = pickOne(eligible.length ? eligible : vehicles);
      const hour = Math.floor(5 + rand() * 18);
      const at = new Date(day);
      at.setUTCHours(hour - 8, Math.floor(rand() * 4) * 15, 0, 0);
      const pickupAt = at.toISOString();
      const trip = { pickup: pickupStr, dropoff: dropStr, pickupAt, passengers: pax, luggage: Math.floor(rand() * 4), hours: category.pricingMode === "hourly" ? 4 + Math.floor(rand() * 5) : 0, days: category.pricingMode === "daily" ? 1 + Math.floor(rand() * 5) : 0 };
      const estimate = route ? { distanceKm: route.distanceKm, durationMin: route.durationMin, route } : estimateTrip([], pickupStr, dropStr);
      const q = quoteVehicle({ vehicle, vehicles, category, subcategory: sub ?? null, trip, estimate, pricing });
      const promo = rand() < 0.15 ? pickOne(promos) : null;
      const discount = promo ? Math.min(q.subtotal, promo.discountType === "fixed" ? promo.discountValue : Math.round((q.subtotal * promo.discountValue) / 1000) * 10) : 0;
      let status: string;
      if (d > 1) {
        const r = rand();
        status = r < 0.86 ? "completed" : r < 0.95 ? "cancelled" : "confirmed";
      } else if (d >= 0) {
        status = pickOne(["assigned", "in_progress", "confirmed", "completed"]);
      } else {
        status = pickOne(["pending", "pending", "confirmed", "assigned"]);
      }
      const customer = rand() < 0.75 ? pickOne(customers) : null;
      const driver = ["assigned", "in_progress", "completed"].includes(status) ? pickOne(drivers) : null;
      const created = new Date(Math.min(Date.now() - rand() * 36e5, at.getTime() - (1 + rand() * 6) * 864e5));
      rows.push({
        code: "FO" + (100000 + rows.length * 7 + Math.floor(rand() * 7)).toString(36).toUpperCase() + Math.floor(rand() * 90 + 10),
        customerId: customer?.id ?? null,
        categoryId: category.id,
        subcategoryId: sub?.id ?? null,
        vehicleId: vehicle.id,
        driverId: driver?.id ?? null,
        routeId: route?.id ?? null,
        pickup: pickupStr,
        dropoff: dropStr,
        pickupAt,
        passengers: pax,
        luggage: trip.luggage,
        hours: trip.hours,
        days: trip.days,
        distanceKm: estimate.distanceKm,
        durationMin: estimate.durationMin,
        subtotal: q.subtotal,
        discount,
        total: q.subtotal - discount,
        promoCode: promo?.code ?? "",
        contactName: customer?.name ?? pickOne(["訪客", "Guest", "張先生", "Ms. Lee"]),
        contactPhone: customer?.phone ?? "0900000000",
        contactEmail: customer?.email ?? "",
        paymentMethod: pickOne(["cash", "card", "linepay"]),
        paymentStatus: status === "completed" ? "paid" : "unpaid",
        status,
        rating: status === "completed" && rand() < 0.6 ? (rand() < 0.8 ? 5 : 4) : null,
        createdAt: created.toISOString(),
      });
    }
  }
  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(s.bookings).values(rows.slice(i, i + 200));
  }
}
