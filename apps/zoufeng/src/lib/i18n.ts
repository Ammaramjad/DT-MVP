export type Lang = "zh" | "en";

export const LANG_COOKIE = "zf_lang";

export function pick<T extends object>(obj: T, base: string, lang: Lang): string {
  const rec = obj as Record<string, unknown>;
  const key = base + (lang === "zh" ? "Zh" : "En");
  const v = rec[key];
  if (typeof v === "string" && v) return v;
  const other = rec[base + (lang === "zh" ? "En" : "Zh")];
  return typeof other === "string" ? other : "";
}

export function bi(v: { zh: string; en: string } | undefined, lang: Lang): string {
  if (!v) return "";
  return (lang === "zh" ? v.zh : v.en) || v.zh || v.en || "";
}

const dict = {
  login: { zh: "登入 / 註冊", en: "Sign in / Register" },
  account: { zh: "會員中心", en: "My account" },
  searchVehicles: { zh: "搜尋車輛", en: "Search vehicles" },
  pickup: { zh: "上車地點", en: "Pickup" },
  pickupPh: { zh: "請輸入上車地點", en: "Enter pickup location" },
  dropoff: { zh: "目的地", en: "Destination" },
  dropoffPh: { zh: "請輸入目的地", en: "Enter destination" },
  dateTime: { zh: "日期與時間", en: "Date & time" },
  paxLuggage: { zh: "乘客與行李", en: "Passengers & luggage" },
  passengers: { zh: "位乘客", en: "passengers" },
  passenger: { zh: "乘客", en: "Passengers" },
  luggage: { zh: "件行李", en: "bags" },
  luggageLabel: { zh: "行李", en: "Luggage" },
  hours: { zh: "包車時數", en: "Hours" },
  days: { zh: "租用天數", en: "Rental days" },
  hourUnit: { zh: "小時", en: "hours" },
  dayUnit: { zh: "天", en: "days" },
  quickRoutes: { zh: "常用路線", en: "Popular" },
  popularRoutes: { zh: "熱門路線", en: "Popular routes" },
  popularRoutesSub: { zh: "探索台灣最受歡迎的目的地", en: "Explore Taiwan's favourite destinations" },
  viewAll: { zh: "查看全部", en: "View all" },
  featuredFleet: { zh: "精選車隊", en: "Featured fleet" },
  featuredFleetSub: { zh: "多元車型・滿足不同需求", en: "Diverse vehicles for every need" },
  allTypes: { zh: "全部車型", en: "All" },
  from: { zh: "起", en: "from" },
  people: { zh: "人", en: "pax" },
  minutes: { zh: "分鐘", en: "min" },
  km: { zh: "公里", en: "km" },
  moreReviews: { zh: "查看更多評價", en: "More reviews" },
  watch: { zh: "觀看", en: "Watch" },
  download: { zh: "下載", en: "Download" },
  bookNow: { zh: "立即預訂", en: "Book now" },
  select: { zh: "選擇", en: "Select" },
  selected: { zh: "已選擇", en: "Selected" },
  continue: { zh: "繼續", en: "Continue" },
  back: { zh: "返回", en: "Back" },
  noResults: { zh: "找不到符合的結果", en: "No results found" },
  search: { zh: "搜尋", en: "Search" },
  menu: { zh: "選單", en: "Menu" },
  services: { zh: "服務項目", en: "Services" },
  logout: { zh: "登出", en: "Sign out" },
  myBookings: { zh: "我的訂單", en: "My bookings" },
  name: { zh: "姓名", en: "Name" },
  phone: { zh: "電話", en: "Phone" },
  email: { zh: "電子郵件", en: "Email" },
  password: { zh: "密碼", en: "Password" },
  notes: { zh: "備註", en: "Notes" },
  flightNo: { zh: "航班編號", en: "Flight no." },
  promoCode: { zh: "優惠碼", en: "Promo code" },
  apply: { zh: "套用", en: "Apply" },
  payment: { zh: "付款方式", en: "Payment" },
  cash: { zh: "現金 / 司機收款", en: "Cash to driver" },
  card: { zh: "信用卡", en: "Credit card" },
  linepay: { zh: "LINE Pay", en: "LINE Pay" },
  subtotal: { zh: "小計", en: "Subtotal" },
  discount: { zh: "折扣", en: "Discount" },
  total: { zh: "總計", en: "Total" },
  confirmBooking: { zh: "確認預訂", en: "Confirm booking" },
  bookingCode: { zh: "訂單編號", en: "Booking code" },
  status: { zh: "狀態", en: "Status" },
  vehicle: { zh: "車型", en: "Vehicle" },
  service: { zh: "服務類型", en: "Service" },
  option: { zh: "方案", en: "Option" },
  contactInfo: { zh: "聯絡資訊", en: "Contact details" },
  tripDetails: { zh: "行程資訊", en: "Trip details" },
  estimated: { zh: "預估", en: "Est." },
  nightSurcharge: { zh: "夜間加成", en: "Night surcharge" },
  cancelBooking: { zh: "取消訂單", en: "Cancel booking" },
  trackBooking: { zh: "查詢訂單", en: "Track a booking" },
  submit: { zh: "送出", en: "Submit" },
  sent: { zh: "已送出，感謝您！", en: "Sent — thank you!" },
  helpCenter: { zh: "幫助中心", en: "Help center" },
  contactUs: { zh: "聯絡我們", en: "Contact us" },
  subject: { zh: "主旨", en: "Subject" },
  message: { zh: "訊息內容", en: "Message" },
  register: { zh: "註冊", en: "Register" },
  signIn: { zh: "登入", en: "Sign in" },
  noAccount: { zh: "還沒有帳號？", en: "No account yet?" },
  haveAccount: { zh: "已有帳號？", en: "Already registered?" },
  writeReview: { zh: "撰寫評價", en: "Write a review" },
  rating: { zh: "評分", en: "Rating" },
  reviewPending: { zh: "感謝評價！審核後將顯示。", en: "Thanks! Your review will appear after moderation." },
  copy: { zh: "複製", en: "Copy" },
  copied: { zh: "已複製", en: "Copied" },
  validUntil: { zh: "有效期限", en: "Valid until" },
  minSpend: { zh: "最低消費", en: "Min. spend" },
  explore: { zh: "探索台灣", en: "Explore Taiwan" },
  fleet: { zh: "車隊介紹", en: "Our fleet" },
  promotions: { zh: "優惠活動", en: "Promotions" },
  seats: { zh: "座位", en: "Seats" },
  bags: { zh: "行李", en: "Bags" },
  perKm: { zh: "每公里", en: "per km" },
  perHour: { zh: "每小時", en: "per hour" },
  perDay: { zh: "每日", en: "per day" },
  results: { zh: "可預訂車輛", en: "Available vehicles" },
  chooseOption: { zh: "選擇方案", en: "Choose an option" },
  editSearch: { zh: "修改搜尋", en: "Edit search" },
  swap: { zh: "交換地點", en: "Swap" },
  thankYou: { zh: "預訂成功！", en: "Booking confirmed!" },
  thankYouSub: { zh: "我們已收到您的預訂，客服將盡快與您確認。", en: "We received your booking and will confirm it shortly." },
  required: { zh: "此欄位為必填", en: "This field is required" },
  guestCheckout: { zh: "免註冊也能預訂", en: "No account needed to book" },
} as const;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: Lang): string {
  return dict[key][lang];
}

export const statusLabels: Record<string, { zh: string; en: string; color: string }> = {
  pending: { zh: "待確認", en: "Pending", color: "#f59e0b" },
  confirmed: { zh: "已確認", en: "Confirmed", color: "#3b82f6" },
  assigned: { zh: "已派車", en: "Driver assigned", color: "#8b5cf6" },
  in_progress: { zh: "行程中", en: "In progress", color: "#06b6d4" },
  completed: { zh: "已完成", en: "Completed", color: "#10b981" },
  cancelled: { zh: "已取消", en: "Cancelled", color: "#ef4444" },
};

export const BOOKING_STATUSES = Object.keys(statusLabels);
