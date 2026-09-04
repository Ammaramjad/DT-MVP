import type { AppNotification, CustomerProfile, Driver, DriverStats, DocumentRecord, Order, OrderStatus, PassengerRequirements, TaiwanRegion, Vehicle, VehicleCategory } from '../types'
import { getLocation, LOCATIONS } from './locations'
import { buildRoutePath, evaluateRoute } from '../lib/geo'
import { computeFareBreakdown, estimateDurationMin, genId } from '../lib/pricing'
import { lookupFlight } from '../lib/flight'
import { buildShiftSchedule } from '../lib/capacity'
import { DEFAULT_CATEGORY_FOR_TYPE, VEHICLE_CATEGORY_CATALOG } from '../lib/../data/vehicleCatalog'
import { computeTranslationFields } from '../lib/translation'

const NO_REQUIREMENTS: PassengerRequirements = { childSeat: false, wheelchair: false, pet: false, specialAssistance: '' }

const ALL_CATEGORIES: VehicleCategory[] = [
  'ECONOMY_SEDAN',
  'COMFORT_SEDAN',
  'PREMIUM_SEDAN',
  'SUV',
  'VAN_6',
  'VAN_9',
  'ACCESSIBLE',
  'LUXURY_SEDAN',
  'LUXURY_VAN',
  'CHARTER_MINIBUS',
]

const CATEGORY_TO_PHYSICAL_TYPE: Record<VehicleCategory, Vehicle['type']> = {
  ECONOMY_SEDAN: 'SEDAN',
  COMFORT_SEDAN: 'SEDAN',
  PREMIUM_SEDAN: 'SEDAN',
  SUV: 'SUV',
  VAN_6: 'VAN',
  VAN_9: 'VAN',
  ACCESSIBLE: 'VAN',
  LUXURY_SEDAN: 'LUXURY',
  LUXURY_VAN: 'LUXURY',
  CHARTER_MINIBUS: 'MINIBUS',
}

const VEHICLE_COLORS = [
  '#22d3ee', '#a855f7', '#fbbf24', '#f472b6', '#a3e635',
  '#38bdf8', '#fb923c', '#60a5fa', '#f87171', '#34d399',
  '#e879f9', '#facc15', '#4ade80', '#818cf8', '#fb7185',
  '#2dd4bf', '#c084fc', '#f59e0b', '#10b981', '#06b6d4',
  '#6366f1', '#ec4899', '#84cc16', '#14b8a6', '#0ea5e9',
]

const SERVICE_ZONE_ROTATION: TaiwanRegion[] = [
  'TAIPEI', 'TAIPEI', 'TAIPEI', 'NEW_TAIPEI', 'NEW_TAIPEI',
  'TAOYUAN', 'TAOYUAN', 'HSINCHU', 'TAICHUNG', 'TAICHUNG',
  'NANTOU', 'TAINAN', 'KAOHSIUNG', 'KAOHSIUNG', 'HUALIEN', 'TAITUNG',
]

function zoneForIndex(i: number): TaiwanRegion {
  return SERVICE_ZONE_ROTATION[i % SERVICE_ZONE_ROTATION.length]
}

function iso(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function randomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function doc(number: string, expiresAt: string, status: DocumentRecord['status'], ocrStatus: DocumentRecord['ocrStatus'] = 'VERIFIED'): DocumentRecord {
  return { number, expiresAt, status, ocrStatus, lastUpdatedAt: iso(-Math.floor(Math.random() * 60), 9) }
}

const FIRST_7_VEHICLES = [
  { id: 'veh-1', plate: 'ABC-5581', type: 'SEDAN' as const, category: 'COMFORT_SEDAN' as VehicleCategory, colorHex: '#22d3ee', capacity: 3, driverId: 'drv-1' },
  { id: 'veh-2', plate: 'AFG-2210', type: 'SUV' as const, category: 'SUV' as VehicleCategory, colorHex: '#a855f7', capacity: 5, driverId: 'drv-2' },
  { id: 'veh-3', plate: 'AKT-7754', type: 'VAN' as const, category: 'VAN_6' as VehicleCategory, colorHex: '#fbbf24', capacity: 7, driverId: 'drv-3' },
  { id: 'veh-4', plate: 'ARL-0093', type: 'LUXURY' as const, category: 'LUXURY_SEDAN' as VehicleCategory, colorHex: '#f472b6', capacity: 3, driverId: 'drv-4' },
  { id: 'veh-5', plate: 'AWY-4471', type: 'MINIBUS' as const, category: 'CHARTER_MINIBUS' as VehicleCategory, colorHex: '#a3e635', capacity: 12, driverId: 'drv-5' },
  { id: 'veh-6', plate: 'ABD-6620', type: 'SEDAN' as const, category: 'ECONOMY_SEDAN' as VehicleCategory, colorHex: '#38bdf8', capacity: 3, driverId: 'drv-6' },
  { id: 'veh-7', plate: 'AJX-1138', type: 'SUV' as const, category: 'SUV' as VehicleCategory, colorHex: '#fb923c', capacity: 5, driverId: 'drv-7' },
]

const TOTAL_FLEET_SIZE = 360

const PLATE_PREFIXES = ['ABC', 'AFG', 'AKT', 'ARL', 'AWY', 'ABD', 'AJX', 'RBA', 'TDF', 'EAB', 'RAC', 'BCA', 'KLA', 'WXY', 'QPR', 'NVB', 'TDG', 'HJK', 'MBZ', 'VWT', 'TYT', 'LEX', 'TES', 'BWM', 'VOL']

function generatePlate(index: number): string {
  if (index < FIRST_7_VEHICLES.length) return FIRST_7_VEHICLES[index].plate
  const prefix = PLATE_PREFIXES[index % PLATE_PREFIXES.length]
  const num = 1000 + ((index * 37 + 13) % 8999)
  return `${prefix}-${num}`
}

export const SEED_VEHICLES: Vehicle[] = Array.from({ length: TOTAL_FLEET_SIZE }, (_, i) => {
  const id = `veh-${i + 1}`
  const driverId = `drv-${i + 1}`
  const category = i < FIRST_7_VEHICLES.length ? FIRST_7_VEHICLES[i].category : ALL_CATEGORIES[i % ALL_CATEGORIES.length]
  const type = CATEGORY_TO_PHYSICAL_TYPE[category]
  const catalogEntry = VEHICLE_CATEGORY_CATALOG[category]
  const plate = generatePlate(i)
  const colorHex = i < FIRST_7_VEHICLES.length ? FIRST_7_VEHICLES[i].colorHex : VEHICLE_COLORS[i % VEHICLE_COLORS.length]
  const serviceZone = zoneForIndex(i)

  const isExpiredIns = i === 12 || i === 84 || i === 192 || i === 310
  const isExpiringIns = i % 18 === 3
  const insuranceStatus: Vehicle['insuranceStatus'] = isExpiredIns ? 'EXPIRED' : isExpiringIns ? 'EXPIRING' : 'VALID'

  const isFlaggedCompliance = i === 19 || i === 95 || i === 220 || i === 340
  const complianceStatus: Vehicle['complianceStatus'] = isFlaggedCompliance ? 'FLAGGED' : 'OK'

  const underMaintenance = i === 9 || i === 77 || i === 155 || i === 280

  return {
    id,
    plate,
    type,
    category,
    colorHex,
    capacity: catalogEntry.maxPassengers,
    luggageCapacity: catalogEntry.maxLuggage,
    serviceZone,
    features: catalogEntry.features,
    driverId,
    insuranceStatus,
    complianceStatus,
    maintenanceUntil: underMaintenance ? Date.now() + 3 * 3_600_000 : null,
    maintenanceReason: underMaintenance ? 'Scheduled brake & tire safety service' : null,
  }
})

// Realistic Taiwanese Surnames & Given names
const SURNAMES: [string, string][] = [
  ['Chen', '陳'], ['Lin', '林'], ['Huang', '黃'], ['Chang', '張'], ['Li', '李'],
  ['Wang', '王'], ['Wu', '吳'], ['Liu', '劉'], ['Tsai', '蔡'], ['Yang', '楊'],
  ['Hsu', '許'], ['Cheng', '鄭'], ['Hsieh', '謝'], ['Kuo', '郭'], ['Hung', '洪'],
  ['Tseng', '曾'], ['Chiu', '邱'], ['Liao', '廖'], ['Lai', '賴'], ['Chou', '周'],
  ['Hsu', '徐'], ['Su', '蘇'], ['Yeh', '葉'], ['Chuang', '莊'], ['Lu', '呂'],
  ['Chiang', '江'], ['Ho', '何'], ['Hsiao', '蕭'], ['Pan', '潘'], ['Chu', '朱'],
  ['Peng', '彭'], ['Ma', '馬'], ['Deng', '鄧'], ['Tang', '湯'], ['Lu', '魯'], ['Fang', '方'],
]

const GIVEN_NAMES: [string, string][] = [
  ['Chih-Ming', '志明'], ['Mei-Hui', '美惠'], ['Da-Tong', '大同'], ['Chia-Hao', '家豪'],
  ['Wen-Bin', '文彬'], ['Shu-Fen', '淑芬'], ['Chien-Cheng', '建成'], ['Yu-Ting', '雨婷'],
  ['Kai-Wen', '凱文'], ['Pei-Ru', '佩如'], ['Zhi-Qiang', '智強'], ['Hui-Ling', '惠玲'],
  ['Jun-Jie', '偉杰'], ['Shu-Wen', '淑文'], ['Bo-Han', '博含'], ['Yi-Chun', '依春'],
  ['Zong-Han', '宗漢'], ['Meng-Yao', '孟瑞'], ['Jia-Le', '嘉樂'], ['Xin-Yi', '心思'],
  ['Guan-Yu', '官宇'], ['Rui-En', '瑞恩'], ['Wan-Ru', '婉如'], ['Cheng-Yu', '承宇'],
  ['Kuan-Yu', '冠宇'], ['Ya-Ting', '雅婷'], ['Po-Chun', '柏均'], ['Ting-Wei', '廷威'],
  ['Yu-Chen', '宇晨'], ['Hao-Ran', '浩然'], ['Yi-Ling', '怡伶'], ['Chun-Wei', '俊偉'],
  ['Sheng-Xian', '聖賢'], ['Ming-Feng', '明峰'], ['Yi-Ting', '宜庭'], ['Chia-Wei', '嘉偉'],
  ['Zhi-Yuan', '志遠'], ['Wan-Ting', '婉婷'], ['Yu-Xuan', '宇軒'], ['Jing-Yi', '靜宜'],
]

const FIRST_7_DRIVERS = [
  {
    id: 'drv-1', name: 'Chih-Ming Chen', nameZh: '陳志明', avatarEmoji: '🧑🏻‍✈️', colorHex: '#22d3ee', phone: '0912-345-671', tier: 'OWNED_FLEET' as const, rating: 4.9, completedTrips: 812, vehicleId: 'veh-1',
    documents: { license: doc('TPE-DL-88213', iso(210, 0), 'VALID'), insurance: doc('INS-2291-A', iso(160, 0), 'VALID'), registration: doc('REG-1188-A', iso(280, 0), 'VALID'), inspection: doc('INSP-3301-A', iso(95, 0), 'VALID') },
  },
  {
    id: 'drv-2', name: 'Mei-Hui Lin', nameZh: '林美惠', avatarEmoji: '👩🏻‍✈️', colorHex: '#a855f7', phone: '0922-118-430', tier: 'OWNED_FLEET' as const, rating: 4.8, completedTrips: 654, vehicleId: 'veh-2',
    documents: { license: doc('TPE-DL-77120', iso(9, 0), 'EXPIRING'), insurance: doc('INS-1187-B', iso(300, 0), 'VALID'), registration: doc('REG-2210-B', iso(180, 0), 'VALID'), inspection: doc('INSP-4402-B', iso(40, 0), 'VALID') },
  },
  {
    id: 'drv-3', name: 'Da-Tong Wang', nameZh: '王大同', avatarEmoji: '🧑🏽‍✈️', colorHex: '#fbbf24', phone: '0933-882-041', tier: 'PAID_MEMBER' as const, rating: 4.7, completedTrips: 401, vehicleId: 'veh-3',
    documents: { license: doc('TPE-DL-55302', iso(120, 0), 'VALID'), insurance: doc('INS-3391-C', iso(5, 0), 'EXPIRING'), registration: doc('REG-3321-C', iso(210, 0), 'VALID'), inspection: doc('INSP-5503-C', iso(150, 0), 'VALID', 'PENDING') },
  },
  {
    id: 'drv-4', name: 'Chia-Hao Chang', nameZh: '張家豪', avatarEmoji: '🧑🏻‍✈️', colorHex: '#f472b6', phone: '0955-206-889', tier: 'PAID_MEMBER' as const, rating: 5.0, completedTrips: 289, vehicleId: 'veh-4',
    documents: { license: doc('TPE-DL-90911', iso(88, 0), 'VALID'), insurance: doc('INS-4471-D', iso(200, 0), 'VALID'), registration: doc('REG-4432-D', iso(300, 0), 'VALID'), inspection: doc('INSP-6604-D', iso(60, 0), 'VALID') },
  },
  {
    id: 'drv-5', name: 'Wen-Bin Li', nameZh: '李文彬', avatarEmoji: '🧑🏻‍✈️', colorHex: '#a3e635', phone: '0966-773-215', tier: 'OUTSIDE_CONTRACTOR' as const, rating: 4.6, completedTrips: 133, vehicleId: 'veh-5',
    documents: { license: doc('TPE-DL-33218', iso(-3, 0), 'EXPIRED'), insurance: doc('INS-5521-E', iso(45, 0), 'VALID'), registration: doc('REG-5543-E', iso(20, 0), 'VALID'), inspection: doc('INSP-7705-E', iso(-10, 0), 'EXPIRED', 'FLAGGED') },
  },
  {
    id: 'drv-6', name: 'Shu-Fen Huang', nameZh: '黃淑芬', avatarEmoji: '👩🏻‍✈️', colorHex: '#38bdf8', phone: '0977-664-902', tier: 'OWNED_FLEET' as const, rating: 4.9, completedTrips: 977, vehicleId: 'veh-6',
    documents: { license: doc('TPE-DL-10087', iso(365, 0), 'VALID'), insurance: doc('INS-6631-F', iso(365, 0), 'VALID'), registration: doc('REG-6654-F', iso(365, 0), 'VALID'), inspection: doc('INSP-8806-F', iso(365, 0), 'VALID') },
  },
  {
    id: 'drv-7', name: 'Chien-Cheng Wu', nameZh: '吳建成', avatarEmoji: '🧑🏽‍✈️', colorHex: '#fb923c', phone: '0988-402-671', tier: 'OUTSIDE_CONTRACTOR' as const, rating: 4.5, completedTrips: 76, vehicleId: 'veh-7',
    documents: { license: doc('TPE-DL-20044', iso(60, 0), 'VALID'), insurance: doc('INS-7741-G', iso(12, 0), 'EXPIRING'), registration: doc('REG-7765-G', iso(90, 0), 'VALID'), inspection: doc('INSP-9907-G', iso(75, 0), 'VALID') },
  },
]

const DRIVER_EMOJIS = ['🧑🏻‍✈️', '👩🏻‍✈️', '🧑🏽‍✈️', '👨🏻‍✈️', '🧑🏼‍✈️', '👩🏼‍✈️']
const DRIVER_TIERS: Driver['tier'][] = ['OWNED_FLEET', 'OWNED_FLEET', 'PAID_MEMBER', 'PAID_MEMBER', 'OUTSIDE_CONTRACTOR']

const BASE_DRIVERS: Omit<
  Driver,
  | 'status' | 'lat' | 'lng' | 'svgX' | 'svgY' | 'stats' | 'shiftSchedule' | 'unresponsiveFlagUntil' | 'unresponsiveOrderNo'
  | 'workingMode' | 'currentZone' | 'autoAcceptEnabled' | 'airportPreference' | 'shiftStartedAt' | 'loginEnabled'
>[] = Array.from({ length: TOTAL_FLEET_SIZE }, (_, i) => {
  if (i < FIRST_7_DRIVERS.length) return FIRST_7_DRIVERS[i]

  const id = `drv-${i + 1}`
  const vehicleId = `veh-${i + 1}`
  const sIdx = (i * 7 + 3) % SURNAMES.length
  const gIdx = (i * 13 + 5) % GIVEN_NAMES.length
  const [sEng, sZh] = SURNAMES[sIdx]
  const [gEng, gZh] = GIVEN_NAMES[gIdx]
  const name = `${gEng} ${sEng}`
  const nameZh = `${sZh}${gZh}`

  const avatarEmoji = DRIVER_EMOJIS[i % DRIVER_EMOJIS.length]
  const colorHex = VEHICLE_COLORS[i % VEHICLE_COLORS.length]
  const phone = `09${10 + (i % 80)}-${100 + ((i * 17) % 899)}-${100 + ((i * 23) % 899)}`
  const tier = DRIVER_TIERS[i % DRIVER_TIERS.length]
  const rating = Math.round((4.5 + ((i % 6) * 0.1)) * 10) / 10
  const completedTrips = 35 + ((i * 47) % 920)

  const isExpiringLic = i % 24 === 0
  const isExpiredLic = i === 48 || i === 188 || i === 312
  const isExpiringIns = i % 20 === 2
  const isFlaggedInsp = i % 30 === 5
  const isPendingInsp = i % 40 === 7

  return {
    id,
    name,
    nameZh,
    avatarEmoji,
    colorHex,
    phone,
    tier,
    rating,
    completedTrips,
    vehicleId,
    documents: {
      license: doc(`TPE-DL-${30000 + i * 17}`, iso(isExpiredLic ? -5 : isExpiringLic ? 12 : 90 + (i % 250), 0), isExpiredLic ? 'EXPIRED' : isExpiringLic ? 'EXPIRING' : 'VALID'),
      insurance: doc(`INS-${7000 + i * 13}`, iso(isExpiringIns ? 8 : 60 + (i % 280), 0), isExpiringIns ? 'EXPIRING' : 'VALID'),
      registration: doc(`REG-${8000 + i * 11}`, iso(120 + (i % 200), 0), 'VALID'),
      inspection: doc(`INSP-${9000 + i * 9}`, iso(40 + (i % 300), 0), 'VALID', isFlaggedInsp ? 'FLAGGED' : isPendingInsp ? 'PENDING' : 'VERIFIED'),
    },
  }
})

function buildDriverStats(driverId: string, completedTrips: number): DriverStats {
  const seed = driverId.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7)
  const declineRate = 0.03 + ((seed % 11) / 11) * 0.05
  const missRate = 0.01 + ((seed % 7) / 7) * 0.03
  const totalAllTime = completedTrips + Math.round(completedTrips * (declineRate + missRate))
  const declinedAllTime = Math.round(totalAllTime * declineRate)
  const missedAllTime = Math.round(totalAllTime * missRate)
  const acceptedAllTime = Math.max(0, totalAllTime - declinedAllTime - missedAllTime)
  const totalToday = 1 + (seed % 5)
  const totalWeek = totalToday + 6 + (seed % 12)
  const declinedToday = seed % 3 === 0 ? 1 : 0
  const missedToday = seed % 5 === 0 ? 1 : 0
  const acceptedToday = Math.max(0, totalToday - declinedToday - missedToday)

  return { totalAllTime, totalToday, totalWeek, acceptedToday, declinedToday, missedToday, acceptedAllTime, declinedAllTime, missedAllTime }
}

function freshOrderShell(id: string, orderNo: string): Pick<
  Order,
  | 'id'
  | 'orderNo'
  | 'driverId'
  | 'vehicleId'
  | 'suggestedDriverId'
  | 'routeToPickup'
  | 'legProgress'
  | 'currentPos'
  | 'pickedUpAt'
  | 'pendingDriverId'
  | 'dispatchAttempts'
  | 'escalationStage'
  | 'unresponsiveDriverIds'
  | 'demoForceNoResponse'
  | 'quotationVersion'
  | 'quotedAt'
  | 'statusHistory'
  | 'auditLog'
  | 'paymentStatus'
  | 'supplierStatus'
  | 'voucherStatus'
  | 'pickupPin'
  | 'cancellationReason'
  | 'refundAmount'
  | 'supportTicketId'
  | 'driverRatingByCustomer'
  | 'customerRatingByDriver'
  | 'tollParkingEvidenceUploaded'
  | 'noShowReported'
  | 'waitStartedAt'
  | 'pickupInstructions'
  | 'invoiceRequested'
  | 'invoiceIssued'
  | 'bookingUrgency'
  | 'flightLandedAt'
  | 'driverInfoRevealOverride'
  | 'paymentMethod'
  | 'lateFeeAmount'
  | 'lateFeeWaitMinutes'
  | 'waitingFeeAgreed'
  | 'waypoints'
  | 'translationStatus'
  | 'sourceLanguage'
  | 'originalNoteText'
> {
  const now = Date.now()
  return {
    id,
    orderNo,
    driverId: null,
    vehicleId: null,
    suggestedDriverId: null,
    routeToPickup: null,
    legProgress: 0,
    currentPos: null,
    pickedUpAt: null,
    pendingDriverId: null,
    dispatchAttempts: [],
    escalationStage: 0,
    unresponsiveDriverIds: [],
    demoForceNoResponse: false,
    quotationVersion: 1,
    quotedAt: now,
    statusHistory: [{ id: genId('hist'), status: 'CONFIRMED', at: now, actor: 'CUSTOMER' }],
    auditLog: [{ id: genId('aud'), at: now, actor: 'CUSTOMER', action: 'Order placed' }],
    paymentStatus: 'PAID',
    supplierStatus: 'NOT_APPLICABLE',
    voucherStatus: 'ISSUED',
    pickupPin: randomPin(),
    cancellationReason: null,
    refundAmount: null,
    supportTicketId: null,
    driverRatingByCustomer: null,
    customerRatingByDriver: null,
    tollParkingEvidenceUploaded: false,
    noShowReported: false,
    waitStartedAt: null,
    pickupInstructions: null,
    invoiceRequested: false,
    invoiceIssued: false,
    bookingUrgency: 'STANDARD',
    flightLandedAt: null,
    driverInfoRevealOverride: true,
    paymentMethod: 'card',
    lateFeeAmount: null,
    lateFeeWaitMinutes: null,
    waitingFeeAgreed: false,
    waypoints: [],
    translationStatus: 'NOT_NEEDED',
    sourceLanguage: null,
    originalNoteText: null,
  }
}

function buildOrderBase(params: {
  id: string
  orderNo: string
  channel: Order['channel']
  pickupId: string
  dropoffId: string
  vehicleType: Order['vehicleType']
  vehicleCategory?: VehicleCategory
  passengerRequirements?: PassengerRequirements
  passengers: number
  luggage: number
  scheduledTime: string
  customer: Order['customer']
  flightNumber?: string
  notes?: string
}): Order {
  const pickup = getLocation(params.pickupId)
  const dropoff = getLocation(params.dropoffId)
  const type: Order['type'] = pickup.isAirport ? 'AIRPORT_PICKUP' : dropoff.isAirport ? 'AIRPORT_DROPOFF' : 'TOUR_CHARTER'

  const routeToDropoff = buildRoutePath(pickup, dropoff, `${params.id}-leg2`)
  const flightInfo = params.flightNumber ? lookupFlight(params.flightNumber, params.scheduledTime) : null
  const isAirport = pickup.isAirport || dropoff.isAirport
  const durationMin = estimateDurationMin(routeToDropoff.distanceKm)
  const fareBreakdown = computeFareBreakdown(routeToDropoff.distanceKm, durationMin, params.vehicleType, isAirport)
  const translation = computeTranslationFields(params.channel, params.customer.name, params.id)

  return {
    ...freshOrderShell(params.id, params.orderNo),
    channel: params.channel,
    type,
    status: 'CONFIRMED',
    createdAt: Date.now(),
    scheduledTime: params.scheduledTime,
    customer: params.customer,
    pickup,
    dropoff,
    vehicleType: params.vehicleType,
    vehicleCategory: params.vehicleCategory ?? DEFAULT_CATEGORY_FOR_TYPE[params.vehicleType],
    passengerRequirements: params.passengerRequirements ?? NO_REQUIREMENTS,
    passengers: params.passengers,
    luggage: params.luggage,
    notes: translation.notes ?? params.notes ?? '',
    translationStatus: translation.translationStatus,
    sourceLanguage: translation.sourceLanguage,
    originalNoteText: translation.originalNoteText,
    flightNumber: params.flightNumber ?? null,
    flightInfo,
    priceEstimate: fareBreakdown.total,
    fareBreakdown,
    distanceKm: routeToDropoff.distanceKm,
    durationMin,
    routeToDropoff,
    pickupInstructions: pickup.isAirport
      ? { terminal: Math.random() > 0.5 ? 'Terminal 2' : 'Terminal 1', gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${Math.floor(Math.random() * 20) + 1}`, meetAndGreetBoard: `Zhaofeng Travel · ${params.customer.name}` }
      : null,
  }
}

function buildCustomerProfiles(): CustomerProfile[] {
  const historyFor = (
    entries: { pickupId: string; dropoffId: string; daysAgo: number; type: Order['type']; price: number; status?: 'COMPLETED' | 'CANCELLED' }[],
  ) =>
    entries.map((e, i) => ({
      id: genId('hist'),
      pickupName: getLocation(e.pickupId).name,
      dropoffName: getLocation(e.dropoffId).name,
      type: e.type,
      scheduledTime: iso(-e.daysAgo, 9 + (i % 6)),
      status: e.status ?? ('COMPLETED' as const),
      priceEstimate: e.price,
    }))

  const basePassengers = [
    { id: genId('pax'), name: 'Chloe Laurent', phone: '+33 6 98 76 54 32', relationship: 'Daughter', isEmergencyContact: false },
    { id: genId('pax'), name: 'Pierre Laurent', phone: '+33 6 11 22 33 44', relationship: 'Spouse', isEmergencyContact: true },
  ]
  const basePayments = [
    { id: genId('pm'), brand: 'Visa' as const, last4: '4242', expiry: '08/28', isDefault: true },
    { id: genId('pm'), brand: 'LINE Pay' as const, last4: '9981', expiry: '--', isDefault: false },
  ]

  return [
    {
      id: 'cust-isabelle',
      name: 'Isabelle Laurent',
      nameZh: '伊莎貝爾 · 羅蘭',
      avatarEmoji: '👩🏼',
      phone: '+33 6 12 34 56 78',
      email: 'isabelle.l@example.com',
      memberSince: iso(-170, 9),
      passengerTier: 'INTL_TOURIST',
      corporateAccountId: null,
      corporateName: null,
      taxIdUbn: null,
      carrierBarcode: null,
      notesAndPreferences: 'Prefers quiet ride, English speaking driver, needs child seat for airport arrival.',
      isVip: false,
      promoVouchersCount: 2,
      lifetimeValueTwd: 18450,
      historicalOrders: historyFor([
        { pickupId: 'tpe-airport', dropoffId: 'grand-hyatt', daysAgo: 168, type: 'AIRPORT_PICKUP', price: 1450 },
        { pickupId: 'grand-hyatt', dropoffId: 'jiufen', daysAgo: 150, type: 'TOUR_CHARTER', price: 3800 },
        { pickupId: 'ximending', dropoffId: 'tpe-airport', daysAgo: 132, type: 'AIRPORT_DROPOFF', price: 1500 },
        { pickupId: 'tpe-airport', dropoffId: 'w-hotel', daysAgo: 94, type: 'AIRPORT_PICKUP', price: 1600 },
        { pickupId: 'w-hotel', dropoffId: 'beitou', daysAgo: 80, type: 'TOUR_CHARTER', price: 2600 },
        { pickupId: 'tpe-airport', dropoffId: 'ximending', daysAgo: 45, type: 'AIRPORT_PICKUP', price: 1450 },
        { pickupId: 'ximending', dropoffId: 'yehliu', daysAgo: 30, type: 'TOUR_CHARTER', price: 3200 },
        { pickupId: 'tpe-airport', dropoffId: 'grand-hyatt', daysAgo: 12, type: 'AIRPORT_PICKUP', price: 1450 },
      ]),
      savedPassengers: basePassengers,
      paymentMethods: basePayments,
      notificationPreference: { email: true, line: true, sms: false },
      privacyRequests: [],
      memberTier: 'GOLD',
      memberPoints: 3420,
      consentMarketing: true,
    },
    {
      id: 'cust-haruto',
      name: 'Haruto Sasaki',
      nameZh: '佐佐木 陽斗',
      avatarEmoji: '👨🏻',
      phone: '+81 90-1234-5678',
      email: 'haruto.s@example.com',
      memberSince: iso(-58, 9),
      passengerTier: 'FREQUENT_FLYER',
      corporateAccountId: null,
      corporateName: null,
      taxIdUbn: null,
      carrierBarcode: '/HS-8821',
      notesAndPreferences: 'Japanese speaking driver preferred, early morning departure punctuality.',
      isVip: false,
      promoVouchersCount: 1,
      lifetimeValueTwd: 3200,
      historicalOrders: historyFor([
        { pickupId: 'tpe-airport', dropoffId: 'taipei-101', daysAgo: 56, type: 'AIRPORT_PICKUP', price: 1600 },
        { pickupId: 'taipei-101', dropoffId: 'tpe-airport', daysAgo: 52, type: 'AIRPORT_DROPOFF', price: 1600 },
      ]),
      savedPassengers: [],
      paymentMethods: [{ id: genId('pm'), brand: 'JCB', last4: '0021', expiry: '11/27', isDefault: true }],
      notificationPreference: { email: true, line: true, sms: true },
      privacyRequests: [],
      memberTier: 'SILVER',
      memberPoints: 210,
      consentMarketing: false,
    },
    {
      id: 'cust-marcus',
      name: 'Marcus Webb',
      nameZh: '馬可斯 · 韋伯 (TSMC VIP)',
      avatarEmoji: '🤵🏻',
      phone: '+44 7700 900123',
      email: 'marcus.webb@example.com',
      memberSince: iso(-320, 9),
      passengerTier: 'VIP_PLATINUM',
      corporateAccountId: 'corp-tsmc',
      corporateName: 'Taiwan Semiconductor Manufacturing Co. (TSMC)',
      taxIdUbn: '23307688',
      carrierBarcode: '/MW-7700',
      notesAndPreferences: 'VIP client, silent ride preferred. High-end Luxury Sedan/Van required.',
      isVip: true,
      promoVouchersCount: 5,
      lifetimeValueTwd: 86400,
      historicalOrders: historyFor([
        { pickupId: 'tpe-airport', dropoffId: 'grand-hyatt', daysAgo: 300, type: 'AIRPORT_PICKUP', price: 2200 },
        { pickupId: 'grand-hyatt', dropoffId: 'tpe-airport', daysAgo: 296, type: 'AIRPORT_DROPOFF', price: 2200 },
        { pickupId: 'tpe-airport', dropoffId: 'taipei-main-station', daysAgo: 210, type: 'AIRPORT_PICKUP', price: 2000 },
        { pickupId: 'taipei-main-station', dropoffId: 'neihu-business', daysAgo: 205, type: 'TOUR_CHARTER', price: 1400 },
        { pickupId: 'neihu-business', dropoffId: 'tsa-airport', daysAgo: 202, type: 'AIRPORT_DROPOFF', price: 1100 },
        { pickupId: 'tpe-airport', dropoffId: 'taipei-main-station', daysAgo: 90, type: 'AIRPORT_PICKUP', price: 2000 },
        { pickupId: 'taipei-main-station', dropoffId: 'tpe-airport', daysAgo: 85, type: 'AIRPORT_DROPOFF', price: 2000 },
        { pickupId: 'tpe-airport', dropoffId: 'w-hotel', daysAgo: 20, type: 'AIRPORT_PICKUP', price: 2100 },
        { pickupId: 'w-hotel', dropoffId: 'tsa-airport', daysAgo: 16, type: 'AIRPORT_DROPOFF', price: 1300, status: 'CANCELLED' },
      ]),
      savedPassengers: [{ id: genId('pax'), name: 'Ophelia Webb', phone: '+44 7700 900456', relationship: 'Spouse', isEmergencyContact: true }],
      paymentMethods: [{ id: genId('pm'), brand: 'Mastercard', last4: '5588', expiry: '02/26', isDefault: true }],
      notificationPreference: { email: true, line: false, sms: false },
      privacyRequests: [{ id: genId('priv'), kind: 'DATA_DOWNLOAD', status: 'COMPLETED', requestedAt: Date.now() - 20 * 86_400_000 }],
      memberTier: 'PLATINUM',
      memberPoints: 12840,
      consentMarketing: true,
    },
    {
      id: 'cust-sofia',
      name: 'Sofia Alvarez',
      nameZh: '索菲亞 · 阿爾瓦雷斯',
      avatarEmoji: '👩🏽',
      phone: '+34 611 22 33 44',
      email: 'sofia.a@example.com',
      memberSince: iso(-20, 9),
      passengerTier: 'REGULAR',
      corporateAccountId: null,
      corporateName: null,
      taxIdUbn: null,
      carrierBarcode: null,
      notesAndPreferences: 'No smoking vehicle, prefers credit card payments.',
      isVip: false,
      promoVouchersCount: 0,
      lifetimeValueTwd: 1600,
      historicalOrders: historyFor([{ pickupId: 'tpe-airport', dropoffId: 'taipei-101', daysAgo: 18, type: 'AIRPORT_PICKUP', price: 1600 }]),
      savedPassengers: [],
      paymentMethods: [],
      notificationPreference: { email: true, line: true, sms: false },
      privacyRequests: [],
      memberTier: 'SILVER',
      memberPoints: 60,
      consentMarketing: true,
    },
    {
      id: 'cust-grace',
      name: 'Grace Park',
      nameZh: '朴恩智 (MediaTek Corp)',
      avatarEmoji: '👩🏻‍💼',
      phone: '+82 10-2233-4455',
      email: 'grace.p@example.com',
      memberSince: iso(-140, 9),
      passengerTier: 'CORP_EXECUTIVE',
      corporateAccountId: 'corp-mediatek',
      corporateName: 'MediaTek Inc. (聯發科)',
      taxIdUbn: '84149961',
      carrierBarcode: '/GP-8210',
      notesAndPreferences: 'Corporate B2B traveler, requires e-Invoice with Tax ID 84149961, prefers prompt airport pickup with meet & greet board.',
      isVip: true,
      promoVouchersCount: 3,
      lifetimeValueTwd: 45200,
      historicalOrders: historyFor([
        { pickupId: 'tpe-airport', dropoffId: 'w-hotel', daysAgo: 110, type: 'AIRPORT_PICKUP', price: 2100 },
        { pickupId: 'w-hotel', dropoffId: 'neihu-business', daysAgo: 108, type: 'TOUR_CHARTER', price: 1800 },
        { pickupId: 'neihu-business', dropoffId: 'tsa-airport', daysAgo: 105, type: 'AIRPORT_DROPOFF', price: 1200 },
        { pickupId: 'tpe-airport', dropoffId: 'grand-hyatt', daysAgo: 45, type: 'AIRPORT_PICKUP', price: 2200 },
      ]),
      savedPassengers: [],
      paymentMethods: [{ id: genId('pm'), brand: 'Visa', last4: '8892', expiry: '05/28', isDefault: true }],
      notificationPreference: { email: true, line: true, sms: true },
      privacyRequests: [],
      memberTier: 'PLATINUM',
      memberPoints: 8900,
      consentMarketing: true,
    },
    {
      id: 'cust-david-chang',
      name: 'David Chang',
      nameZh: '張家豪 (TSMC Procurement)',
      avatarEmoji: '👨🏻‍💼',
      phone: '+886 912 345 678',
      email: 'travel-procurement@tsmc.com',
      memberSince: iso(-280, 9),
      passengerTier: 'CORP_EXECUTIVE',
      corporateAccountId: 'corp-tsmc',
      corporateName: 'Taiwan Semiconductor Manufacturing Co. (TSMC)',
      taxIdUbn: '23307688',
      carrierBarcode: '/TSMC-01',
      notesAndPreferences: 'TSMC corporate monthly billing, direct Hsinchu Science Park ↔ Taoyuan Airport VIP transfers.',
      isVip: true,
      promoVouchersCount: 4,
      lifetimeValueTwd: 112000,
      historicalOrders: historyFor([
        { pickupId: 'hsinchu-science-park', dropoffId: 'tpe-airport', daysAgo: 260, type: 'AIRPORT_DROPOFF', price: 2400 },
        { pickupId: 'tpe-airport', dropoffId: 'hsinchu-science-park', daysAgo: 255, type: 'AIRPORT_PICKUP', price: 2400 },
        { pickupId: 'hsinchu-science-park', dropoffId: 'tpe-airport', daysAgo: 180, type: 'AIRPORT_DROPOFF', price: 2400 },
        { pickupId: 'tpe-airport', dropoffId: 'hsinchu-science-park', daysAgo: 175, type: 'AIRPORT_PICKUP', price: 2400 },
        { pickupId: 'hsinchu-science-park', dropoffId: 'tpe-airport', daysAgo: 30, type: 'AIRPORT_DROPOFF', price: 2400 },
      ]),
      savedPassengers: [],
      paymentMethods: [{ id: genId('pm'), brand: 'Visa', last4: '1109', expiry: '09/27', isDefault: true }],
      notificationPreference: { email: true, line: true, sms: false },
      privacyRequests: [],
      memberTier: 'PLATINUM',
      memberPoints: 21500,
      consentMarketing: true,
    },
    {
      id: 'cust-emily-chen',
      name: 'Emily Chen',
      nameZh: '陳雅婷 (Cathay VP)',
      avatarEmoji: '👩🏻‍💼',
      phone: '+886 934 567 890',
      email: 'executive-travel@cathayholdings.com.tw',
      memberSince: iso(-210, 9),
      passengerTier: 'CORP_EXECUTIVE',
      corporateAccountId: 'corp-cathay',
      corporateName: 'Cathay Financial Holding Co. (國泰金控)',
      taxIdUbn: '70774619',
      carrierBarcode: '/CFH-99',
      notesAndPreferences: 'Cathay executive business trips, requires punctual Mercedes/Tesla luxury vehicle.',
      isVip: true,
      promoVouchersCount: 2,
      lifetimeValueTwd: 64000,
      historicalOrders: historyFor([
        { pickupId: 'taipei-101', dropoffId: 'tpe-airport', daysAgo: 190, type: 'AIRPORT_DROPOFF', price: 2000 },
        { pickupId: 'tpe-airport', dropoffId: 'taipei-101', daysAgo: 185, type: 'AIRPORT_PICKUP', price: 2000 },
        { pickupId: 'taipei-101', dropoffId: 'tsa-airport', daysAgo: 60, type: 'AIRPORT_DROPOFF', price: 1100 },
      ]),
      savedPassengers: [],
      paymentMethods: [{ id: genId('pm'), brand: 'Mastercard', last4: '4432', expiry: '11/28', isDefault: true }],
      notificationPreference: { email: true, line: true, sms: true },
      privacyRequests: [],
      memberTier: 'PLATINUM',
      memberPoints: 14200,
      consentMarketing: true,
    },
  ]
}

const BULK_CHANNELS: Order['channel'][] = ['Website', 'LINE@', 'KKday', 'Booking.com', 'Klook', 'Phone / Agent', 'ezTravel']
const BULK_NAMES = [
  'Kenji Watanabe', 'Olivia Chen', 'Liam O’Connor', 'Anya Petrova', 'Noah Kim', 'Fatima Al-Sayed', 'Lucas Silva', 'Grace Park',
  'Ethan Brooks', 'Mia Rossi', 'Yusuf Demir', 'Chloe Martin', 'Ravi Shah', 'Hana Kobayashi', 'Diego Fernandez', 'Freya Nilsen',
  'David Miller', 'Sophie Dubois', 'Hans Mueller', 'Carlos Santana', 'Emily Watson', 'Alexander Wright', 'Elena Popova', 'Ji-Hoon Park',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomOrderNoCounter(start: number) {
  let n = start
  return () => `FP-${n++}`
}

function buildBulkActiveOrder(id: string, orderNo: string, status: OrderStatus, ageMinutes: number): Order {
  const isAirport = Math.random() > 0.4
  let pickupId: string
  let dropoffId: string
  if (isAirport) {
    const airport = pickRandom(LOCATIONS.filter((l) => l.isAirport))
    const other = pickRandom(LOCATIONS.filter((l) => !l.isAirport && l.region === airport.region))
    const inbound = Math.random() > 0.5
    pickupId = inbound ? airport.id : (other ?? LOCATIONS[0]).id
    dropoffId = inbound ? (other ?? LOCATIONS[0]).id : airport.id
  } else {
    const region = pickRandom(['TAIPEI', 'NEW_TAIPEI', 'TAOYUAN', 'TAICHUNG', 'KAOHSIUNG', 'HUALIEN', 'TAINAN', 'NANTOU', 'HSINCHU', 'TAITUNG'])
    const inRegion = LOCATIONS.filter((l) => l.region === region)
    const a = pickRandom(inRegion.length >= 2 ? inRegion : LOCATIONS)
    let b = pickRandom(inRegion.length >= 2 ? inRegion : LOCATIONS)
    if (b.id === a.id) b = LOCATIONS[(LOCATIONS.indexOf(a) + 1) % LOCATIONS.length]
    pickupId = a.id
    dropoffId = b.id
  }

  const category = pickRandom(ALL_CATEGORIES)
  const vehicleType = CATEGORY_TO_PHYSICAL_TYPE[category]
  const channel = pickRandom(BULK_CHANNELS)
  const name = pickRandom(BULK_NAMES)
  const createdAt = Date.now() - ageMinutes * 60_000
  const order = buildOrderBase({
    id,
    orderNo,
    channel,
    pickupId,
    dropoffId,
    vehicleType,
    vehicleCategory: category,
    passengers: 1 + Math.floor(Math.random() * 5),
    luggage: Math.floor(Math.random() * 4),
    scheduledTime: new Date(Date.now() + (20 + Math.random() * 200) * 60_000).toISOString(),
    customer: { name, phone: '+1 555-0100', email: `${name.split(' ')[0].toLowerCase()}@example.com` },
    flightNumber: isAirport ? `${pickRandom(['CI', 'BR', 'JL', 'NH', 'SQ', 'CX'])}${100 + Math.floor(Math.random() * 800)}` : '',
  })

  order.createdAt = createdAt
  order.status = status
  order.paymentStatus = status === 'DRAFT' || status === 'PENDING_PAYMENT' ? 'UNPAID' : 'PAID'
  order.supplierStatus = channel === 'Website' || channel === 'Phone / Agent' || channel === 'LINE@' ? 'NOT_APPLICABLE' : status === 'SUPPLIER_PENDING' ? 'PENDING' : 'CONFIRMED'
  order.voucherStatus = ['DRAFT', 'PENDING_PAYMENT'].includes(status) ? 'NOT_ISSUED' : 'ISSUED'
  order.statusHistory = [{ id: genId('hist'), status, at: createdAt, actor: 'CUSTOMER' }]
  order.auditLog = [{ id: genId('aud'), at: createdAt, actor: 'CUSTOMER', action: `Order created via ${channel}` }]
  const translation = computeTranslationFields(channel, name, id)
  order.translationStatus = translation.translationStatus
  order.sourceLanguage = translation.sourceLanguage
  order.originalNoteText = translation.originalNoteText
  if (translation.notes) order.notes = translation.notes
  return order
}

function buildBulkCompletedOrder(id: string, orderNo: string, ageMinutes: number): Order {
  const isAirport = Math.random() > 0.45
  let pickupId: string
  let dropoffId: string
  const region = pickRandom(['TAIPEI', 'NEW_TAIPEI', 'TAOYUAN', 'TAICHUNG', 'KAOHSIUNG', 'HUALIEN', 'TAINAN', 'NANTOU', 'HSINCHU', 'TAITUNG'])
  const inRegion = LOCATIONS.filter((l) => l.region === region)
  if (isAirport && inRegion.some((l) => l.isAirport)) {
    const airport = inRegion.find((l) => l.isAirport)!
    const other = pickRandom(inRegion.filter((l) => !l.isAirport).length ? inRegion.filter((l) => !l.isAirport) : LOCATIONS)
    const inbound = Math.random() > 0.5
    pickupId = inbound ? airport.id : other.id
    dropoffId = inbound ? other.id : airport.id
  } else {
    const a = pickRandom(inRegion.length >= 2 ? inRegion : LOCATIONS)
    let b = pickRandom(inRegion.length >= 2 ? inRegion : LOCATIONS)
    if (b.id === a.id) b = LOCATIONS[(LOCATIONS.indexOf(a) + 1) % LOCATIONS.length]
    pickupId = a.id
    dropoffId = b.id
  }

  const category = pickRandom(ALL_CATEGORIES)
  const vehicleType = CATEGORY_TO_PHYSICAL_TYPE[category]
  const channel = pickRandom(BULK_CHANNELS)
  const name = pickRandom(BULK_NAMES)
  const createdAt = Date.now() - ageMinutes * 60_000 - 40 * 60_000
  const completedAt = Date.now() - ageMinutes * 60_000

  const order = buildOrderBase({
    id,
    orderNo,
    channel,
    pickupId,
    dropoffId,
    vehicleType,
    vehicleCategory: category,
    passengers: 1 + Math.floor(Math.random() * 5),
    luggage: Math.floor(Math.random() * 4),
    scheduledTime: new Date(createdAt + 30 * 60_000).toISOString(),
    customer: { name, phone: '+1 555-0100', email: `${name.split(' ')[0].toLowerCase()}@example.com` },
  })

  order.createdAt = createdAt
  order.status = 'COMPLETED'
  order.legProgress = 1
  order.paymentStatus = 'PAID'
  order.voucherStatus = 'REDEEMED'
  order.driverRatingByCustomer = 4 + Math.round(Math.random())
  const translation = computeTranslationFields(channel, name, id)
  order.translationStatus = translation.translationStatus
  order.sourceLanguage = translation.sourceLanguage
  order.originalNoteText = translation.originalNoteText
  if (translation.notes) order.notes = translation.notes
  order.statusHistory = [
    { id: genId('hist'), status: 'CONFIRMED', at: createdAt, actor: 'CUSTOMER' },
    { id: genId('hist'), status: 'ASSIGNED', at: createdAt + 3 * 60_000, actor: 'DISPATCHER' },
    { id: genId('hist'), status: 'DRIVER_EN_ROUTE', at: createdAt + 6 * 60_000, actor: 'DRIVER' },
    { id: genId('hist'), status: 'ARRIVED', at: createdAt + 18 * 60_000, actor: 'SYSTEM' },
    { id: genId('hist'), status: 'PASSENGER_ONBOARD', at: createdAt + 20 * 60_000, actor: 'DRIVER' },
    { id: genId('hist'), status: 'COMPLETED', at: completedAt, actor: 'SYSTEM' },
  ]
  return order
}

export function createSeedState(): {
  orders: Order[]
  drivers: Driver[]
  notifications: AppNotification[]
  customerProfiles: CustomerProfile[]
} {
  const homeBaseIds = [
    'taipei-main-station', 'taipei-101', 'ximending', 'neihu-business', 'banqiao-station',
    'tpe-airport', 'tsa-airport', 'taoyuan-hsr', 'hsinchu-hsr', 'taichung-hsr',
    'tainan-hsr', 'kaohsiung-hsr', 'hualien-city', 'taitung-city', 'sun-moon-lake', 'jiufen',
  ]

  const drivers: Driver[] = BASE_DRIVERS.map((d, i) => {
    const vehicle = SEED_VEHICLES.find((v) => v.id === d.vehicleId)!
    const homeLocId = homeBaseIds[i % homeBaseIds.length]
    const homeLoc = getLocation(homeLocId)
    const isBusy = i === 0 || i === 2 || i === 3
    const isOffline = i > 300 && i % 4 === 0

    // Assign realistic driver shifts: Morning, Day, Night, Custom
    const shiftType = i % 4 === 0 ? 'MORNING' : i % 4 === 1 ? 'DAY' : i % 4 === 2 ? 'NIGHT' : 'CUSTOM'
    const shiftTiming =
      shiftType === 'MORNING'
        ? { shiftStart: '06:00', shiftEnd: '14:00', breakStart: '10:00', breakEnd: '10:30' }
        : shiftType === 'DAY'
        ? { shiftStart: '09:00', shiftEnd: '18:00', breakStart: '12:30', breakEnd: '13:30' }
        : shiftType === 'NIGHT'
        ? { shiftStart: '18:00', shiftEnd: '03:00', breakStart: '22:00', breakEnd: '22:30' }
        : { shiftStart: '07:00', shiftEnd: '17:00', breakStart: '12:00', breakEnd: '13:00' }

    return {
      ...d,
      status: isBusy ? 'BUSY' : isOffline ? 'OFFLINE' : 'AVAILABLE',
      lat: homeLoc.lat + (Math.random() - 0.5) * 0.02,
      lng: homeLoc.lng + (Math.random() - 0.5) * 0.02,
      svgX: homeLoc.svgX + (Math.random() - 0.5) * 40,
      svgY: homeLoc.svgY + (Math.random() - 0.5) * 40,
      vehicleId: vehicle.id,
      stats: buildDriverStats(d.id, d.completedTrips),
      shiftSchedule: buildShiftSchedule(d.id),
      workingHours: {
        shiftType,
        ...shiftTiming,
        activeDays: [1, 2, 3, 4, 5, 6],
        onShift: !isOffline,
        customLabel: shiftType === 'CUSTOM' ? '彈性日班 07:00-17:00' : undefined,
      },
      unresponsiveFlagUntil: null,
      unresponsiveOrderNo: null,
      workingMode: (['AIRPORT_PRIORITY', 'CITY_PRIORITY', 'ANY'] as const)[i % 3],
      currentZone: homeLoc.name,
      autoAcceptEnabled: i % 3 === 0,
      airportPreference: i % 2 === 0,
      shiftStartedAt: Date.now() - (1 + (i % 6)) * 3_600_000,
    loginEnabled: true,
    serviceMinutesToday: 120 + ((i * 31) % 240),
    breakMode: false,
    lastBreakStartedAt: null,
    lastInspectionPassedAt: Date.now() - ((i * 19) % 3600) * 1000,
    inspectionChecklist: { tires: true, brakes: true, lights: true, dashcam: true },
    walletBalance: 4500 + ((i * 280) % 15000),
    instantCashoutHistory: [],
  }
})

  const findDriver = (id: string) => drivers.find((d) => d.id === id)!

  const orders: Order[] = []
  const nextNo = randomOrderNoCounter(1030)

  // ---- Flagship narrative orders (hand-authored, real drivers/positions) ----

  const o1 = buildOrderBase({
    id: 'ord-1', orderNo: 'FP-1042', channel: 'KKday', pickupId: 'tpe-airport', dropoffId: 'grand-hyatt', vehicleType: 'SUV', vehicleCategory: 'SUV', passengers: 3, luggage: 3,
    scheduledTime: iso(0, new Date().getHours() + 2), customer: { name: 'Haruto Sasaki', phone: '+81 90-1234-5678', email: 'haruto.s@example.com' },
    flightNumber: 'NH851', notes: 'Family with a toddler, prefers child seat if available.',
    passengerRequirements: { ...NO_REQUIREMENTS, childSeat: true },
  })
  o1.supplierStatus = 'CONFIRMED'
  orders.push(o1)

  const o2 = buildOrderBase({
    id: 'ord-2', orderNo: 'FP-1039', channel: 'Website', pickupId: 'grand-hyatt', dropoffId: 'jiufen', vehicleType: 'VAN', vehicleCategory: 'VAN_6', passengers: 5, luggage: 2,
    scheduledTime: iso(0, new Date().getHours() + 1), customer: { name: 'Emma Whitfield', phone: '+1 415-555-0199', email: 'emma.w@example.com' },
    notes: 'Full-day charter, 3 stops requested (Jiufen, Shifen, Houtong).',
  })
  o2.status = 'ASSIGNED'
  o2.driverId = 'drv-3'
  o2.vehicleId = 'veh-3'
  o2.statusHistory = [...o2.statusHistory, { id: genId('hist'), status: 'ASSIGNED', at: Date.now() - 6 * 60_000, actor: 'DISPATCHER' }]
  orders.push(o2)

  const o3 = buildOrderBase({
    id: 'ord-3', orderNo: 'FP-1035', channel: 'Booking.com', pickupId: 'ximending', dropoffId: 'tpe-airport', vehicleType: 'SEDAN', vehicleCategory: 'COMFORT_SEDAN', passengers: 2, luggage: 2,
    scheduledTime: iso(0, new Date().getHours() + 1, 30), customer: { name: 'Isabelle Laurent', phone: '+33 6 12 34 56 78', email: 'isabelle.l@example.com' },
    flightNumber: 'CI67', notes: 'Please arrive 15 minutes early, connecting to international flight.',
  })
  o3.status = 'DRIVER_EN_ROUTE'
  o3.driverId = 'drv-1'
  o3.vehicleId = 'veh-1'
  o3.legProgress = 0.38
  o3.statusHistory = [
    ...o3.statusHistory,
    { id: genId('hist'), status: 'ASSIGNED', at: Date.now() - 9 * 60_000, actor: 'DISPATCHER' },
    { id: genId('hist'), status: 'DRIVER_EN_ROUTE', at: Date.now() - 2 * 60_000, actor: 'DRIVER' },
  ]
  orders.push(o3)

  const o4 = buildOrderBase({
    id: 'ord-4', orderNo: 'FP-1031', channel: 'LINE@', pickupId: 'taipei-main-station', dropoffId: 'tsa-airport', vehicleType: 'LUXURY', vehicleCategory: 'LUXURY_VAN', passengers: 1, luggage: 1,
    scheduledTime: iso(0, new Date().getHours()), customer: { name: 'Marcus Webb', phone: '+44 7700 900123', email: 'marcus.webb@example.com' },
    flightNumber: 'BR212', notes: 'VIP client, silent ride preferred.',
  })
  o4.status = 'PASSENGER_ONBOARD'
  o4.driverId = 'drv-4'
  o4.vehicleId = 'veh-4'
  o4.legProgress = 0.62
  o4.pickedUpAt = Date.now() - 5 * 60_000
  o4.statusHistory = [
    ...o4.statusHistory,
    { id: genId('hist'), status: 'ASSIGNED', at: Date.now() - 20 * 60_000, actor: 'DISPATCHER' },
    { id: genId('hist'), status: 'DRIVER_EN_ROUTE', at: Date.now() - 15 * 60_000, actor: 'DRIVER' },
    { id: genId('hist'), status: 'ARRIVED', at: Date.now() - 6 * 60_000, actor: 'SYSTEM' },
    { id: genId('hist'), status: 'PASSENGER_ONBOARD', at: Date.now() - 5 * 60_000, actor: 'DRIVER' },
  ]
  orders.push(o4)

  const o5 = buildOrderBase({
    id: 'ord-5', orderNo: 'FP-1024', channel: 'Klook', pickupId: 'tpe-airport', dropoffId: 'taipei-101', vehicleType: 'SEDAN', vehicleCategory: 'ECONOMY_SEDAN', passengers: 2, luggage: 2,
    scheduledTime: iso(0, Math.max(0, new Date().getHours() - 3)), customer: { name: 'Sofia Alvarez', phone: '+34 611 22 33 44', email: 'sofia.a@example.com' },
    flightNumber: 'SQ879', notes: '',
  })
  o5.status = 'COMPLETED'
  o5.driverId = 'drv-6'
  o5.vehicleId = 'veh-6'
  o5.legProgress = 1
  o5.driverRatingByCustomer = 5
  o5.statusHistory = [
    ...o5.statusHistory,
    { id: genId('hist'), status: 'ASSIGNED', at: Date.now() - 200 * 60_000, actor: 'DISPATCHER' },
    { id: genId('hist'), status: 'DRIVER_EN_ROUTE', at: Date.now() - 190 * 60_000, actor: 'DRIVER' },
    { id: genId('hist'), status: 'ARRIVED', at: Date.now() - 180 * 60_000, actor: 'SYSTEM' },
    { id: genId('hist'), status: 'PASSENGER_ONBOARD', at: Date.now() - 178 * 60_000, actor: 'DRIVER' },
    { id: genId('hist'), status: 'COMPLETED', at: Date.now() - 155 * 60_000, actor: 'SYSTEM' },
  ]
  orders.push(o5)

  const o6 = buildOrderBase({
    id: 'ord-6', orderNo: 'FP-1046', channel: 'KKday', pickupId: 'tpe-airport', dropoffId: 'w-hotel', vehicleType: 'SUV', vehicleCategory: 'SUV', passengers: 2, luggage: 3,
    scheduledTime: iso(0, new Date().getHours() + 3), customer: { name: 'Grace Park', phone: '+82 10-2233-4455', email: 'grace.p@example.com' },
    flightNumber: 'KE185', notes: 'Requested cancellation — travel plans changed.',
  })
  o6.status = 'CANCELLATION_REQUESTED'
  o6.cancellationReason = 'Flight rescheduled to a different day'
  o6.statusHistory = [...o6.statusHistory, { id: genId('hist'), status: 'CANCELLATION_REQUESTED', at: Date.now() - 12 * 60_000, actor: 'CUSTOMER' }]
  o6.auditLog = [...o6.auditLog, { id: genId('aud'), at: Date.now() - 12 * 60_000, actor: 'CUSTOMER', action: 'Requested cancellation', detail: o6.cancellationReason }]
  orders.push(o6)

  const o7 = buildOrderBase({
    id: 'ord-7', orderNo: 'FP-1018', channel: 'Booking.com', pickupId: 'taipei-101', dropoffId: 'tsa-airport', vehicleType: 'SEDAN', vehicleCategory: 'ECONOMY_SEDAN', passengers: 1, luggage: 1,
    scheduledTime: iso(-1, 14), customer: { name: 'Diego Fernandez', phone: '+34 622 33 44 55', email: 'diego.f@example.com' },
    flightNumber: 'IB6754', notes: '',
  })
  o7.status = 'REFUND_PENDING'
  o7.paymentStatus = 'REFUND_PENDING'
  o7.cancellationReason = 'Duplicate booking made in error'
  o7.refundAmount = o7.priceEstimate
  o7.statusHistory = [
    ...o7.statusHistory,
    { id: genId('hist'), status: 'CANCELLATION_REQUESTED', at: Date.now() - 90 * 60_000, actor: 'CUSTOMER' },
    { id: genId('hist'), status: 'CANCELLED', at: Date.now() - 80 * 60_000, actor: 'DISPATCHER' },
    { id: genId('hist'), status: 'REFUND_PENDING', at: Date.now() - 79 * 60_000, actor: 'SYSTEM' },
  ]
  orders.push(o7)

  // Apply live positions for active drivers to match their orders' progress.
  const d1 = findDriver('drv-1')
  d1.status = 'BUSY'
  const approachRoute3 = buildRoutePath(
    { ...o3.pickup, lat: d1.lat, lng: d1.lng, svgX: d1.svgX, svgY: d1.svgY, id: 'drv1-home', name: '', nameZh: '', address: '', isAirport: false },
    o3.pickup,
    'seed-approach-drv1',
  )
  const pos = evaluateRoute(approachRoute3, o3.legProgress)
  o3.routeToPickup = approachRoute3
  o3.currentPos = pos
  d1.lat = pos.lat
  d1.lng = pos.lng
  d1.svgX = pos.x
  d1.svgY = pos.y

  const d4 = findDriver('drv-4')
  d4.status = 'BUSY'
  const legDropoff4 = o4.routeToDropoff!
  const pos4 = evaluateRoute(legDropoff4, o4.legProgress)
  o4.currentPos = pos4
  d4.lat = pos4.lat
  d4.lng = pos4.lng
  d4.svgX = pos4.x
  d4.svgY = pos4.y

  const d3 = findDriver('drv-3')
  d3.status = 'BUSY'
  const d3Loc = o2.pickup
  d3.lat = d3Loc.lat + 0.004
  d3.lng = d3Loc.lng + 0.004
  d3.svgX = d3Loc.svgX + 8
  d3.svgY = d3Loc.svgY + 8

  // ---- Bulk active orders (~75 active orders across all lifecycle states) ----
  const bulkActiveStatuses: OrderStatus[] = [
    'DRAFT', 'PENDING_PAYMENT', 'PAID', 'SUPPLIER_PENDING',
    'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'DRIVER_MATCHING',
    'CONFIRMED', 'DRIVER_MATCHING', 'SUPPLIER_PENDING', 'CONFIRMED',
  ]

  const bulkActiveCount = 75
  for (let i = 0; i < bulkActiveCount; i++) {
    const status = bulkActiveStatuses[i % bulkActiveStatuses.length]
    const ageMinutes = Math.random() * 180
    orders.push(buildBulkActiveOrder(`ord-bulk-active-${i}`, nextNo(), status, ageMinutes))
  }

  // ---- Bulk completed orders (~215 completed orders across all time windows) ----
  const completedBuckets: { count: number; minAge: number; maxAge: number }[] = [
    { count: 10, minAge: 5, maxAge: 175 },       // last 3h
    { count: 6, minAge: 181, maxAge: 235 },      // 3h-4h
    { count: 30, minAge: 241, maxAge: 1420 },    // 4h-24h (today)
    { count: 65, minAge: 1450, maxAge: 10000 },  // 1-7 days (this week)
    { count: 104, minAge: 10100, maxAge: 43000 }, // 7-30 days (this month)
  ]

  let bulkIdx = 0
  for (const bucket of completedBuckets) {
    for (let i = 0; i < bucket.count; i++) {
      const ageMinutes = bucket.minAge + Math.random() * (bucket.maxAge - bucket.minAge)
      orders.push(buildBulkCompletedOrder(`ord-bulk-completed-${bulkIdx}`, nextNo(), ageMinutes))
      bulkIdx++
    }
  }

  // Terminal CANCELLED / FAILED / REFUNDED orders for realism in Fleet OS filters.
  for (let i = 0; i < 6; i++) {
    const ageMinutes = 60 + Math.random() * 4000
    const o = buildBulkActiveOrder(`ord-bulk-terminal-${i}`, nextNo(), 'CONFIRMED', ageMinutes)
    o.status = i % 2 === 0 ? 'CANCELLED' : 'FAILED'
    o.paymentStatus = i % 2 === 0 ? 'REFUNDED' : 'FAILED'
    o.statusHistory = [...o.statusHistory, { id: genId('hist'), status: o.status, at: Date.now() - ageMinutes * 60_000 + 5 * 60_000, actor: i % 2 === 0 ? 'DISPATCHER' : 'PAYMENT' }]
    orders.push(o)
  }

  const notifications: AppNotification[] = [
    {
      id: genId('ntf'), timestamp: Date.now() - 2 * 60_000, kind: 'INFO', titleKey: 'notif.driverEnRoute.title', messageKey: 'notif.seedEnRoute.message',
      params: { driverName: findDriver('drv-1').name, orderNo: o3.orderNo }, orderId: o3.id,
    },
    {
      id: genId('ntf'), timestamp: Date.now() - 5 * 60_000, kind: 'SUCCESS', titleKey: 'notif.passengerPickedUp.title', messageKey: 'notif.seedPickedUp.message',
      params: { driverName: findDriver('drv-4').name, orderNo: o4.orderNo }, orderId: o4.id,
    },
    {
      id: genId('ntf'), timestamp: Date.now() - 25 * 60_000, kind: 'SUCCESS', titleKey: 'notif.tripCompleted.title', messageKey: 'notif.seedCompleted.message',
      params: { orderNo: o5.orderNo }, orderId: o5.id,
    },
    {
      id: genId('ntf'), timestamp: Date.now() - 1 * 60_000, kind: 'WARNING', titleKey: 'notif.docExpiring.title', messageKey: 'notif.docExpiring.message',
      params: { driverName: findDriver('drv-2').name, days: 9 },
    },
    {
      id: genId('ntf'), timestamp: Date.now() - 12 * 60_000, kind: 'WARNING', titleKey: 'notif.cancellationRequested.title', messageKey: 'notif.cancellationRequested.message',
      params: { orderNo: o6.orderNo }, orderId: o6.id,
    },
  ]

  return { orders, drivers, notifications, customerProfiles: buildCustomerProfiles() }
}
