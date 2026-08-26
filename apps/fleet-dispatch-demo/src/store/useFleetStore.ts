import { create } from 'zustand'
import type {
  AppNotification,
  AuditEntry,
  AuditLogEntry,
  BookingInput,
  Campaign,
  CampaignStatus,
  CatalogProduct,
  CustomerProfile,
  DeclineReason,
  DispatchAttempt,
  Driver,
  DriverStats,
  DriverWorkingMode,
  LocationRef,
  NotificationChannel,
  NotificationKind,
  NotificationPreference,
  Order,
  OrderStatus,
  PaymentToken,
  RefundRequest,
  RefundRequestStatus,
  Role,
  SavedPassenger,
  Supplier,
  SupplierStatus,
  SupportTicket,
  SupportTicketStatus,
  SystemHealthMetric,
  StatusActor,
  Vehicle,
} from '../types'
import { createSeedState, SEED_VEHICLES } from '../data/seed'
import { buildFleetOsSeed } from '../data/fleetOsSeed'
import { AIRPORTS, getLocation, NON_AIRPORTS } from '../data/locations'
import { buildRoutePath, evaluateRoute } from '../lib/geo'
import { getCachedRoute, resolveDynamicRoute } from '../lib/routing'
import { driftFlightStatus, lookupFlight, randomFlightNumber } from '../lib/flight'
import { computeFareBreakdown, estimateDurationMin, genId, nextOrderNo } from '../lib/pricing'
import { suggestDriver } from '../lib/dispatch'
import { buildCapacityForecast } from '../lib/capacity'

const MAX_NOTIFICATIONS = 60
const AMBIENT_ORDER_CHANCE = 0.05
const AUTO_ASSIGN_CHANCE = 0.6
const MAX_ACTIVE_AMBIENT_ORDERS = 10

// Escalation ladder timings — kept short (8-15 simulated seconds) so the
// no-response demo path is watchable live rather than requiring a real wait.
const STAGE_TIMEOUT_MIN_MS = 8000
const STAGE_TIMEOUT_MAX_MS = 15000
const AUTO_ACCEPT_CHANCE_PER_TICK = 0.32
const UNRESPONSIVE_FLAG_MS = 20_000

const ACTIVE_STATUS_SET = new Set<OrderStatus>([
  'DRAFT', 'PENDING_PAYMENT', 'PAID', 'SUPPLIER_PENDING', 'CONFIRMED', 'DRIVER_MATCHING', 'ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD',
])

interface FleetState {
  orders: Order[]
  drivers: Driver[]
  vehicles: Vehicle[]
  notifications: AppNotification[]
  customerProfiles: CustomerProfile[]
  capacityForecast: ReturnType<typeof buildCapacityForecast>
  autoDispatchEnabled: boolean
  ambientOrdersEnabled: boolean
  focusOrderId: string | null
  focusDriverId: string | null
  tickCount: number

  suppliers: Supplier[]
  campaigns: Campaign[]
  supportTickets: SupportTicket[]
  refundRequests: RefundRequest[]
  roles: Role[]
  systemHealth: SystemHealthMetric[]
  catalogProducts: CatalogProduct[]
  payouts: ReturnType<typeof buildFleetOsSeed>['payouts']
  globalAuditLog: AuditLogEntry[]

  createOrder: (input: BookingInput & { simulateFailure?: boolean }) => Order
  retryPayment: (orderId: string) => void
  assignOrder: (orderId: string, driverId?: string) => void
  respondToDispatch: (orderId: string, accept: boolean, declineReason?: DeclineReason) => void
  toggleDemoNoResponse: (orderId: string) => void
  startTrip: (orderId: string) => void
  verifyPickupPin: (orderId: string, pin: string) => boolean
  reportNoShow: (orderId: string) => void
  cancelOrder: (orderId: string) => void
  requestCancellation: (orderId: string, reason: string, actor?: StatusActor) => void
  resolveCancellation: (orderId: string, approve: boolean) => void
  resolveRefund: (refundId: string, approve: boolean) => void
  confirmSupplierOrder: (orderId: string) => void
  rejectSupplierOrder: (orderId: string) => void
  rateDriver: (orderId: string, stars: number) => void
  rateCustomer: (orderId: string, stars: number) => void
  uploadTollEvidence: (orderId: string) => void
  requestInvoice: (orderId: string) => void
  logOrderAction: (orderId: string, actor: StatusActor, action: string, detail?: string) => void
  rescheduleOrder: (orderId: string, newIso: string) => void
  addOrderNote: (orderId: string, note: string) => void
  updateFlightNumber: (orderId: string, flightNumber: string) => void

  setAutoDispatch: (v: boolean) => void
  setAmbientOrders: (v: boolean) => void
  setFocusOrder: (id: string | null) => void
  setFocusDriver: (id: string | null) => void
  dismissNotification: (id: string) => void
  setDriverAvailability: (driverId: string, status: 'AVAILABLE' | 'OFFLINE' | 'BREAK') => void
  setDriverWorkingMode: (driverId: string, mode: DriverWorkingMode) => void
  setDriverZone: (driverId: string, zone: string) => void
  setDriverAutoAccept: (driverId: string, v: boolean) => void
  setDriverAirportPreference: (driverId: string, v: boolean) => void
  hydrateSeedRoutes: () => void
  tick: () => void

  setSupplierStatus: (id: string, status: SupplierStatus) => void
  setCampaignStatus: (id: string, status: CampaignStatus) => void
  setTicketStatus: (id: string, status: SupportTicketStatus) => void
  addTicketMessage: (id: string, text: string) => void
  createSupportTicket: (orderId: string | null, customerName: string, subject: string, category: string) => SupportTicket
  toggleRolePermission: (roleId: string, permission: string) => void
  setRoleTwoFactor: (roleId: string, v: boolean) => void
  acknowledgeHealthAlert: (id: string) => void
  setCatalogProductStatus: (id: string, status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED') => void
  markPayoutPaid: (id: string) => void

  addSavedPassenger: (customerId: string, passenger: Omit<SavedPassenger, 'id'>) => void
  removeSavedPassenger: (customerId: string, passengerId: string) => void
  addPaymentMethod: (customerId: string, token: Omit<PaymentToken, 'id'>) => void
  removePaymentMethod: (customerId: string, tokenId: string) => void
  setDefaultPaymentMethod: (customerId: string, tokenId: string) => void
  setNotificationPreference: (customerId: string, key: keyof NotificationPreference, v: boolean) => void
  requestPrivacyAction: (customerId: string, kind: 'DATA_DOWNLOAD' | 'DELETE_ACCOUNT') => void
  setConsentMarketing: (customerId: string, v: boolean) => void
}

function pushNotification(
  notifications: AppNotification[],
  kind: NotificationKind,
  titleKey: string,
  messageKey: string,
  params?: Record<string, string | number>,
  orderId?: string,
  channels?: NotificationChannel[],
  driverId?: string,
): AppNotification[] {
  const next: AppNotification = { id: genId('ntf'), timestamp: Date.now(), kind, titleKey, messageKey, params, orderId, channels, driverId }
  return [next, ...notifications].slice(0, MAX_NOTIFICATIONS)
}

function appendHistory(order: Order, actor: StatusActor): Order {
  return {
    ...order,
    statusHistory: [...order.statusHistory, { id: genId('hist'), status: order.status, at: Date.now(), actor }],
  }
}

function appendAudit(order: Order, actor: StatusActor, action: string, detail?: string): Order {
  const entry: AuditEntry = { id: genId('aud'), at: Date.now(), actor, action, detail }
  return { ...order, auditLog: [...order.auditLog, entry] }
}

function pushGlobalAudit(log: AuditLogEntry[], actor: string, action: string, targetType: string, targetId: string): AuditLogEntry[] {
  return [{ id: genId('gaud'), at: Date.now(), actor, action, targetType, targetId }, ...log].slice(0, 200)
}

function randomTimeoutMs(): number {
  return STAGE_TIMEOUT_MIN_MS + Math.random() * (STAGE_TIMEOUT_MAX_MS - STAGE_TIMEOUT_MIN_MS)
}

function driverAsLocation(driver: Driver): LocationRef {
  return { id: `${driver.id}-pos`, name: 'Current position', nameZh: '\u76ee\u524d\u4f4d\u7f6e', address: '', lat: driver.lat, lng: driver.lng, svgX: driver.svgX, svgY: driver.svgY, isAirport: false }
}

function bumpStats(stats: DriverStats, kind: 'accepted' | 'declined' | 'missed'): DriverStats {
  if (kind === 'accepted') return { ...stats, acceptedToday: stats.acceptedToday + 1, acceptedAllTime: stats.acceptedAllTime + 1 }
  if (kind === 'declined') return { ...stats, declinedToday: stats.declinedToday + 1, declinedAllTime: stats.declinedAllTime + 1 }
  return { ...stats, missedToday: stats.missedToday + 1, missedAllTime: stats.missedAllTime + 1 }
}

/** Creates (or escalates to) one rung of the multi-channel notification ladder for an order. */
function startDispatchAttempt(
  order: Order,
  driver: Driver,
  stage: 1 | 2,
  notifications: AppNotification[],
  actor: StatusActor = 'SYSTEM',
): { order: Order; notifications: AppNotification[] } {
  const channels: NotificationChannel[] = stage === 1 ? ['IN_APP'] : ['LINE', 'PHONE_CALL']
  const now = Date.now()
  const attempt: DispatchAttempt = {
    id: genId('disp'), orderId: order.id, stage, driverId: driver.id, driverName: driver.name, channels, sentAt: now,
    respondBy: now + randomTimeoutMs(), status: 'AWAITING_RESPONSE', resolvedAt: null, simulateNoResponse: order.demoForceNoResponse, declineReason: null,
  }

  const updatedOrder = appendHistory(
    { ...order, status: 'DRIVER_MATCHING', pendingDriverId: driver.id, escalationStage: stage, dispatchAttempts: [...order.dispatchAttempts, attempt] },
    actor,
  )

  const nextNotifications =
    stage === 1
      ? pushNotification(notifications, 'INFO', 'notif.dispatchSent.title', 'notif.dispatchSent.message', { orderNo: order.orderNo, driverName: driver.name, driverNameZh: driver.nameZh }, order.id, channels, driver.id)
      : pushNotification(notifications, 'WARNING', 'notif.escalating.title', 'notif.escalating.message', { orderNo: order.orderNo, driverName: driver.name }, order.id, channels, driver.id)

  return { order: updatedOrder, notifications: nextNotifications }
}

export function classifyOrderType(pickupId: string, dropoffId: string): Order['type'] {
  const pickup = getLocation(pickupId)
  const dropoff = getLocation(dropoffId)
  if (pickup.isAirport) return 'AIRPORT_PICKUP'
  if (dropoff.isAirport) return 'AIRPORT_DROPOFF'
  return 'TOUR_CHARTER'
}

function randomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function buildOrderFromInput(input: BookingInput): Order {
  const pickup = getLocation(input.pickupId)
  const dropoff = getLocation(input.dropoffId)
  const type = classifyOrderType(input.pickupId, input.dropoffId)
  const id = genId('ord')
  const routeToDropoff = getCachedRoute(pickup, dropoff) ?? buildRoutePath(pickup, dropoff, `${id}-leg2`)
  const flightInfo = input.flightNumber ? lookupFlight(input.flightNumber, input.scheduledTime) : null
  const isAirport = pickup.isAirport || dropoff.isAirport
  const waitingMinutes = flightInfo?.status === 'DELAYED' && pickup.isAirport ? flightInfo.delayMinutes : 0
  const durationMin = estimateDurationMin(routeToDropoff.distanceKm)
  const fareBreakdown = computeFareBreakdown(routeToDropoff.distanceKm, durationMin, input.vehicleType, isAirport, { waitingMinutes, couponCode: input.couponCode })

  const now = Date.now()
  const isDirectChannel = input.channel === 'Website' || input.channel === 'Phone / Agent' || input.channel === 'LINE@'

  return {
    id,
    orderNo: nextOrderNo(),
    channel: input.channel,
    type,
    status: 'PENDING_PAYMENT',
    createdAt: now,
    scheduledTime: input.scheduledTime,
    customer: input.customer,
    pickup,
    dropoff,
    vehicleType: input.vehicleType,
    passengers: input.passengers,
    luggage: input.luggage,
    notes: input.notes,
    flightNumber: input.flightNumber || null,
    flightInfo,
    driverId: null,
    vehicleId: null,
    suggestedDriverId: null,
    priceEstimate: fareBreakdown.total,
    fareBreakdown,
    distanceKm: routeToDropoff.distanceKm,
    durationMin,
    routeToPickup: null,
    routeToDropoff,
    legProgress: 0,
    currentPos: null,
    pickedUpAt: null,
    pendingDriverId: null,
    dispatchAttempts: [],
    escalationStage: 0,
    unresponsiveDriverIds: [],
    demoForceNoResponse: false,
    quotationVersion: input.quotationVersion ?? 1,
    quotedAt: now,
    statusHistory: [{ id: genId('hist'), status: 'DRAFT', at: now - 4000, actor: 'CUSTOMER' }, { id: genId('hist'), status: 'PENDING_PAYMENT', at: now, actor: 'CUSTOMER' }],
    auditLog: [{ id: genId('aud'), at: now, actor: 'CUSTOMER', action: 'Checkout started', detail: `${input.channel} \u00b7 ${input.vehicleType}` }],
    paymentStatus: 'UNPAID',
    supplierStatus: isDirectChannel ? 'NOT_APPLICABLE' : 'PENDING',
    voucherStatus: 'NOT_ISSUED',
    pickupPin: randomPin(),
    cancellationReason: null,
    refundAmount: null,
    supportTicketId: null,
    driverRatingByCustomer: null,
    customerRatingByDriver: null,
    tollParkingEvidenceUploaded: false,
    noShowReported: false,
    waitStartedAt: null,
    pickupInstructions: pickup.isAirport
      ? { terminal: pickup.id === 'tpe-airport' ? 'Terminal 2' : 'Terminal 1', gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${Math.floor(Math.random() * 20) + 1}`, meetAndGreetBoard: `Zhaofeng Travel \u00b7 ${input.customer.name}` }
      : null,
    invoiceRequested: false,
    invoiceIssued: false,
  }
}

/** Advances a freshly-created order through PAID -> (SUPPLIER_PENDING ->) CONFIRMED
 * synchronously, with a believable statusHistory/auditLog trail — mirrors the
 * booking-source -> Fleet OS -> supplier-confirmation flow from the client
 * brief without needing async store mutations for the common success path. */
function fastForwardToConfirmed(order: Order): Order {
  const now = Date.now()
  let next: Order = { ...order, paymentStatus: 'PAID', status: 'PAID' }
  next = { ...next, statusHistory: [...next.statusHistory, { id: genId('hist'), status: 'PAID', at: now + 400, actor: 'PAYMENT' }] }
  next = appendAudit(next, 'PAYMENT', 'Payment captured', `${next.fareBreakdown.total.toLocaleString()} TWD`)

  if (next.supplierStatus === 'PENDING') {
    next = { ...next, status: 'SUPPLIER_PENDING', statusHistory: [...next.statusHistory, { id: genId('hist'), status: 'SUPPLIER_PENDING', at: now + 600, actor: 'SYSTEM' }] }
    next = appendAudit(next, 'SUPPLIER', 'Awaiting supplier confirmation', next.channel)
    next = { ...next, supplierStatus: 'CONFIRMED', status: 'CONFIRMED', statusHistory: [...next.statusHistory, { id: genId('hist'), status: 'CONFIRMED', at: now + 900, actor: 'SUPPLIER' }] }
    next = appendAudit(next, 'SUPPLIER', 'Supplier confirmed availability')
  } else {
    next = { ...next, status: 'CONFIRMED', statusHistory: [...next.statusHistory, { id: genId('hist'), status: 'CONFIRMED', at: now + 700, actor: 'SYSTEM' }] }
  }
  next = { ...next, voucherStatus: 'ISSUED' }
  next = appendAudit(next, 'SYSTEM', 'E-voucher issued', next.orderNo)
  return next
}

function randomAmbientInput(): BookingInput {
  const channels: BookingInput['channel'][] = ['KKday', 'Booking.com', 'Klook', 'LINE@', 'Phone / Agent', 'ezTravel']
  const vehicleTypes: BookingInput['vehicleType'][] = ['SEDAN', 'SUV', 'VAN', 'LUXURY', 'MINIBUS']
  const names = ['Kenji Watanabe', 'Olivia Chen', 'Liam O\u2019Connor', 'Anya Petrova', 'Noah Kim', 'Fatima Al-Sayed', 'Lucas Silva', 'Grace Park']

  const isAirportTrip = Math.random() > 0.35
  let pickupId: string
  let dropoffId: string
  if (isAirportTrip) {
    const airport = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)]
    const other = NON_AIRPORTS[Math.floor(Math.random() * NON_AIRPORTS.length)]
    const inbound = Math.random() > 0.5
    pickupId = inbound ? airport.id : other.id
    dropoffId = inbound ? other.id : airport.id
  } else {
    const a = NON_AIRPORTS[Math.floor(Math.random() * NON_AIRPORTS.length)]
    let b = NON_AIRPORTS[Math.floor(Math.random() * NON_AIRPORTS.length)]
    if (b.id === a.id) b = NON_AIRPORTS[(NON_AIRPORTS.indexOf(a) + 1) % NON_AIRPORTS.length]
    pickupId = a.id
    dropoffId = b.id
  }

  const scheduled = new Date(Date.now() + (30 + Math.random() * 150) * 60_000)
  const name = names[Math.floor(Math.random() * names.length)]

  return {
    channel: channels[Math.floor(Math.random() * channels.length)],
    pickupId,
    dropoffId,
    scheduledTime: scheduled.toISOString(),
    vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
    passengers: 1 + Math.floor(Math.random() * 5),
    luggage: Math.floor(Math.random() * 4),
    customer: { name, phone: '+1 555-0100', email: `${name.split(' ')[0].toLowerCase()}@example.com` },
    flightNumber: isAirportTrip ? randomFlightNumber() : '',
    notes: '',
  }
}

function buildAmbientOrder(): Order {
  const order = buildOrderFromInput(randomAmbientInput())
  return fastForwardToConfirmed(order)
}

const seed = createSeedState()
const fleetOsSeed = buildFleetOsSeed(seed.orders, seed.drivers)

export const useFleetStore = create<FleetState>((set, get) => ({
  orders: seed.orders,
  drivers: seed.drivers,
  vehicles: SEED_VEHICLES,
  notifications: seed.notifications,
  customerProfiles: seed.customerProfiles,
  capacityForecast: buildCapacityForecast(seed.drivers.length),
  autoDispatchEnabled: true,
  ambientOrdersEnabled: true,
  focusOrderId: seed.orders[0]?.id ?? null,
  focusDriverId: 'drv-1',
  tickCount: 0,

  suppliers: fleetOsSeed.suppliers,
  campaigns: fleetOsSeed.campaigns,
  supportTickets: fleetOsSeed.supportTickets,
  refundRequests: fleetOsSeed.refundRequests,
  roles: fleetOsSeed.roles,
  systemHealth: fleetOsSeed.systemHealth,
  catalogProducts: fleetOsSeed.catalogProducts,
  payouts: fleetOsSeed.payouts,
  globalAuditLog: fleetOsSeed.globalAuditLog,

  createOrder: (input) => {
    let order = buildOrderFromInput(input)

    if (input.simulateFailure) {
      order = { ...order, status: 'FAILED', paymentStatus: 'FAILED' }
      order = appendHistory(order, 'PAYMENT')
      order = appendAudit(order, 'PAYMENT', 'Payment declined', 'Card issuer declined the transaction (simulated)')
      set((state) => ({
        orders: [order, ...state.orders],
        notifications: pushNotification(state.notifications, 'ERROR', 'notif.paymentFailed.title', 'notif.paymentFailed.message', { orderNo: order.orderNo }, order.id),
        focusOrderId: order.id,
      }))
      return order
    }

    const confirmed = { ...fastForwardToConfirmed(order), suggestedDriverId: null as string | null }
    const withSuggestion = { ...confirmed, suggestedDriverId: suggestDriver(confirmed, get().drivers, get().vehicles) }

    set((state) => ({
      orders: [withSuggestion, ...state.orders],
      notifications: pushNotification(
        state.notifications, 'INFO', 'notif.orderReceived.title', 'notif.orderReceived.message',
        { orderNo: withSuggestion.orderNo, channel: withSuggestion.channel, pickup: withSuggestion.pickup.name, dropoff: withSuggestion.dropoff.name }, withSuggestion.id,
      ),
      focusOrderId: withSuggestion.id,
    }))

    if (withSuggestion.routeToDropoff?.source === 'SYNTHETIC') {
      scheduleRouteHydration(withSuggestion.id, 'routeToDropoff', withSuggestion.pickup, withSuggestion.dropoff)
    }

    return withSuggestion
  },

  retryPayment: (orderId) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order || order.status !== 'FAILED') return {}
      let next: Order = { ...order, status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID' }
      next = appendAudit(next, 'CUSTOMER', 'Retrying payment with a different method')
      next = fastForwardToConfirmed(next)
      next = { ...next, suggestedDriverId: suggestDriver(next, s.drivers, s.vehicles) }
      return {
        orders: s.orders.map((o) => (o.id === orderId ? next : o)),
        notifications: pushNotification(s.notifications, 'SUCCESS', 'notif.paymentRetrySuccess.title', 'notif.paymentRetrySuccess.message', { orderNo: order.orderNo }, orderId),
      }
    })
  },

  // "Assign" now kicks off the multi-channel dispatch/notification ladder
  // rather than instantly confirming a driver — mirrors the real Phase 2
  // notification module (In-App -> LINE+Phone escalation -> unresponsive flag).
  assignOrder: (orderId, driverId) => {
    const state = get()
    const order = state.orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'CONFIRMED') return
    const chosenDriverId = driverId ?? order.suggestedDriverId ?? suggestDriver(order, state.drivers, state.vehicles, order.unresponsiveDriverIds)
    if (!chosenDriverId) return
    const driver = state.drivers.find((d) => d.id === chosenDriverId)
    if (!driver || driver.status !== 'AVAILABLE') return

    const { order: updatedOrder, notifications } = startDispatchAttempt(order, driver, 1, state.notifications, 'DISPATCHER')

    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
      drivers: s.drivers.map((d) => (d.id === driver.id ? { ...d, status: 'PENDING_RESPONSE' } : d)),
      notifications,
    }))
  },

  // Called by the Driver App's Accept/Decline buttons on an incoming request.
  respondToDispatch: (orderId, accept, declineReason) => {
    const state = get()
    const order = state.orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'DRIVER_MATCHING' || !order.pendingDriverId) return
    const driver = state.drivers.find((d) => d.id === order.pendingDriverId)
    if (!driver) return

    const lastIndex = order.dispatchAttempts.length - 1
    const lastAttempt = order.dispatchAttempts[lastIndex]
    const attempts: DispatchAttempt[] = order.dispatchAttempts.map((a, i) =>
      i === lastIndex ? { ...a, status: accept ? 'ACCEPTED' : 'DECLINED', resolvedAt: Date.now(), declineReason: accept ? null : declineReason ?? 'OTHER' } : a,
    )

    if (accept) {
      const vehicle = state.vehicles.find((v) => v.id === driver.vehicleId)
      const driverLoc = driverAsLocation(driver)
      const routeToPickup = getCachedRoute(driverLoc, order.pickup) ?? buildRoutePath(driverLoc, order.pickup, `${order.id}-leg1-${driver.id}`)
      const updatedOrder = appendHistory(
        { ...order, status: 'ASSIGNED', driverId: driver.id, vehicleId: vehicle?.id ?? null, pendingDriverId: null, routeToPickup, legProgress: 0, dispatchAttempts: attempts },
        'DRIVER',
      )
      set((s) => ({
        orders: s.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        drivers: s.drivers.map((d) => (d.id === driver.id ? { ...d, status: 'BUSY', stats: bumpStats(d.stats, 'accepted') } : d)),
        notifications: pushNotification(s.notifications, 'SUCCESS', 'notif.driverAccepted.title', 'notif.driverAccepted.message', { driverName: driver.name, driverNameZh: driver.nameZh, orderNo: order.orderNo }, order.id, lastAttempt?.channels, driver.id),
      }))
      if (routeToPickup.source === 'SYNTHETIC') scheduleRouteHydration(order.id, 'routeToPickup', driverLoc, order.pickup)
      return
    }

    const freedDrivers = state.drivers.map((d) => (d.id === driver.id ? { ...d, status: 'AVAILABLE' as const, stats: bumpStats(d.stats, 'declined') } : d))
    const nextSuggestion = suggestDriver({ ...order, driverId: null }, freedDrivers, state.vehicles, order.unresponsiveDriverIds)
    const updatedOrder = appendHistory({ ...order, status: 'CONFIRMED', pendingDriverId: null, dispatchAttempts: attempts, escalationStage: 0, suggestedDriverId: nextSuggestion }, 'DRIVER')
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
      drivers: freedDrivers,
      notifications: pushNotification(s.notifications, 'WARNING', 'notif.driverDeclined.title', 'notif.driverDeclined.message', { driverName: driver.name, orderNo: order.orderNo }, order.id, lastAttempt?.channels, driver.id),
    }))
  },

  toggleDemoNoResponse: (orderId) =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? { ...o, demoForceNoResponse: !o.demoForceNoResponse } : o)) })),

  startTrip: (orderId) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId && o.status === 'ASSIGNED' ? appendHistory({ ...o, status: 'DRIVER_EN_ROUTE', legProgress: 0 }, 'DRIVER') : o)),
      notifications: pushNotification(s.notifications, 'INFO', 'notif.driverEnRoute.title', 'notif.driverEnRoute.message', undefined, orderId),
    }))
  },

  verifyPickupPin: (orderId, pin) => {
    const order = get().orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'ARRIVED') return false
    if (order.pickupPin !== pin.trim()) return false
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId ? appendHistory({ ...o, status: 'PASSENGER_ONBOARD', pickedUpAt: Date.now(), legProgress: 0, waitStartedAt: null }, 'DRIVER') : o,
      ),
      notifications: pushNotification(s.notifications, 'SUCCESS', 'notif.passengerPickedUp.title', 'notif.passengerPickedUp.message', undefined, orderId),
    }))
    return true
  },

  reportNoShow: (orderId) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order || order.status !== 'ARRIVED') return {}
      let next = appendHistory({ ...order, status: 'CANCELLED', noShowReported: true, cancellationReason: 'Passenger no-show at pickup' }, 'DRIVER')
      next = appendAudit(next, 'DRIVER', 'Reported passenger no-show', 'Order cancelled, no refund issued')
      return {
        orders: s.orders.map((o) => (o.id === orderId ? next : o)),
        drivers: order.driverId ? s.drivers.map((d) => (d.id === order.driverId ? { ...d, status: 'AVAILABLE' } : d)) : s.drivers,
        notifications: pushNotification(s.notifications, 'WARNING', 'notif.noShowReported.title', 'notif.noShowReported.message', { orderNo: order.orderNo }, orderId),
      }
    })
  },

  cancelOrder: (orderId) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      return {
        orders: s.orders.map((o) => (o.id === orderId ? appendHistory({ ...o, status: 'CANCELLED' }, 'DISPATCHER') : o)),
        drivers: order?.driverId ? s.drivers.map((d) => (d.id === order.driverId ? { ...d, status: 'AVAILABLE' } : d)) : s.drivers,
        notifications: pushNotification(s.notifications, 'WARNING', 'notif.orderCancelled.title', 'notif.orderCancelled.message', { orderNo: order?.orderNo ?? '' }, orderId),
      }
    })
  },

  requestCancellation: (orderId, reason, actor = 'CUSTOMER') => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order || ['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED', 'CANCELLATION_REQUESTED'].includes(order.status)) return {}
      let next = appendHistory({ ...order, status: 'CANCELLATION_REQUESTED', cancellationReason: reason }, actor)
      next = appendAudit(next, actor, 'Requested cancellation', reason)
      return {
        orders: s.orders.map((o) => (o.id === orderId ? next : o)),
        notifications: pushNotification(s.notifications, 'WARNING', 'notif.cancellationRequested.title', 'notif.cancellationRequested.message', { orderNo: order.orderNo }, orderId),
      }
    })
  },

  resolveCancellation: (orderId, approve) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order || order.status !== 'CANCELLATION_REQUESTED') return {}

      if (!approve) {
        const priorStatus = [...order.statusHistory].reverse().find((h) => h.status !== 'CANCELLATION_REQUESTED')?.status ?? 'CONFIRMED'
        let next = appendHistory({ ...order, status: priorStatus }, 'DISPATCHER')
        next = appendAudit(next, 'DISPATCHER', 'Rejected cancellation request', 'Trip remains active')
        return {
          orders: s.orders.map((o) => (o.id === orderId ? next : o)),
          notifications: pushNotification(s.notifications, 'INFO', 'notif.cancellationRejected.title', 'notif.cancellationRejected.message', { orderNo: order.orderNo }, orderId),
        }
      }

      const needsRefund = order.paymentStatus === 'PAID'
      let next = appendHistory({ ...order, status: 'CANCELLED' }, 'DISPATCHER')
      next = appendAudit(next, 'DISPATCHER', 'Approved cancellation', needsRefund ? 'Refund request opened' : 'No payment captured, no refund needed')

      let refundRequests = s.refundRequests
      let globalAuditLog = s.globalAuditLog
      if (needsRefund) {
        next = appendHistory({ ...next, status: 'REFUND_PENDING', paymentStatus: 'REFUND_PENDING' }, 'SYSTEM')
        const refund: RefundRequest = { id: genId('rfd'), orderId: order.id, orderNo: order.orderNo, customerName: order.customer.name, amount: order.priceEstimate, reason: order.cancellationReason ?? 'Cancellation approved', status: 'PENDING', requestedAt: Date.now(), resolvedAt: null }
        refundRequests = [refund, ...refundRequests]
        globalAuditLog = pushGlobalAudit(globalAuditLog, 'dispatcher', `Opened refund request for ${order.orderNo}`, 'Order', order.id)
      }

      return {
        orders: s.orders.map((o) => (o.id === orderId ? next : o)),
        drivers: order.driverId ? s.drivers.map((d) => (d.id === order.driverId ? { ...d, status: 'AVAILABLE' } : d)) : s.drivers,
        refundRequests,
        globalAuditLog,
        notifications: pushNotification(s.notifications, 'WARNING', 'notif.orderCancelled.title', 'notif.orderCancelled.message', { orderNo: order.orderNo }, orderId),
      }
    })
  },

  resolveRefund: (refundId, approve) => {
    set((s) => {
      const refund = s.refundRequests.find((r) => r.id === refundId)
      if (!refund || refund.status !== 'PENDING') return {}
      const order = s.orders.find((o) => o.id === refund.orderId)
      const nextRefunds = s.refundRequests.map((r) => (r.id === refundId ? { ...r, status: (approve ? 'PROCESSED' : 'REJECTED') as RefundRequestStatus, resolvedAt: Date.now() } : r))
      let orders = s.orders
      if (order) {
        let next = order
        if (approve) {
          next = appendHistory({ ...order, status: 'REFUNDED', paymentStatus: 'REFUNDED', refundAmount: refund.amount }, 'SYSTEM')
          next = appendAudit(next, 'DISPATCHER', 'Refund approved and processed', `NT$${refund.amount.toLocaleString()}`)
        } else {
          next = { ...order, paymentStatus: 'PAID' }
          next = appendAudit(next, 'DISPATCHER', 'Refund request rejected', refund.reason)
        }
        orders = s.orders.map((o) => (o.id === order.id ? next : o))
      }
      return {
        refundRequests: nextRefunds,
        orders,
        globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'finance', `${approve ? 'Approved' : 'Rejected'} refund for ${refund.orderNo}`, 'Refund', refundId),
        notifications: pushNotification(s.notifications, approve ? 'SUCCESS' : 'WARNING', approve ? 'notif.refundProcessed.title' : 'notif.refundRejected.title', approve ? 'notif.refundProcessed.message' : 'notif.refundRejected.message', { orderNo: refund.orderNo }, refund.orderId),
      }
    })
  },

  confirmSupplierOrder: (orderId) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order || order.status !== 'SUPPLIER_PENDING') return {}
      let next = appendHistory({ ...order, status: 'CONFIRMED', supplierStatus: 'CONFIRMED' }, 'SUPPLIER')
      next = appendAudit(next, 'SUPPLIER', 'Supplier confirmed availability')
      return { orders: s.orders.map((o) => (o.id === orderId ? { ...next, suggestedDriverId: suggestDriver(next, s.drivers, s.vehicles) } : o)) }
    })
  },

  rejectSupplierOrder: (orderId) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order || order.status !== 'SUPPLIER_PENDING') return {}
      let next = appendHistory({ ...order, status: 'FAILED', supplierStatus: 'REJECTED' }, 'SUPPLIER')
      next = appendAudit(next, 'SUPPLIER', 'Supplier rejected availability', 'No inventory for requested time')
      return {
        orders: s.orders.map((o) => (o.id === orderId ? next : o)),
        notifications: pushNotification(s.notifications, 'ERROR', 'notif.supplierRejected.title', 'notif.supplierRejected.message', { orderNo: order.orderNo }, orderId),
      }
    })
  },

  rateDriver: (orderId, stars) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order) return {}
      const next = appendAudit({ ...order, driverRatingByCustomer: stars }, 'CUSTOMER', 'Rated driver', `${stars} \u2605`)
      const drivers = order.driverId
        ? s.drivers.map((d) => (d.id === order.driverId ? { ...d, rating: Math.round(((d.rating * d.completedTrips + stars) / (d.completedTrips + 1)) * 10) / 10 } : d))
        : s.drivers
      return { orders: s.orders.map((o) => (o.id === orderId ? next : o)), drivers }
    })
  },

  rateCustomer: (orderId, stars) => {
    set((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? appendAudit({ ...o, customerRatingByDriver: stars }, 'DRIVER', 'Rated passenger', `${stars} \u2605`) : o)) }))
  },

  uploadTollEvidence: (orderId) => {
    set((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? appendAudit({ ...o, tollParkingEvidenceUploaded: true }, 'DRIVER', 'Uploaded toll/parking receipt (mock)') : o)) }))
  },

  requestInvoice: (orderId) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? appendAudit({ ...o, invoiceRequested: true, invoiceIssued: true }, 'CUSTOMER', 'Requested e-invoice', 'Issued to registered email') : o)),
    }))
  },

  logOrderAction: (orderId, actor, action, detail) => {
    set((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? appendAudit(o, actor, action, detail) : o)) }))
  },

  rescheduleOrder: (orderId, newIso) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId ? appendAudit({ ...o, scheduledTime: newIso }, 'CUSTOMER', 'Changed pickup time', new Date(newIso).toLocaleString()) : o,
      ),
      notifications: pushNotification(s.notifications, 'INFO', 'notif.orderRescheduled.title', 'notif.orderRescheduled.message', { orderNo: s.orders.find((o) => o.id === orderId)?.orderNo ?? '' }, orderId),
    }))
  },

  addOrderNote: (orderId, note) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? appendAudit({ ...o, notes: note }, 'CUSTOMER', 'Added trip note', note) : o)),
    }))
  },

  updateFlightNumber: (orderId, flightNumber) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? appendAudit({ ...o, flightNumber }, 'CUSTOMER', 'Updated flight number', flightNumber) : o)),
    }))
  },

  setAutoDispatch: (v) => set({ autoDispatchEnabled: v }),
  setAmbientOrders: (v) => set({ ambientOrdersEnabled: v }),
  setFocusOrder: (id) => set({ focusOrderId: id }),
  setFocusDriver: (id) => set({ focusDriverId: id }),
  dismissNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  setDriverAvailability: (driverId, status) =>
    set((s) => ({
      drivers: s.drivers.map((d) =>
        d.id === driverId && d.status !== 'BUSY' && d.status !== 'PENDING_RESPONSE'
          ? { ...d, status, shiftStartedAt: status === 'AVAILABLE' ? d.shiftStartedAt ?? Date.now() : status === 'OFFLINE' ? null : d.shiftStartedAt }
          : d,
      ),
    })),
  setDriverWorkingMode: (driverId, mode) => set((s) => ({ drivers: s.drivers.map((d) => (d.id === driverId ? { ...d, workingMode: mode } : d)) })),
  setDriverZone: (driverId, zone) => set((s) => ({ drivers: s.drivers.map((d) => (d.id === driverId ? { ...d, currentZone: zone } : d)) })),
  setDriverAutoAccept: (driverId, v) => set((s) => ({ drivers: s.drivers.map((d) => (d.id === driverId ? { ...d, autoAcceptEnabled: v } : d)) })),
  setDriverAirportPreference: (driverId, v) => set((s) => ({ drivers: s.drivers.map((d) => (d.id === driverId ? { ...d, airportPreference: v } : d)) })),

  hydrateSeedRoutes: () => {
    const state = get()
    // Scoped to genuinely "in motion" / assigned orders only — bulk seed
    // data (86 active + hundreds of historical completed orders) stays on
    // synthetic routes so app load never fires hundreds of OSRM requests.
    for (const order of state.orders) {
      if (!['ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD'].includes(order.status)) continue
      if (order.routeToDropoff && order.routeToDropoff.source === 'SYNTHETIC') {
        scheduleRouteHydration(order.id, 'routeToDropoff', order.pickup, order.dropoff)
      }
      if (order.routeToPickup && order.routeToPickup.source === 'SYNTHETIC' && order.driverId) {
        const driver = state.drivers.find((d) => d.id === order.driverId)
        if (driver) scheduleRouteHydration(order.id, 'routeToPickup', driverAsLocation(driver), order.pickup)
      }
    }
  },

  tick: () => {
    const s = get()
    const now = Date.now()
    let notifications = s.notifications

    // Ambient orders are capped independently of the ~86-order seeded
    // baseline (tagged `ord-bulk-*`) so the client-requested headline figure
    // stays stable while the live demo queue still feels alive.
    const liveDemoActiveCount = s.orders.filter((o) => !o.id.startsWith('ord-bulk-') && ACTIVE_STATUS_SET.has(o.status)).length

    let orders = s.orders
    if (s.ambientOrdersEnabled && liveDemoActiveCount < MAX_ACTIVE_AMBIENT_ORDERS && Math.random() < AMBIENT_ORDER_CHANCE) {
      const withSuggestion = buildAmbientOrder()
      const suggested = { ...withSuggestion, suggestedDriverId: suggestDriver(withSuggestion, s.drivers, s.vehicles) }
      orders = [suggested, ...orders]
      notifications = pushNotification(notifications, 'INFO', 'notif.orderReceived.title', 'notif.orderReceived.message', { orderNo: suggested.orderNo, channel: suggested.channel, pickup: suggested.pickup.name, dropoff: suggested.dropoff.name }, suggested.id)
      if (suggested.routeToDropoff?.source === 'SYNTHETIC') scheduleRouteHydration(suggested.id, 'routeToDropoff', suggested.pickup, suggested.dropoff)
    }

    let drivers = s.drivers
    drivers = drivers.map((d) => (d.unresponsiveFlagUntil && d.unresponsiveFlagUntil <= now ? { ...d, unresponsiveFlagUntil: null, unresponsiveOrderNo: null } : d))

    if (s.autoDispatchEnabled) {
      for (const order of orders) {
        if (order.status !== 'CONFIRMED') continue
        if (!order.suggestedDriverId) continue
        if (Math.random() > AUTO_ASSIGN_CHANCE) continue
        const driver = drivers.find((d) => d.id === order.suggestedDriverId)
        if (!driver || driver.status !== 'AVAILABLE') continue

        const { order: updatedOrder, notifications: nextNotifications } = startDispatchAttempt(order, driver, 1, notifications, 'SYSTEM')
        orders = orders.map((o) => (o.id === order.id ? updatedOrder : o))
        drivers = drivers.map((d) => (d.id === driver.id ? { ...d, status: 'PENDING_RESPONSE' } : d))
        notifications = nextNotifications
      }
    }

    orders = orders.map((order) => {
      if (order.status !== 'DRIVER_MATCHING' || !order.pendingDriverId) return order
      const attemptIndex = order.dispatchAttempts.length - 1
      const attempt = order.dispatchAttempts[attemptIndex]
      if (!attempt || attempt.status !== 'AWAITING_RESPONSE') return order

      const driver = drivers.find((d) => d.id === order.pendingDriverId)
      if (!driver) return order

      const timedOut = now >= attempt.respondBy
      const shouldAutoAccept = !order.demoForceNoResponse && !timedOut && Math.random() < AUTO_ACCEPT_CHANCE_PER_TICK

      if (shouldAutoAccept) {
        const vehicle = s.vehicles.find((v) => v.id === driver.vehicleId)
        const driverLoc = driverAsLocation(driver)
        const routeToPickup = getCachedRoute(driverLoc, order.pickup) ?? buildRoutePath(driverLoc, order.pickup, `${order.id}-leg1-${driver.id}`)
        drivers = drivers.map((d) => (d.id === driver.id ? { ...d, status: 'BUSY', stats: bumpStats(d.stats, 'accepted') } : d))
        notifications = pushNotification(notifications, 'SUCCESS', 'notif.driverAccepted.title', 'notif.driverAccepted.message', { driverName: driver.name, driverNameZh: driver.nameZh, orderNo: order.orderNo }, order.id, attempt.channels, driver.id)
        if (routeToPickup.source === 'SYNTHETIC') scheduleRouteHydration(order.id, 'routeToPickup', driverLoc, order.pickup)
        return appendHistory(
          { ...order, status: 'ASSIGNED', driverId: driver.id, vehicleId: vehicle?.id ?? null, pendingDriverId: null, routeToPickup, legProgress: 0, dispatchAttempts: order.dispatchAttempts.map((a, i) => (i === attemptIndex ? { ...a, status: 'ACCEPTED', resolvedAt: now } : a)) },
          'DRIVER',
        )
      }

      if (!timedOut) return order

      if (attempt.stage === 1) {
        const resolvedAttempts = order.dispatchAttempts.map((a, i) => (i === attemptIndex ? { ...a, status: 'TIMED_OUT' as const, resolvedAt: now } : a))
        const { order: escalated, notifications: nextNotifications } = startDispatchAttempt({ ...order, dispatchAttempts: resolvedAttempts }, driver, 2, notifications, 'SYSTEM')
        notifications = nextNotifications
        return escalated
      }

      drivers = drivers.map((d) => (d.id === driver.id ? { ...d, status: 'AVAILABLE', unresponsiveFlagUntil: now + UNRESPONSIVE_FLAG_MS, unresponsiveOrderNo: order.orderNo, stats: bumpStats(d.stats, 'missed') } : d))
      const unresponsiveDriverIds = [...order.unresponsiveDriverIds, driver.id]
      const nextSuggestion = suggestDriver({ ...order, driverId: null }, drivers, s.vehicles, unresponsiveDriverIds)
      notifications = pushNotification(notifications, 'ERROR', 'notif.driverUnresponsive.title', 'notif.driverUnresponsive.message', { driverName: driver.name, driverNameZh: driver.nameZh, orderNo: order.orderNo }, order.id, attempt.channels, driver.id)
      return appendHistory(
        { ...order, status: 'CONFIRMED', pendingDriverId: null, escalationStage: 0, unresponsiveDriverIds, suggestedDriverId: nextSuggestion, dispatchAttempts: order.dispatchAttempts.map((a, i) => (i === attemptIndex ? { ...a, status: 'TIMED_OUT' as const, resolvedAt: now } : a)) },
        'SYSTEM',
      )
    })

    orders = orders.map((order) => {
      if (order.status === 'DRIVER_EN_ROUTE' && order.routeToPickup) {
        const step = 1 / order.routeToPickup.durationTicks
        const nextProgress = order.legProgress + step
        if (nextProgress >= 1) {
          notifications = pushNotification(notifications, 'SUCCESS', 'notif.driverArrived.title', 'notif.driverArrived.message', { orderNo: order.orderNo }, order.id)
          const pos = { lat: order.pickup.lat, lng: order.pickup.lng, x: order.pickup.svgX, y: order.pickup.svgY }
          drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
          return appendHistory({ ...order, status: 'ARRIVED', legProgress: 1, currentPos: pos, waitStartedAt: now }, 'SYSTEM')
        }
        const pos = evaluateRoute(order.routeToPickup, nextProgress)
        drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
        return { ...order, legProgress: nextProgress, currentPos: pos }
      }

      if (order.status === 'PASSENGER_ONBOARD' && order.routeToDropoff) {
        const step = 1 / order.routeToDropoff.durationTicks
        const nextProgress = order.legProgress + step
        if (nextProgress >= 1) {
          notifications = pushNotification(notifications, 'SUCCESS', 'notif.tripCompleted.title', 'notif.tripCompleted.message', { orderNo: order.orderNo }, order.id)
          drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, status: 'AVAILABLE' } : d))
          const pos = { lat: order.dropoff.lat, lng: order.dropoff.lng, x: order.dropoff.svgX, y: order.dropoff.svgY }
          return appendHistory({ ...order, status: 'COMPLETED', legProgress: 1, currentPos: pos }, 'SYSTEM')
        }
        const pos = evaluateRoute(order.routeToDropoff, nextProgress)
        drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
        return { ...order, legProgress: nextProgress, currentPos: pos }
      }

      if (order.flightInfo && ACTIVE_STATUS_SET.has(order.status) && Math.random() < 0.06) {
        const drifted = driftFlightStatus(order.flightInfo)
        if (drifted.status !== order.flightInfo.status) {
          notifications = pushNotification(notifications, drifted.status === 'DELAYED' ? 'WARNING' : 'INFO', 'notif.flightUpdated.title', 'notif.flightUpdated.message', { flightNumber: drifted.flightNumber, status: drifted.status.replace('_', ' '), delay: drifted.status === 'DELAYED' ? ` (+${drifted.delayMinutes}m)` : '' }, order.id)
        }
        return { ...order, flightInfo: drifted }
      }

      return order
    })

    set({ orders, drivers, notifications, tickCount: s.tickCount + 1 })
  },

  setSupplierStatus: (id, status) =>
    set((s) => ({
      suppliers: s.suppliers.map((sup) => (sup.id === id ? { ...sup, status } : sup)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'ops.manager', `Set supplier status to ${status}`, 'Supplier', id),
    })),

  setCampaignStatus: (id, status) =>
    set((s) => ({
      campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, status } : c)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'marketing.manager', `Set campaign status to ${status}`, 'Campaign', id),
    })),

  setTicketStatus: (id, status) =>
    set((s) => ({
      supportTickets: s.supportTickets.map((t) => (t.id === id ? { ...t, status, updatedAt: Date.now() } : t)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'support.agent', `Set ticket status to ${status}`, 'SupportTicket', id),
    })),

  addTicketMessage: (id, text) =>
    set((s) => ({
      supportTickets: s.supportTickets.map((t) =>
        t.id === id ? { ...t, updatedAt: Date.now(), status: t.status === 'OPEN' ? 'IN_PROGRESS' : t.status, messages: [...t.messages, { id: genId('msg'), from: 'AGENT', text, at: Date.now() }] } : t,
      ),
    })),

  createSupportTicket: (orderId, customerName, subject, category) => {
    const order = orderId ? get().orders.find((o) => o.id === orderId) : undefined
    const ticket: SupportTicket = {
      id: genId('tix'), ticketNo: `SUP-${2300 + Math.floor(Math.random() * 700)}`, orderId: orderId ?? null, orderNo: order?.orderNo ?? null,
      customerName, subject, category, status: 'OPEN', priority: 'MEDIUM', createdAt: Date.now(), updatedAt: Date.now(),
      messages: [{ id: genId('msg'), from: 'CUSTOMER', text: subject, at: Date.now() }],
    }
    set((s) => ({
      supportTickets: [ticket, ...s.supportTickets],
      orders: orderId ? s.orders.map((o) => (o.id === orderId ? appendAudit({ ...o, supportTicketId: ticket.id }, 'CUSTOMER', 'Opened support case', ticket.ticketNo) : o)) : s.orders,
    }))
    return ticket
  },

  toggleRolePermission: (roleId, permission) =>
    set((s) => ({
      roles: s.roles.map((r) => (r.id === roleId ? { ...r, permissions: r.permissions.includes(permission) ? r.permissions.filter((p) => p !== permission) : [...r.permissions, permission] } : r)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'super.admin', `Toggled permission "${permission}"`, 'Role', roleId),
    })),

  setRoleTwoFactor: (roleId, v) =>
    set((s) => ({
      roles: s.roles.map((r) => (r.id === roleId ? { ...r, twoFactorRequired: v } : r)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'super.admin', `Set 2FA requirement to ${v}`, 'Role', roleId),
    })),

  acknowledgeHealthAlert: (id) =>
    set((s) => ({
      systemHealth: s.systemHealth.map((h) => (h.id === id ? { ...h, acknowledged: true } : h)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'system.oncall', 'Acknowledged system health alert', 'SystemHealth', id),
    })),

  setCatalogProductStatus: (id, status) =>
    set((s) => ({
      catalogProducts: s.catalogProducts.map((p) => (p.id === id ? { ...p, status } : p)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'catalog.manager', `Set catalog product status to ${status}`, 'CatalogProduct', id),
    })),

  markPayoutPaid: (id) =>
    set((s) => ({
      payouts: s.payouts.map((p) => (p.id === id ? { ...p, status: 'PAID' } : p)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'finance', 'Marked payout as paid', 'Payout', id),
    })),

  addSavedPassenger: (customerId, passenger) =>
    set((s) => ({ customerProfiles: s.customerProfiles.map((c) => (c.id === customerId ? { ...c, savedPassengers: [...c.savedPassengers, { ...passenger, id: genId('pax') }] } : c)) })),
  removeSavedPassenger: (customerId, passengerId) =>
    set((s) => ({ customerProfiles: s.customerProfiles.map((c) => (c.id === customerId ? { ...c, savedPassengers: c.savedPassengers.filter((p) => p.id !== passengerId) } : c)) })),
  addPaymentMethod: (customerId, token) =>
    set((s) => ({ customerProfiles: s.customerProfiles.map((c) => (c.id === customerId ? { ...c, paymentMethods: [...c.paymentMethods, { ...token, id: genId('pm') }] } : c)) })),
  removePaymentMethod: (customerId, tokenId) =>
    set((s) => ({ customerProfiles: s.customerProfiles.map((c) => (c.id === customerId ? { ...c, paymentMethods: c.paymentMethods.filter((p) => p.id !== tokenId) } : c)) })),
  setDefaultPaymentMethod: (customerId, tokenId) =>
    set((s) => ({ customerProfiles: s.customerProfiles.map((c) => (c.id === customerId ? { ...c, paymentMethods: c.paymentMethods.map((p) => ({ ...p, isDefault: p.id === tokenId })) } : c)) })),
  setNotificationPreference: (customerId, key, v) =>
    set((s) => ({ customerProfiles: s.customerProfiles.map((c) => (c.id === customerId ? { ...c, notificationPreference: { ...c.notificationPreference, [key]: v } } : c)) })),
  requestPrivacyAction: (customerId, kind) =>
    set((s) => ({ customerProfiles: s.customerProfiles.map((c) => (c.id === customerId ? { ...c, privacyRequests: [{ id: genId('priv'), kind, status: 'PENDING', requestedAt: Date.now() }, ...c.privacyRequests] } : c)) })),
  setConsentMarketing: (customerId, v) =>
    set((s) => ({ customerProfiles: s.customerProfiles.map((c) => (c.id === customerId ? { ...c, consentMarketing: v } : c)) })),
}))

// Dev/demo-only escape hatch for e2e/artifact scripts that need to drive the
// simulation deterministically (e.g. forcing a specific driver's incoming
// request) instead of racing the randomized response-window timers. Never
// included in production builds.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __fleetStore?: typeof useFleetStore }).__fleetStore = useFleetStore
}

/** Resolves (and, once resolved, patches into the store) a real road-snapped
 * OSRM route for one order leg — called after the order/leg is created with
 * its synthetic fallback so the UI updates in place the moment the routing
 * service responds, with zero risk to the synchronous booking flow if the
 * network is slow or unavailable. */
function scheduleRouteHydration(orderId: string, leg: 'routeToPickup' | 'routeToDropoff', from: LocationRef, to: LocationRef): void {
  resolveDynamicRoute(from, to).then((route) => {
    if (!route) return
    const state = useFleetStore.getState()
    const order = state.orders.find((o) => o.id === orderId)
    if (!order || order[leg]?.source === 'OSRM') return
    useFleetStore.setState({ orders: state.orders.map((o) => (o.id === orderId ? { ...o, [leg]: route } : o)) })
  })
}
