import type { BookingChannel, Order, SourceLanguage, TranslationStatus } from '../types'
import { hashSeed, mulberry32 } from './geo'

/** Booking channels treated as "foreign-language" sources for the 翻譯校對
 * (Translation Proofreading) queue — mirrors the reference site's mix of
 * OTA/aggregator channels whose free-text order notes typically arrive in
 * the customer's own language rather than Traditional Chinese. */
const FOREIGN_CHANNELS = new Set<BookingChannel>(['Klook', 'KKday', 'ezTravel', 'Booking.com', 'LINE@'])

/** Simple demo heuristic: a name is treated as "foreign" if it contains no
 * CJK ideographs — every seeded Chinese customer name is written in Han
 * script, while every seeded international customer name (used across the
 * ambient/bulk order generators) is romanized Latin script. */
export function isForeignCustomerName(name: string): boolean {
  return !/[\u4e00-\u9fff]/.test(name)
}

const PHRASEBOOK: Record<SourceLanguage, { original: string; zh: string }[]> = {
  EN: [
    { original: 'Please wait near arrivals gate 3, we have 2 large suitcases and a stroller.', zh: '請在入境大廳3號門附近等候，我們有2件大型行李和一台嬰兒車。' },
    { original: 'One passenger uses a wheelchair, please make sure the ramp is ready.', zh: '其中一位乘客需要輪椅協助，請確認斜坡板已準備好。' },
    { original: 'We may be 10 minutes late, our connecting flight is delayed.', zh: '我們可能會晚10分鐘，因為轉機航班有延誤。' },
    { original: 'Please add a stop at the 7-Eleven near the hotel before the airport.', zh: '請在往機場前，於飯店附近的7-11加一個停靠點。' },
    { original: 'Traveling with an infant, a rear-facing car seat would be appreciated.', zh: '同行有嬰兒，麻煩準備一個後向式安全座椅。' },
  ],
  JA: [
    { original: '到着ロビーの3番ゲート付近でお待ちください。大型スーツケース2つとベビーカーがあります。', zh: '請在入境大廳3號門附近等候，我們有2件大型行李和一台嬰兒車。' },
    { original: '車椅子を利用する乗客が1名います。スロープの準備をお願いします。', zh: '其中一位乘客需要輪椅協助，請確認斜坡板已準備好。' },
    { original: '乗り継ぎ便が遅れており、10分ほど遅れる可能性があります。', zh: '我們可能會晚10分鐘，因為轉機航班有延誤。' },
    { original: 'ホテル近くのコンビニに立ち寄っていただけますか。', zh: '請在往機場前，於飯店附近的超商加一個停靠點。' },
    { original: '乳児を連れています。後ろ向きのチャイルドシートをお願いします。', zh: '同行有嬰兒，麻煩準備一個後向式安全座椅。' },
  ],
  KO: [
    { original: '도착 로비 3번 게이트 근처에서 기다려 주세요. 대형 캐리어 2개와 유모차가 있습니다.', zh: '請在入境大廳3號門附近等候，我們有2件大型行李和一台嬰兒車。' },
    { original: '휠체어를 이용하는 승객이 있습니다. 경사로를 준비해 주세요.', zh: '其中一位乘客需要輪椅協助，請確認斜坡板已準備好。' },
    { original: '연결 항공편이 지연되어 10분 정도 늦을 수 있습니다.', zh: '我們可能會晚10分鐘，因為轉機航班有延誤。' },
    { original: '공항으로 가기 전에 호텔 근처 편의점에 들러 주세요.', zh: '請在往機場前，於飯店附近的便利商店加一個停靠點。' },
    { original: '아기와 동행합니다. 후방 카시트를 준비해 주세요.', zh: '同行有嬰兒，麻煩準備一個後向式安全座椅。' },
  ],
}

const LANGUAGES: SourceLanguage[] = ['EN', 'JA', 'KO']

/** Deterministically decides whether a freshly-generated order needs
 * translation review, and if so returns the AI-pretranslated Chinese draft
 * (`notes`) alongside the original-language source text — all fully
 * client-side/simulated, matching the rest of the app's "Demo API
 * simulation" convention. Real bookings placed directly through this app's
 * own Booking/Marketplace flow are always in the customer's own words
 * already in Chinese-or-English and are never gated here. */
export function computeTranslationFields(
  channel: BookingChannel,
  customerName: string,
  seedKey: string,
): { translationStatus: TranslationStatus; sourceLanguage: SourceLanguage | null; originalNoteText: string | null; notes: string | null } {
  if (!FOREIGN_CHANNELS.has(channel) || !isForeignCustomerName(customerName)) {
    return { translationStatus: 'NOT_NEEDED', sourceLanguage: null, originalNoteText: null, notes: null }
  }
  const rand = mulberry32(hashSeed(seedKey))
  // ~55% of eligible orders actually carry a free-text note that needs
  // proofing (the rest are plain bookings with nothing to translate).
  if (rand() > 0.55) {
    return { translationStatus: 'NOT_NEEDED', sourceLanguage: null, originalNoteText: null, notes: null }
  }
  const lang = LANGUAGES[Math.floor(rand() * LANGUAGES.length)]
  const entries = PHRASEBOOK[lang]
  const entry = entries[Math.floor(rand() * entries.length)]
  return { translationStatus: 'PENDING', sourceLanguage: lang, originalNoteText: entry.original, notes: entry.zh }
}

export function translationQueueOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.translationStatus === 'PENDING').sort((a, b) => a.createdAt - b.createdAt)
}

export const SOURCE_LANGUAGE_LABEL: Record<SourceLanguage, { en: string; zh: string }> = {
  EN: { en: 'English', zh: '英文' },
  JA: { en: 'Japanese', zh: '日文' },
  KO: { en: 'Korean', zh: '韓文' },
}
