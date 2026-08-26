import type { AppNotification, CustomerProfile, Driver, DriverStats, Order, Vehicle } from '../types'
import { getLocation } from './locations'
import { buildRoutePath, evaluateRoute } from '../lib/geo'
import { estimateDurationMin, estimateFare, genId } from '../lib/pricing'
import { lookupFlight } from '../lib/flight'
import { buildShiftSchedule } from '../lib/capacity'

function iso(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const SEED_VEHICLES: Vehicle[] = [
  { id: 'veh-1', plate: 'ABC-5581', type: 'SEDAN', colorHex: '#22d3ee', capacity: 3, driverId: 'drv-1' },
  { id: 'veh-2', plate: 'AFG-2210', type: 'SUV', colorHex: '#a855f7', capacity: 5, driverId: 'drv-2' },
  { id: 'veh-3', plate: 'AKT-7754', type: 'VAN', colorHex: '#fbbf24', capacity: 7, driverId: 'drv-3' },
  { id: 'veh-4', plate: 'ARL-0093', type: 'LUXURY', colorHex: '#f472b6', capacity: 3, driverId: 'drv-4' },
  { id: 'veh-5', plate: 'AWY-4471', type: 'MINIBUS', colorHex: '#a3e635', capacity: 12, driverId: 'drv-5' },
  { id: 'veh-6', plate: 'ABD-6620', type: 'SEDAN', colorHex: '#38bdf8', capacity: 3, driverId: 'drv-6' },
  { id: 'veh-7', plate: 'AJX-1138', type: 'SUV', colorHex: '#fb923c', capacity: 5, driverId: 'drv-7' },
]

const BASE_DRIVERS: Omit<Driver, 'status' | 'lat' | 'lng' | 'svgX' | 'svgY' | 'stats' | 'shiftSchedule' | 'unresponsiveFlagUntil' | 'unresponsiveOrderNo'>[] = [
  {
    id: 'drv-1',
    name: 'Chih-Ming Chen',
    nameZh: '陳志明',
    avatarEmoji: '🧑🏻‍✈️',
    colorHex: '#22d3ee',
    phone: '0912-345-671',
    tier: 'OWNED_FLEET',
    rating: 4.9,
    completedTrips: 812,
    vehicleId: 'veh-1',
    documents: {
      license: { number: 'TPE-DL-88213', expiresAt: iso(210, 0), status: 'VALID' },
      insurance: { number: 'INS-2291-A', expiresAt: iso(160, 0), status: 'VALID' },
    },
  },
  {
    id: 'drv-2',
    name: 'Mei-Hui Lin',
    nameZh: '林美惠',
    avatarEmoji: '👩🏻‍✈️',
    colorHex: '#a855f7',
    phone: '0922-118-430',
    tier: 'OWNED_FLEET',
    rating: 4.8,
    completedTrips: 654,
    vehicleId: 'veh-2',
    documents: {
      license: { number: 'TPE-DL-77120', expiresAt: iso(9, 0), status: 'EXPIRING' },
      insurance: { number: 'INS-1187-B', expiresAt: iso(300, 0), status: 'VALID' },
    },
  },
  {
    id: 'drv-3',
    name: 'Da-Tong Wang',
    nameZh: '王大同',
    avatarEmoji: '🧑🏽‍✈️',
    colorHex: '#fbbf24',
    phone: '0933-882-041',
    tier: 'PAID_MEMBER',
    rating: 4.7,
    completedTrips: 401,
    vehicleId: 'veh-3',
    documents: {
      license: { number: 'TPE-DL-55302', expiresAt: iso(120, 0), status: 'VALID' },
      insurance: { number: 'INS-3391-C', expiresAt: iso(5, 0), status: 'EXPIRING' },
    },
  },
  {
    id: 'drv-4',
    name: 'Chia-Hao Chang',
    nameZh: '張家豪',
    avatarEmoji: '🧑🏻‍✈️',
    colorHex: '#f472b6',
    phone: '0955-206-889',
    tier: 'PAID_MEMBER',
    rating: 5.0,
    completedTrips: 289,
    vehicleId: 'veh-4',
    documents: {
      license: { number: 'TPE-DL-90911', expiresAt: iso(88, 0), status: 'VALID' },
      insurance: { number: 'INS-4471-D', expiresAt: iso(200, 0), status: 'VALID' },
    },
  },
  {
    id: 'drv-5',
    name: 'Wen-Bin Li',
    nameZh: '李文彬',
    avatarEmoji: '🧑🏻‍✈️',
    colorHex: '#a3e635',
    phone: '0966-773-215',
    tier: 'OUTSIDE_CONTRACTOR',
    rating: 4.6,
    completedTrips: 133,
    vehicleId: 'veh-5',
    documents: {
      license: { number: 'TPE-DL-33218', expiresAt: iso(-3, 0), status: 'EXPIRED' },
      insurance: { number: 'INS-5521-E', expiresAt: iso(45, 0), status: 'VALID' },
    },
  },
  {
    id: 'drv-6',
    name: 'Shu-Fen Huang',
    nameZh: '黃淑芬',
    avatarEmoji: '👩🏻‍✈️',
    colorHex: '#38bdf8',
    phone: '0977-664-902',
    tier: 'OWNED_FLEET',
    rating: 4.9,
    completedTrips: 977,
    vehicleId: 'veh-6',
    documents: {
      license: { number: 'TPE-DL-10087', expiresAt: iso(365, 0), status: 'VALID' },
      insurance: { number: 'INS-6631-F', expiresAt: iso(365, 0), status: 'VALID' },
    },
  },
  {
    id: 'drv-7',
    name: 'Chien-Cheng Wu',
    nameZh: '吳建成',
    avatarEmoji: '🧑🏽‍✈️',
    colorHex: '#fb923c',
    phone: '0988-402-671',
    tier: 'OUTSIDE_CONTRACTOR',
    rating: 4.5,
    completedTrips: 76,
    vehicleId: 'veh-7',
    documents: {
      license: { number: 'TPE-DL-20044', expiresAt: iso(60, 0), status: 'VALID' },
      insurance: { number: 'INS-7741-G', expiresAt: iso(12, 0), status: 'EXPIRING' },
    },
  },
]

function buildDriverStats(driverId: string, completedTrips: number): DriverStats {
  // Deterministic per-driver pseudo-random split so the numbers feel real
  // but stay stable across reloads.
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

  return {
    totalAllTime,
    totalToday,
    totalWeek,
    acceptedToday,
    declinedToday,
    missedToday,
    acceptedAllTime,
    declinedAllTime,
    missedAllTime,
  }
}

function buildOrderBase(params: {
  id: string
  orderNo: string
  channel: Order['channel']
  pickupId: string
  dropoffId: string
  vehicleType: Order['vehicleType']
  passengers: number
  luggage: number
  scheduledTime: string
  customer: Order['customer']
  flightNumber?: string
  notes?: string
}): Order {
  const pickup = getLocation(params.pickupId)
  const dropoff = getLocation(params.dropoffId)
  const type: Order['type'] = pickup.isAirport
    ? 'AIRPORT_PICKUP'
    : dropoff.isAirport
      ? 'AIRPORT_DROPOFF'
      : 'TOUR_CHARTER'

  const routeToPickup = buildRoutePath(pickup, pickup, `${params.id}-static-pickup`)
  const routeToDropoff = buildRoutePath(pickup, dropoff, `${params.id}-leg2`)

  const flightInfo = params.flightNumber ? lookupFlight(params.flightNumber, params.scheduledTime) : null

  return {
    id: params.id,
    orderNo: params.orderNo,
    channel: params.channel,
    type,
    status: 'NEW',
    createdAt: Date.now(),
    scheduledTime: params.scheduledTime,
    customer: params.customer,
    pickup,
    dropoff,
    vehicleType: params.vehicleType,
    passengers: params.passengers,
    luggage: params.luggage,
    notes: params.notes ?? '',
    flightNumber: params.flightNumber ?? null,
    flightInfo,
    driverId: null,
    vehicleId: null,
    suggestedDriverId: null,
    priceEstimate: estimateFare(routeToDropoff.distanceKm, params.vehicleType, pickup.isAirport || dropoff.isAirport),
    distanceKm: routeToDropoff.distanceKm,
    durationMin: estimateDurationMin(routeToDropoff.distanceKm),
    routeToPickup,
    routeToDropoff,
    legProgress: 0,
    currentPos: null,
    pickedUpAt: null,
    pendingDriverId: null,
    dispatchAttempts: [],
    escalationStage: 0,
    unresponsiveDriverIds: [],
    demoForceNoResponse: false,
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
    },
    {
      id: 'cust-sofia',
      name: 'Sofia Alvarez',
      phone: '+34 611 22 33 44',
      email: 'sofia.a@example.com',
      memberSince: iso(-20, 9),
      historicalOrders: historyFor([{ pickupId: 'tpe-airport', dropoffId: 'taipei-101', daysAgo: 18, type: 'AIRPORT_PICKUP', price: 1600 }]),
    },
  ]
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
    const homeLoc = getLocation(homeBaseIds[i % homeBaseIds.length])
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
    }
  })

  const findDriver = (id: string) => drivers.find((d) => d.id === id)!

  const orders: Order[] = []

  // 1. Brand new unassigned order awaiting dispatch (KKday channel demo).
  const o1 = buildOrderBase({
    id: 'ord-1',
    orderNo: 'FP-1042',
    channel: 'KKday',
    pickupId: 'tpe-airport',
    dropoffId: 'grand-hyatt',
    vehicleType: 'SUV',
    passengers: 3,
    luggage: 3,
    scheduledTime: iso(0, new Date().getHours() + 2),
    customer: { name: 'Haruto Sasaki', phone: '+81 90-1234-5678', email: 'haruto.s@example.com' },
    flightNumber: 'NH851',
    notes: 'Family with a toddler, prefers child seat if available.',
  })
  orders.push(o1)

  // 2. Assigned tour charter, not yet started.
  const o2 = buildOrderBase({
    id: 'ord-2',
    orderNo: 'FP-1039',
    channel: 'Website',
    pickupId: 'grand-hyatt',
    dropoffId: 'jiufen',
    vehicleType: 'VAN',
    passengers: 5,
    luggage: 2,
    scheduledTime: iso(0, new Date().getHours() + 1),
    customer: { name: 'Emma Whitfield', phone: '+1 415-555-0199', email: 'emma.w@example.com' },
    notes: 'Full-day charter, 3 stops requested (Jiufen, Shifen, Houtong).',
  })
  o2.status = 'ASSIGNED'
  o2.driverId = 'drv-3'
  o2.vehicleId = 'veh-3'
  orders.push(o2)

  // 3. Driver en route to pickup an airport drop-off passenger — mid-flight.
  const o3 = buildOrderBase({
    id: 'ord-3',
    orderNo: 'FP-1035',
    channel: 'Booking.com',
    pickupId: 'ximending',
    dropoffId: 'tpe-airport',
    vehicleType: 'SEDAN',
    passengers: 2,
    luggage: 2,
    scheduledTime: iso(0, new Date().getHours() + 1, 30),
    customer: { name: 'Isabelle Laurent', phone: '+33 6 12 34 56 78', email: 'isabelle.l@example.com' },
    flightNumber: 'CI67',
    notes: 'Please arrive 15 minutes early, connecting to international flight.',
  })
  o3.status = 'EN_ROUTE_TO_PICKUP'
  o3.driverId = 'drv-1'
  o3.vehicleId = 'veh-1'
  o3.legProgress = 0.38
  orders.push(o3)

  // 4. Passenger already picked up, in transit to airport for departure.
  const o4 = buildOrderBase({
    id: 'ord-4',
    orderNo: 'FP-1031',
    channel: 'LINE@',
    pickupId: 'taipei-main-station',
    dropoffId: 'tsa-airport',
    vehicleType: 'LUXURY',
    passengers: 1,
    luggage: 1,
    scheduledTime: iso(0, new Date().getHours()),
    customer: { name: 'Marcus Webb', phone: '+44 7700 900123', email: 'marcus.webb@example.com' },
    flightNumber: 'BR212',
    notes: 'VIP client, silent ride preferred.',
  })
  o4.status = 'IN_TRANSIT'
  o4.driverId = 'drv-4'
  o4.vehicleId = 'veh-4'
  o4.legProgress = 0.62
  o4.pickedUpAt = Date.now() - 5 * 60_000
  orders.push(o4)

  // 5. Completed earlier today.
  const o5 = buildOrderBase({
    id: 'ord-5',
    orderNo: 'FP-1024',
    channel: 'Klook',
    pickupId: 'tpe-airport',
    dropoffId: 'taipei-101',
    vehicleType: 'SEDAN',
    passengers: 2,
    luggage: 2,
    scheduledTime: iso(0, Math.max(0, new Date().getHours() - 3)),
    customer: { name: 'Sofia Alvarez', phone: '+34 611 22 33 44', email: 'sofia.a@example.com' },
    flightNumber: 'SQ879',
    notes: '',
  })
  o5.status = 'COMPLETED'
  o5.driverId = 'drv-6'
  o5.vehicleId = 'veh-6'
  o5.legProgress = 1
  orders.push(o5)

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

  const notifications: AppNotification[] = [
    {
      id: genId('ntf'),
      timestamp: Date.now() - 2 * 60_000,
      kind: 'INFO',
      title: 'Driver En Route',
      message: `${findDriver('drv-1').name} is en route to pickup for order ${o3.orderNo}.`,
      orderId: o3.id,
    },
    {
      id: genId('ntf'),
      timestamp: Date.now() - 5 * 60_000,
      kind: 'SUCCESS',
      title: 'Passenger Picked Up',
      message: `${findDriver('drv-4').name} picked up passenger for order ${o4.orderNo}, heading to TSA.`,
      orderId: o4.id,
    },
    {
      id: genId('ntf'),
      timestamp: Date.now() - 25 * 60_000,
      kind: 'SUCCESS',
      title: 'Trip Completed',
      message: `Order ${o5.orderNo} completed successfully. Customer rated 5 stars.`,
      orderId: o5.id,
    },
    {
      id: genId('ntf'),
      timestamp: Date.now() - 1 * 60_000,
      kind: 'WARNING',
      title: 'Document Expiring Soon',
      message: `${findDriver('drv-2').name}'s driving license expires in 9 days. Please renew.`,
    },
  ]

  return { orders, drivers, notifications, customerProfiles: buildCustomerProfiles() }
}
