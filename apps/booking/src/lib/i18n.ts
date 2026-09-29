export type Locale = 'en' | 'zh-TW'

const en = {
  'nav.book': 'Book', 'nav.business': 'Business', 'nav.about': 'About', 'nav.cta': 'Book a ride', 'nav.demo': 'Preview mode',
  'hero.kicker': 'Private mobility · Taiwan', 'hero.title1': 'Travel, precisely', 'hero.title2': 'orchestrated.',
  'hero.copy': 'A considered door-to-door experience for airport transfers, city journeys and private chauffeur travel.',
  'hero.book': 'Plan your journey', 'hero.explore': 'Explore the platform', 'hero.scroll': 'Scroll to begin',
  'book.pickupStep': '01 — Service & pickup', 'book.pickupTitle': 'How will you travel?', 'book.service': 'Service',
  'book.pickupPlaceholder': 'Search a pickup point', 'book.destinationStep': '02 — Destination', 'book.destinationTitle': 'Where are you going?',
  'book.destinationPlaceholder': 'Search a destination', 'book.next': 'Continue', 'book.choose': 'Choose a vehicle',
  'book.vehicleStep': '03 — Vehicle', 'book.vehicleTitle': 'Select the right space.', 'book.vehicleHint': 'Compare capacity and estimated pricing. Drag the 3D view to inspect.',
  'book.date': 'Date', 'book.time': 'Time', 'book.passengers': 'Passengers', 'book.luggage': 'Luggage', 'book.estimate': 'Estimated fare',
  'book.seats': 'seats', 'book.bags': 'bags', 'book.eta': 'Preview ETA', 'book.select': 'Select this vehicle',
  'review.step': '04 — Review', 'review.title': 'Review your journey', 'review.ready': 'Request ready for integration',
  'review.pickup': 'Pickup', 'review.destination': 'Destination', 'review.when': 'When', 'review.vehicle': 'Vehicle',
  'review.service': 'Service', 'review.distance': 'Distance', 'review.change': 'Change vehicle', 'review.prepare': 'Prepare request',
  'review.disclaimer': 'Preview prepared · No reservation, availability check, or payment has been submitted.', 'review.new': 'Start again',
  'business.kicker': 'Business mobility', 'business.title': 'One standard, every journey.',
  'business.copy': 'Airport programmes, executive travel, employee mobility and group transport—designed for consistent service and future operational integrations.',
  'about.kicker': 'About Fleet OS', 'about.title': 'Intelligence behind every movement.',
  'about.copy': 'A transportation experience designed around reliable operations, safety, transparent capacity and calm human service.',
  'outro.title': 'Your next journey starts here.', 'outro.copy': 'Premium transportation, intelligently connected.',
  'search.empty': 'No preview locations match. A production geocoder is required for arbitrary addresses.',
  'a11y.language': 'Language', 'a11y.menu': 'Menu', 'a11y.home': 'Fleet OS home',
} as const

const zh: Record<keyof typeof en, string> = {
  'nav.book': '預約', 'nav.business': '企業服務', 'nav.about': '關於我們', 'nav.cta': '開始預約', 'nav.demo': '預覽模式',
  'hero.kicker': '台灣 · 私人移動服務', 'hero.title1': '每段旅程，', 'hero.title2': '精準安排。', 'hero.copy': '從機場接送、城市移動到私人司機服務，提供沉穩而細緻的門到門體驗。',
  'hero.book': '規劃旅程', 'hero.explore': '探索平台', 'hero.scroll': '向下開始',
  'book.pickupStep': '01 — 服務與上車地點', 'book.pickupTitle': '您想如何出行？', 'book.service': '服務類型', 'book.pickupPlaceholder': '搜尋上車地點',
  'book.destinationStep': '02 — 目的地', 'book.destinationTitle': '您要前往哪裡？', 'book.destinationPlaceholder': '搜尋目的地', 'book.next': '繼續', 'book.choose': '選擇車輛',
  'book.vehicleStep': '03 — 車輛', 'book.vehicleTitle': '選擇適合的空間。', 'book.vehicleHint': '比較乘載空間與預估價格。拖曳 3D 視角即可查看車輛。',
  'book.date': '日期', 'book.time': '時間', 'book.passengers': '乘客', 'book.luggage': '行李', 'book.estimate': '預估車資',
  'book.seats': '座位', 'book.bags': '件行李', 'book.eta': '預覽抵達時間', 'book.select': '選擇此車輛',
  'review.step': '04 — 確認', 'review.title': '確認您的旅程', 'review.ready': '需求已準備串接', 'review.pickup': '上車地點', 'review.destination': '目的地',
  'review.when': '時間', 'review.vehicle': '車輛', 'review.service': '服務', 'review.distance': '距離', 'review.change': '更換車輛', 'review.prepare': '準備需求',
  'review.disclaimer': '預覽已準備 · 尚未送出預約、可用性查詢或付款。', 'review.new': '重新開始',
  'business.kicker': '企業移動服務', 'business.title': '每段旅程，同一高標準。', 'business.copy': '機場接送方案、高階主管用車、員工移動與團體運輸，為穩定服務及未來營運串接而設計。',
  'about.kicker': '關於 Fleet OS', 'about.title': '讓每次移動更有智慧。', 'about.copy': '以可靠營運、安全、清楚乘載資訊與細緻人性服務為核心的運輸體驗。',
  'outro.title': '下一段旅程，由此開始。', 'outro.copy': '高品質交通服務，智慧串聯。', 'search.empty': '預覽地點中沒有相符結果。任意地址需串接正式地理編碼服務。',
  'a11y.language': '語言', 'a11y.menu': '選單', 'a11y.home': 'Fleet OS 首頁',
}

export type TranslationKey = keyof typeof en
export const translate = (locale: Locale, key: TranslationKey) => (locale === 'zh-TW' ? zh[key] : en[key])
