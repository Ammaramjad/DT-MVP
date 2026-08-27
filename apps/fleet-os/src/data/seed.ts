import type { AppNotification, CustomerProfile, Driver, DriverStats, DocumentRecord, Order, OrderStatus, PassengerRequirements, TaiwanRegion, Vehicle, VehicleCategory } from '../types'
import { getLocation, LOCATIONS, REGIONS } from './locations'
import { buildRoutePath, evaluateRoute } from '../lib/geo'
import { computeFareBreakdown, estimateDurationMin, genId } from '../lib/pricing'
import { lookupFlight } from '../lib/flight'
import { buildShiftSchedule } from '../lib/capacity'
import { DEFAULT_CATEGORY_FOR_TYPE, VEHICLE_CATEGORY_CATALOG } from '../lib/../data/vehicleCatalog'

const NO_REQUIREMENTS: PassengerRequirements = { childSeat: false, wheelchair: false, pet: false, specialAssistance: '' }

/** Rotates a physical vehicle type through its customer-facing sub-categories
 * so the 24-vehicle seed fleet covers all 10 categories with realistic
 * distribution (e.g. every 4th VAN-typed vehicle is the wheelchair-accessible
 * one) rather than collapsing every physical type down to one category. */
const SEDAN_ROTATION: VehicleCategory[] = ['ECONOMY_SEDAN', 'COMFORT_SEDAN', 'PREMIUM_SEDAN']
const VAN_ROTATION: VehicleCategory[] = ['VAN_6', 'VAN_9', 'ACCESSIBLE', 'LUXURY_VAN']
const occurrenceByType: Record<Vehicle['type'], number> = { SEDAN: 0, SUV: 0, VAN: 0, LUXURY: 0, MINIBUS: 0 }
function categoryForVehicleType(type: Vehicle['type']): VehicleCategory {
  const occurrence = occurrenceByType[type]++
  if (type === 'SEDAN') return SEDAN_ROTATION[occurrence % SEDAN_ROTATION.length]
  if (type === 'VAN') return VAN_ROTATION[occurrence % VAN_ROTATION.length]
  return DEFAULT_CATEGORY_FOR_TYPE[type]
}

const SERVICE_ZONE_ROTATION: TaiwanRegion[] = REGIONS.map((r) => r.key)
function zoneForIndex(i: number): TaiwanRegion {
  // Weight the rotation so Greater Taipei/Taoyuan (where the live simulation
  // actually runs) gets the bulk of the fleet, with a handful of vehicles
  // seeded into every other Taiwan zone for the Fleet OS supply/demand chart.
  const weighted: TaiwanRegion[] = ['TAIPEI', 'TAIPEI', 'NEW_TAIPEI', 'TAOYUAN', 'TAOYUAN', ...SERVICE_ZONE_ROTATION]
  return weighted[i % weighted.length]
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

type BaseVehicleSeed = Pick<Vehicle, 'id' | 'plate' | 'type' | 'colorHex' | 'capacity' | 'driverId'>

const BASE_VEHICLE_SEEDS: BaseVehicleSeed[] = [
  { id: 'veh-1', plate: 'ABC-5581', type: 'SEDAN', colorHex: '#22d3ee', capacity: 3, driverId: 'drv-1' },
  { id: 'veh-2', plate: 'AFG-2210', type: 'SUV', colorHex: '#a855f7', capacity: 5, driverId: 'drv-2' },
  { id: 'veh-3', plate: 'AKT-7754', type: 'VAN', colorHex: '#fbbf24', capacity: 7, driverId: 'drv-3' },
  { id: 'veh-4', plate: 'ARL-0093', type: 'LUXURY', colorHex: '#f472b6', capacity: 3, driverId: 'drv-4' },
  { id: 'veh-5', plate: 'AWY-4471', type: 'MINIBUS', colorHex: '#a3e635', capacity: 12, driverId: 'drv-5' },
  { id: 'veh-6', plate: 'ABD-6620', type: 'SEDAN', colorHex: '#38bdf8', capacity: 3, driverId: 'drv-6' },
  { id: 'veh-7', plate: 'AJX-1138', type: 'SUV', colorHex: '#fb923c', capacity: 5, driverId: 'drv-7' },
]

const EXTRA_VEHICLE_TYPES: Vehicle['type'][] = ['SEDAN', 'SUV', 'VAN', 'SEDAN', 'LUXURY', 'SUV', 'SEDAN', 'MINIBUS', 'SEDAN', 'SUV', 'VAN', 'SEDAN', 'SEDAN', 'SUV', 'LUXURY', 'SEDAN', 'VAN']
const EXTRA_VEHICLE_COLORS = ['#22d3ee', '#a855f7', '#fbbf24', '#f472b6', '#a3e635', '#38bdf8', '#fb923c', '#60a5fa', '#f87171', '#34d399', '#e879f9', '#facc15', '#4ade80', '#818cf8', '#fb7185', '#2dd4bf', '#c084fc']
for (let i = 0; i < 17; i++) {
  const id = `drv-${8 + i}`
  BASE_VEHICLE_SEEDS.push({ id: `veh-${8 + i}`, plate: `A${(10 + i).toString(36).toUpperCase()}-${4000 + i * 37}`, type: EXTRA_VEHICLE_TYPES[i], colorHex: EXTRA_VEHICLE_COLORS[i], capacity: { SEDAN: 3, SUV: 5, VAN: 7, LUXURY: 3, MINIBUS: 12 }[EXTRA_VEHICLE_TYPES[i]], driverId: id })
}

/** Expands each base (plate/type/capacity) seed into a full `Vehicle` record
 * with the Phase 4 fleet-inventory fields — customer-facing category,
 * luggage capacity, service zone, feature set, and insurance/compliance/
 * maintenance state. A small, deterministic slice of the fleet is seeded
 * with an expiring/flagged document or an active maintenance block so the
 * Fleet OS `/fleet-os/vehicles` module and the dispatch-eligibility filter
 * both have real "excluded vehicle" cases to demo out of the box. */
export const SEED_VEHICLES: Vehicle[] = BASE_VEHICLE_SEEDS.map((v, i) => {
  const category = categoryForVehicleType(v.type)
  const catalogEntry = VEHICLE_CATEGORY_CATALOG[category]
  const serviceZone = zoneForIndex(i)
  const insuranceStatus: Vehicle['insuranceStatus'] = i === 12 ? 'EXPIRED' : i % 8 === 3 ? 'EXPIRING' : 'VALID'
  const complianceStatus: Vehicle['complianceStatus'] = i === 19 ? 'FLAGGED' : 'OK'
  const underMaintenance = i === 9
  return {
    ...v,
    category,
    luggageCapacity: catalogEntry.maxLuggage,
    serviceZone,
    features: catalogEntry.features,
    insuranceStatus,
    complianceStatus,
    maintenanceUntil: underMaintenance ? Date.now() + 3 * 3_600_000 : null,
    maintenanceReason: underMaintenance ? 'Scheduled brake service' : null,
  } satisfies Vehicle
})

const BASE_DRIVERS: Omit<
  Driver,
  'status' | 'lat' | 'lng' | 'svgX' | 'svgY' | 'stats' | 'shiftSchedule' | 'unresponsiveFlagUntil' | 'unresponsiveOrderNo' | 'workingMode' | 'currentZone' | 'autoAcceptEnabled' | 'airportPreference' | 'shiftStartedAt'
>[] = [
  {
    id: 'drv-1', name: 'Chih-Ming Chen', nameZh: '\u9673\u5fd7\u660e', avatarEmoji: '\ud83e\uddd1\ud83c\udffb\u200d\u2708\ufe0f', colorHex: '#22d3ee', phone: '0912-345-671', tier: 'OWNED_FLEET', rating: 4.9, completedTrips: 812, vehicleId: 'veh-1',
    documents: { license: doc('TPE-DL-88213', iso(210, 0), 'VALID'), insurance: doc('INS-2291-A', iso(160, 0), 'VALID'), registration: doc('REG-1188-A', iso(280, 0), 'VALID'), inspection: doc('INSP-3301-A', iso(95, 0), 'VALID') },
  },
  {
    id: 'drv-2', name: 'Mei-Hui Lin', nameZh: '\u6797\u7f8e\u60e0', avatarEmoji: '\ud83d\udc69\ud83c\udffb\u200d\u2708\ufe0f', colorHex: '#a855f7', phone: '0922-118-430', tier: 'OWNED_FLEET', rating: 4.8, completedTrips: 654, vehicleId: 'veh-2',
    documents: { license: doc('TPE-DL-77120', iso(9, 0), 'EXPIRING'), insurance: doc('INS-1187-B', iso(300, 0), 'VALID'), registration: doc('REG-2210-B', iso(180, 0), 'VALID'), inspection: doc('INSP-4402-B', iso(40, 0), 'VALID') },
  },
  {
    id: 'drv-3', name: 'Da-Tong Wang', nameZh: '\u738b\u5927\u540c', avatarEmoji: '\ud83e\uddd1\ud83c\udffd\u200d\u2708\ufe0f', colorHex: '#fbbf24', phone: '0933-882-041', tier: 'PAID_MEMBER', rating: 4.7, completedTrips: 401, vehicleId: 'veh-3',
    documents: { license: doc('TPE-DL-55302', iso(120, 0), 'VALID'), insurance: doc('INS-3391-C', iso(5, 0), 'EXPIRING'), registration: doc('REG-3321-C', iso(210, 0), 'VALID'), inspection: doc('INSP-5503-C', iso(150, 0), 'VALID', 'PENDING') },
  },
  {
    id: 'drv-4', name: 'Chia-Hao Chang', nameZh: '\u5f35\u5bb6\u8c6a', avatarEmoji: '\ud83e\uddd1\ud83c\udffb\u200d\u2708\ufe0f', colorHex: '#f472b6', phone: '0955-206-889', tier: 'PAID_MEMBER', rating: 5.0, completedTrips: 289, vehicleId: 'veh-4',
    documents: { license: doc('TPE-DL-90911', iso(88, 0), 'VALID'), insurance: doc('INS-4471-D', iso(200, 0), 'VALID'), registration: doc('REG-4432-D', iso(300, 0), 'VALID'), inspection: doc('INSP-6604-D', iso(60, 0), 'VALID') },
  },
  {
    id: 'drv-5', name: 'Wen-Bin Li', nameZh: '\u674e\u6587\u5f6c', avatarEmoji: '\ud83e\uddd1\ud83c\udffb\u200d\u2708\ufe0f', colorHex: '#a3e635', phone: '0966-773-215', tier: 'OUTSIDE_CONTRACTOR', rating: 4.6, completedTrips: 133, vehicleId: 'veh-5',
    documents: { license: doc('TPE-DL-33218', iso(-3, 0), 'EXPIRED'), insurance: doc('INS-5521-E', iso(45, 0), 'VALID'), registration: doc('REG-5543-E', iso(20, 0), 'VALID'), inspection: doc('INSP-7705-E', iso(-10, 0), 'EXPIRED', 'FLAGGED') },
  },
  {
    id: 'drv-6', name: 'Shu-Fen Huang', nameZh: '\u9ec3\u6dd1\u82ac', avatarEmoji: '\ud83d\udc69\ud83c\udffb\u200d\u2708\ufe0f', colorHex: '#38bdf8', phone: '0977-664-902', tier: 'OWNED_FLEET', rating: 4.9, completedTrips: 977, vehicleId: 'veh-6',
    documents: { license: doc('TPE-DL-10087', iso(365, 0), 'VALID'), insurance: doc('INS-6631-F', iso(365, 0), 'VALID'), registration: doc('REG-6654-F', iso(365, 0), 'VALID'), inspection: doc('INSP-8806-F', iso(365, 0), 'VALID') },
  },
  {
    id: 'drv-7', name: 'Chien-Cheng Wu', nameZh: '\u5433\u5efa\u6210', avatarEmoji: '\ud83e\uddd1\ud83c\udffd\u200d\u2708\ufe0f', colorHex: '#fb923c', phone: '0988-402-671', tier: 'OUTSIDE_CONTRACTOR', rating: 4.5, completedTrips: 76, vehicleId: 'veh-7',
    documents: { license: doc('TPE-DL-20044', iso(60, 0), 'VALID'), insurance: doc('INS-7741-G', iso(12, 0), 'EXPIRING'), registration: doc('REG-7765-G', iso(90, 0), 'VALID'), inspection: doc('INSP-9907-G', iso(75, 0), 'VALID') },
  },
]

const EXTRA_NAMES: [string, string][] = [
  ['Yu-Ting Kuo', '\u90ed\u96e8\u5ef7'], ['Kai-Wen Hsu', '\u8a31\u51f1\u6587'], ['Pei-Ru Lai', '\u8cf4\u4f69\u5982'], ['Zhi-Qiang Peng', '\u5f6d\u667a\u5f37'],
  ['Hui-Ling Cai', '\u8521\u60e0\u73b2'], ['Jun-Jie Xie', '\u8b1d\u5049\u6770'], ['Shu-Wen Yang', '\u6768\u6dd1\u6587'], ['Bo-Han Liu', '\u5289\u535a\u542b'],
  ['Yi-Chun Ho', '\u4f55\u4f9d\u6625'], ['Zong-Han Su', '\u82cf\u5b97\u6f22'], ['Meng-Yao Fang', '\u65b9\u5b5f\u745e'], ['Jia-Le Zhu', '\u6731\u5609\u6a02'],
  ['Xin-Yi Lu', '\u9b6f\u5fc3\u601d'], ['Guan-Yu Deng', '\u9127\u5b98\u5b87'], ['Rui-En Tang', '\u6c64\u745e\u6069'], ['Wan-Ru Fan', '\u6f58\u5a49\u5982'],
  ['Cheng-Yu Ma', '\u99ac\u627f\u5b87'],
]
const EXTRA_EMOJI = ['\ud83e\uddd1\ud83c\udffb\u200d\u2708\ufe0f', '\ud83d\udc69\ud83c\udffb\u200d\u2708\ufe0f', '\ud83e\uddd1\ud83c\udffd\u200d\u2708\ufe0f', '\ud83d\udc68\ud83c\udffb\u200d\u2708\ufe0f']
const EXTRA_TIERS: Driver['tier'][] = ['OWNED_FLEET', 'PAID_MEMBER', 'OUTSIDE_CONTRACTOR']
const EXTRA_ZONES = ['taipei-101', 'taipei-main-station', 'tpe-airport', 'banqiao-station', 'neihu-business', 'taichung-hsr', 'kaohsiung-hsr', 'hualien-city', 'tainan-hsr']

for (let i = 0; i < 17; i++) {
  const id = `drv-${8 + i}`
  const [name, nameZh] = EXTRA_NAMES[i]
  BASE_DRIVERS.push({
    id,
    name,
    nameZh,
    avatarEmoji: EXTRA_EMOJI[i % EXTRA_EMOJI.length],
    colorHex: EXTRA_VEHICLE_COLORS[i],
    phone: `09${20 + i}-${100 + i * 7}-${200 + i * 3}`,
    tier: EXTRA_TIERS[i % EXTRA_TIERS.length],
    rating: Math.round((4.4 + (i % 6) * 0.1) * 10) / 10,
    completedTrips: 40 + i * 53,
    vehicleId: `veh-${8 + i}`,
    documents: {
      license: doc(`TPE-DL-${40000 + i * 11}`, iso(30 + i * 12, 0), i % 9 === 0 ? 'EXPIRING' : 'VALID'),
      insurance: doc(`INS-${8800 + i * 9}`, iso(60 + i * 8, 0), 'VALID'),
      registration: doc(`REG-${9900 + i * 7}`, iso(120 + i * 5, 0), 'VALID'),
      inspection: doc(`INSP-${10100 + i * 6}`, iso(20 + i * 9, 0), 'VALID', i % 11 === 0 ? 'FLAGGED' : 'VERIFIED'),
    },
  })
}

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
    notes: params.notes ?? '',
    flightNumber: params.flightNumber ?? null,
    flightInfo,
    priceEstimate: fareBreakdown.total,
    fareBreakdown,
    distanceKm: routeToDropoff.distanceKm,
    durationMin,
    routeToDropoff,
    pickupInstructions: pickup.isAirport
      ? { terminal: Math.random() > 0.5 ? 'Terminal 2' : 'Terminal 1', gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${Math.floor(Math.random() * 20) + 1}`, meetAndGreetBoard: `Zhaofeng Travel \u00b7 ${params.customer.name}` }
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
      phone: '+33 6 12 34 56 78',
      email: 'isabelle.l@example.com',
      memberSince: iso(-170, 9),
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
      phone: '+81 90-1234-5678',
      email: 'haruto.s@example.com',
      memberSince: iso(-58, 9),
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
      phone: '+44 7700 900123',
      email: 'marcus.webb@example.com',
      memberSince: iso(-320, 9),
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
      phone: '+34 611 22 33 44',
      email: 'sofia.a@example.com',
      memberSince: iso(-20, 9),
      historicalOrders: historyFor([{ pickupId: 'tpe-airport', dropoffId: 'taipei-101', daysAgo: 18, type: 'AIRPORT_PICKUP', price: 1600 }]),
      savedPassengers: [],
      paymentMethods: [],
      notificationPreference: { email: true, line: true, sms: false },
      privacyRequests: [],
      memberTier: 'SILVER',
      memberPoints: 60,
      consentMarketing: true,
    },
  ]
}

const BULK_CHANNELS: Order['channel'][] = ['Website', 'LINE@', 'KKday', 'Booking.com', 'Klook', 'Phone / Agent', 'ezTravel']
const BULK_NAMES = [
  'Kenji Watanabe', 'Olivia Chen', 'Liam O\u2019Connor', 'Anya Petrova', 'Noah Kim', 'Fatima Al-Sayed', 'Lucas Silva', 'Grace Park',
  'Ethan Brooks', 'Mia Rossi', 'Yusuf Demir', 'Chloe Martin', 'Ravi Shah', 'Hana Kobayashi', 'Diego Fernandez', 'Freya Nilsen',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomOrderNoCounter(start: number) {
  let n = start
  return () => `FP-${n++}`
}

/** Builds one bulk-generated, pre-driver-assignment active order (any of the
 * early lifecycle states that don't require a driver yet) — powers the "86
 * active rides" figure from the client brief without over-booking the
 * limited demo driver roster. Deliberately skips real OSRM hydration (see
 * `hydrateSeedRoutes` in the store) so seeding stays fast and offline-safe. */
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
    const region = pickRandom(['TAIPEI', 'NEW_TAIPEI', 'TAOYUAN', 'TAICHUNG', 'KAOHSIUNG', 'HUALIEN', 'TAINAN', 'NANTOU'])
    const inRegion = LOCATIONS.filter((l) => l.region === region)
    const a = pickRandom(inRegion.length >= 2 ? inRegion : LOCATIONS)
    let b = pickRandom(inRegion.length >= 2 ? inRegion : LOCATIONS)
    if (b.id === a.id) b = LOCATIONS[(LOCATIONS.indexOf(a) + 1) % LOCATIONS.length]
    pickupId = a.id
    dropoffId = b.id
  }

  const vehicleType = pickRandom<Order['vehicleType']>(['SEDAN', 'SUV', 'VAN', 'LUXURY', 'MINIBUS'])
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
    vehicleCategory: DEFAULT_CATEGORY_FOR_TYPE[vehicleType],
    passengers: 1 + Math.floor(Math.random() * 5),
    luggage: Math.floor(Math.random() * 4),
    scheduledTime: new Date(Date.now() + (20 + Math.random() * 200) * 60_000).toISOString(),
    customer: { name, phone: '+1 555-0100', email: `${name.split(' ')[0].toLowerCase()}@example.com` },
    flightNumber: isAirport ? `${pickRandom(['CI', 'BR', 'JL', 'NH', 'SQ', 'CX'])}${100 + Math.floor(Math.random() * 800)}` : '',
  })

  order.createdAt = createdAt
  order.status = status
  order.paymentStatus = status === 'DRAFT' || status === 'PENDING_PAYMENT' ? 'UNPAID' : status === 'PAID' || status === 'SUPPLIER_PENDING' ? 'PAID' : 'PAID'
  order.supplierStatus = channel === 'Website' || channel === 'Phone / Agent' || channel === 'LINE@' ? 'NOT_APPLICABLE' : status === 'SUPPLIER_PENDING' ? 'PENDING' : 'CONFIRMED'
  order.voucherStatus = ['DRAFT', 'PENDING_PAYMENT'].includes(status) ? 'NOT_ISSUED' : 'ISSUED'
  order.statusHistory = [{ id: genId('hist'), status, at: createdAt, actor: 'CUSTOMER' }]
  order.auditLog = [{ id: genId('aud'), at: createdAt, actor: 'CUSTOMER', action: `Order created via ${channel}` }]
  return order
}

/** Builds one bulk-generated completed order aged by `ageMinutes`, used to
 * populate the client brief's "completed rides for last 3h/4h/today/week/
 * month" figures with genuinely time-distributed data. */
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

  const vehicleType = pickRandom<Order['vehicleType']>(['SEDAN', 'SUV', 'VAN', 'LUXURY', 'MINIBUS'])
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
    vehicleCategory: DEFAULT_CATEGORY_FOR_TYPE[vehicleType],
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
  const homeBaseIds = ['taipei-main-station', 'taipei-101', 'ximending', 'neihu-business']

  const drivers: Driver[] = BASE_DRIVERS.map((d, i) => {
    const vehicle = SEED_VEHICLES.find((v) => v.id === d.vehicleId)!
    const isMetro = i < 7
    const homeLoc = isMetro ? getLocation(homeBaseIds[i % homeBaseIds.length]) : getLocation(EXTRA_ZONES[i % EXTRA_ZONES.length])
    return {
      ...d,
      status: 'AVAILABLE',
      lat: homeLoc.lat + (Math.random() - 0.5) * 0.02,
      lng: homeLoc.lng + (Math.random() - 0.5) * 0.02,
      svgX: homeLoc.svgX + (Math.random() - 0.5) * 40,
      svgY: homeLoc.svgY + (Math.random() - 0.5) * 40,
      vehicleId: vehicle.id,
      stats: buildDriverStats(d.id, d.completedTrips),
      shiftSchedule: buildShiftSchedule(d.id),
      unresponsiveFlagUntil: null,
      unresponsiveOrderNo: null,
      workingMode: pickRandom<Driver['workingMode']>(['AIRPORT_PRIORITY', 'CITY_PRIORITY', 'ANY']),
      currentZone: homeLoc.name,
      autoAcceptEnabled: i % 3 === 0,
      airportPreference: i % 2 === 0,
      shiftStartedAt: Date.now() - Math.floor(Math.random() * 4) * 3_600_000,
    }
  })

  const findDriver = (id: string) => drivers.find((d) => d.id === id)!

  const orders: Order[] = []
  const nextNo = randomOrderNoCounter(1030)

  // ---- Flagship narrative orders (hand-authored, real drivers/positions) ----

  const o1 = buildOrderBase({
    id: 'ord-1', orderNo: 'FP-1042', channel: 'KKday', pickupId: 'tpe-airport', dropoffId: 'grand-hyatt', vehicleType: 'SUV', passengers: 3, luggage: 3,
    scheduledTime: iso(0, new Date().getHours() + 2), customer: { name: 'Haruto Sasaki', phone: '+81 90-1234-5678', email: 'haruto.s@example.com' },
    flightNumber: 'NH851', notes: 'Family with a toddler, prefers child seat if available.',
    passengerRequirements: { ...NO_REQUIREMENTS, childSeat: true },
  })
  o1.supplierStatus = 'CONFIRMED'
  orders.push(o1)

  const o2 = buildOrderBase({
    id: 'ord-2', orderNo: 'FP-1039', channel: 'Website', pickupId: 'grand-hyatt', dropoffId: 'jiufen', vehicleType: 'VAN', passengers: 5, luggage: 2,
    scheduledTime: iso(0, new Date().getHours() + 1), customer: { name: 'Emma Whitfield', phone: '+1 415-555-0199', email: 'emma.w@example.com' },
    notes: 'Full-day charter, 3 stops requested (Jiufen, Shifen, Houtong).',
  })
  o2.status = 'ASSIGNED'
  o2.driverId = 'drv-3'
  o2.vehicleId = 'veh-3'
  o2.statusHistory = [...o2.statusHistory, { id: genId('hist'), status: 'ASSIGNED', at: Date.now() - 6 * 60_000, actor: 'DISPATCHER' }]
  orders.push(o2)

  const o3 = buildOrderBase({
    id: 'ord-3', orderNo: 'FP-1035', channel: 'Booking.com', pickupId: 'ximending', dropoffId: 'tpe-airport', vehicleType: 'SEDAN', passengers: 2, luggage: 2,
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
    id: 'ord-4', orderNo: 'FP-1031', channel: 'LINE@', pickupId: 'taipei-main-station', dropoffId: 'tsa-airport', vehicleType: 'LUXURY', passengers: 1, luggage: 1,
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
    id: 'ord-5', orderNo: 'FP-1024', channel: 'Klook', pickupId: 'tpe-airport', dropoffId: 'taipei-101', vehicleType: 'SEDAN', passengers: 2, luggage: 2,
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
    id: 'ord-6', orderNo: 'FP-1046', channel: 'KKday', pickupId: 'tpe-airport', dropoffId: 'w-hotel', vehicleType: 'SUV', passengers: 2, luggage: 3,
    scheduledTime: iso(0, new Date().getHours() + 3), customer: { name: 'Grace Park', phone: '+82 10-2233-4455', email: 'grace.p@example.com' },
    flightNumber: 'KE185', notes: 'Requested cancellation — travel plans changed.',
  })
  o6.status = 'CANCELLATION_REQUESTED'
  o6.cancellationReason = 'Flight rescheduled to a different day'
  o6.statusHistory = [...o6.statusHistory, { id: genId('hist'), status: 'CANCELLATION_REQUESTED', at: Date.now() - 12 * 60_000, actor: 'CUSTOMER' }]
  o6.auditLog = [...o6.auditLog, { id: genId('aud'), at: Date.now() - 12 * 60_000, actor: 'CUSTOMER', action: 'Requested cancellation', detail: o6.cancellationReason }]
  orders.push(o6)

  const o7 = buildOrderBase({
    id: 'ord-7', orderNo: 'FP-1018', channel: 'Booking.com', pickupId: 'taipei-101', dropoffId: 'tsa-airport', vehicleType: 'SEDAN', passengers: 1, luggage: 1,
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

  // ---- Bulk-generated orders: hit the "86 active rides" figure + completed
  // counts for the last 3h / 4h / today / week / month, per the client brief. ----
  const narrativeActiveCount = orders.filter((o) => !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)).length
  const bulkActiveTarget = Math.max(0, 86 - narrativeActiveCount)
  const bulkActiveStatuses: OrderStatus[] = ['DRAFT', 'PENDING_PAYMENT', 'PAID', 'SUPPLIER_PENDING', 'CONFIRMED', 'CONFIRMED', 'DRIVER_MATCHING', 'CONFIRMED', 'DRIVER_MATCHING', 'SUPPLIER_PENDING']
  for (let i = 0; i < bulkActiveTarget; i++) {
    const status = bulkActiveStatuses[i % bulkActiveStatuses.length]
    const ageMinutes = Math.random() * 180
    orders.push(buildBulkActiveOrder(`ord-bulk-active-${i}`, nextNo(), status, ageMinutes))
  }

  const completedBuckets: { count: number; minAge: number; maxAge: number }[] = [
    { count: 8, minAge: 5, maxAge: 175 }, // last 3h
    { count: 5, minAge: 181, maxAge: 235 }, // 3h-4h
    { count: 33, minAge: 241, maxAge: 1420 }, // 4h-24h (today)
    { count: 130, minAge: 1450, maxAge: 10000 }, // 1-7 days (this week)
    { count: 260, minAge: 10100, maxAge: 43000 }, // 7-30 days (this month)
  ]
  let bulkIdx = 0
  for (const bucket of completedBuckets) {
    for (let i = 0; i < bucket.count; i++) {
      const ageMinutes = bucket.minAge + Math.random() * (bucket.maxAge - bucket.minAge)
      orders.push(buildBulkCompletedOrder(`ord-bulk-completed-${bulkIdx}`, nextNo(), ageMinutes))
      bulkIdx++
    }
  }

  // A handful of terminal CANCELLED/FAILED orders for realism in Fleet OS filters.
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
