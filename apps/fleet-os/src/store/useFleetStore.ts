import { create } from 'zustand'
import type {
  AccessAuthMethod,
  AccessAttemptStatus,
  AccessLogEntry,
  AddDriverInput,
  AppNotification,
  AuditEntry,
  AuditLogEntry,
  AuthMethod,
  AuthSession,
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
  EmergencyStatus,
  IncidentDetails,
  IncidentType,
  InstantCashoutReceipt,
  LocationRef,
  LostItemReport,
  ManualOrderInput,
  NotificationChannel,
  NotificationKind,
  NotificationPreference,
  OperatingParams,
  Order,
  OrderStatus,
  PassengerRequirements,
  PaymentToken,
  PricingRules,
  RefundRequest,
  RefundRequestStatus,
  Role,
  SavedPassenger,
  StaffAccount,
  StaffAccountStatus,
  StaffRole,
  Supplier,
  SupplierStatus,
  SupportTicket,
  SupportTicketStatus,
  SystemHealthMetric,
  StatusActor,
  TaiwanRegion,
  Vehicle,
  VehicleCategory,
  VehicleFeature,
  ZoneCondition,
} from '../types'
import { createSeedState, SEED_VEHICLES } from '../data/seed'
import { buildFleetOsSeed } from '../data/fleetOsSeed'
import { AIRPORTS, getLocation, NON_AIRPORTS } from '../data/locations'
import { buildRoutePath, evaluateRoute } from '../lib/geo'
import { getCachedRoute, resolveDynamicRoute } from '../lib/routing'
import { driftFlightStatus, lookupFlight, randomFlightNumber } from '../lib/flight'
import { ensureOrderNoAbove, estimateDurationMin, findCoupon, genId, nextOrderNo } from '../lib/pricing'
import { buildInitialZoneConditions, computeDynamicFareBreakdown, countAvailableVehicles, DEFAULT_PRICING_RULES, driftZoneConditions } from '../lib/dynamicPricing'
import { DEFAULT_CATEGORY_FOR_TYPE, VEHICLE_CATEGORY_CATALOG } from '../data/vehicleCatalog'
import { suggestDriver } from '../lib/dispatch'
import { buildCapacityForecast, buildShiftSchedule } from '../lib/capacity'
import { DEFAULT_OPERATING_PARAMS, SEED_STAFF_ACCOUNTS } from '../data/fleetOsSeed'
import { loadStoredAccessLogs, saveStoredAccessLogs, createAccessLogEntry } from '../lib/geoTracker'
import {
  computeWaitingFee,
  LAST_MINUTE_AUTO_CANCEL_DEMO_MS,
  MAJOR_FLIGHT_SHIFT_MINUTES,
  WAITING_GRACE_MINUTES,
} from '../lib/serviceRules'

const NO_PASSENGER_REQUIREMENTS: PassengerRequirements = { childSeat: false, wheelchair: false, pet: false, specialAssistance: '' }

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
  staffAccounts: StaffAccount[]
  operatingParams: OperatingParams

  /** Security Access Logs & Visitor Geolocation tracking */
  accessLogs: AccessLogEntry[]

  /** Simulated Dynamic Pricing Service state — see `lib/dynamicPricing.ts`. */
  zoneConditions: ZoneCondition[]
  pricingRules: PricingRules
  categoryPriceOverrides: Partial<Record<VehicleCategory, { baseFare: number; perKmRate: number; perMinRate: number }>>

  /** Lightweight, fully-simulated account access (no real backend/session). */
  authSession: AuthSession

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
  /** 翻譯校對 (Translation Proofreading) — ops confirms (optionally after
   * editing) the Traditional Chinese working translation for one order's
   * `notes`, moving it out of the pending queue. See `lib/translation.ts`. */
  submitTranslationReview: (orderId: string, editedNotesZh: string) => void
  /** Creates a phone/walk-in order directly in a confirmed state — mirrors
   * the reference site's 手動開單 (Manual Order Entry) screen. */
  createManualOrder: (input: ManualOrderInput) => Order

  /** Realism/depth additions inspired by 機場快綫 Airport Express and 萬馬接送
   * Wanma Transfer — see `lib/serviceRules.ts` for every rule's provenance. */
  revealDriverInfoNow: (orderId: string) => void
  agreeToWaitForLatePassenger: (orderId: string) => void
  simulateLatePassenger: (orderId: string) => void
  simulateFlightEvent: (orderId: string, kind: 'LANDED' | 'DIVERTED' | 'MAJOR_DELAY') => void
  addOrderWaypoint: (orderId: string, label: string) => void
  removeOrderWaypoint: (orderId: string, waypointId: string) => void

  /** Phase 2 Blueprint module: 緊急處理 + 臨時調度系統 (Emergency & Rescue Dispatch) */
  reportDriverEmergency: (
    orderId: string,
    incidentType: IncidentType,
    details: { note: string; passengerSafe: boolean; needsAmbulance: boolean; vehicleTowed: boolean },
  ) => void
  dispatchRescueDriver: (orderId: string, replacementDriverId: string) => void
  acceptRescueMission: (orderId: string, driverId: string) => void
  resolveEmergencyIncident: (orderId: string) => void

  loginWithLine: () => void
  loginWithEmail: (email: string, displayName?: string) => void
  logout: () => void

  // ---- Advanced Onboarding / Add Driver ----
  addNewDriver: (input: AddDriverInput, actor?: string) => Driver

  // ---- Driver App Advanced: Fatigue, Instant Cashout, Inspection ----
  toggleDriverBreakMode: (driverId: string) => void
  submitPreTripInspection: (driverId: string, checklist: { tires: boolean; brakes: boolean; lights: boolean; dashcam: boolean }) => boolean
  requestInstantCashout: (driverId: string, amount: number, method: 'BANK_TRANSFER' | 'LINE_PAY_MONEY') => InstantCashoutReceipt

  // ---- Customer App Advanced: Tips, Split Fare, Lost & Found ----
  tipAndRateDriver: (orderId: string, tipAmount: number, ratingTags: string[], ratingStars?: number) => void
  reportLostItem: (orderId: string, report: Omit<LostItemReport, 'id' | 'reportedAt' | 'status' | 'driverAcknowledged'>) => LostItemReport
  acknowledgeLostItem: (orderId: string, dispatcherNotes?: string) => void

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
  setDriverLoginEnabled: (driverId: string, v: boolean) => void
  hydrateSeedRoutes: () => void
  tick: () => void

  // ---- 帳號管理 (Account Management) ----
  addStaffAccount: (input: { name: string; email: string; role: StaffRole }) => void
  setStaffAccountStatus: (id: string, status: StaffAccountStatus) => void

  // ---- 營運參數 (Operating Parameters) ----
  updateOperatingParams: (patch: Partial<OperatingParams>, actor?: string) => void

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

  // ---- Dynamic Pricing Service (/fleet-os/pricing/dynamic) ----
  updatePricingRules: (patch: Partial<PricingRules>, actor?: string) => void
  setZoneCondition: (region: TaiwanRegion, patch: Partial<Pick<ZoneCondition, 'weather' | 'demand'>>, actor?: string) => void
  setCategoryPriceOverride: (category: VehicleCategory, patch: { baseFare: number; perKmRate: number; perMinRate: number }, actor?: string) => void

  // ---- Fleet & Vehicle Inventory backend (/fleet-os/vehicles) ----
  setVehicleMaintenance: (vehicleId: string, hours: number | null, reason: string, actor?: string) => void
  setVehicleServiceZone: (vehicleId: string, zone: TaiwanRegion, actor?: string) => void
  setVehicleCategory: (vehicleId: string, category: VehicleCategory, actor?: string) => void
  toggleVehicleFeature: (vehicleId: string, feature: VehicleFeature, actor?: string) => void

  addSavedPassenger: (customerId: string, passenger: Omit<SavedPassenger, 'id'>) => void
  removeSavedPassenger: (customerId: string, passengerId: string) => void
  addPaymentMethod: (customerId: string, token: Omit<PaymentToken, 'id'>) => void
  removePaymentMethod: (customerId: string, tokenId: string) => void
  setDefaultPaymentMethod: (customerId: string, tokenId: string) => void
  setNotificationPreference: (customerId: string, key: keyof NotificationPreference, v: boolean) => void
  requestPrivacyAction: (customerId: string, kind: 'DATA_DOWNLOAD' | 'DELETE_ACCOUNT') => void
  setConsentMarketing: (customerId: string, v: boolean) => void

  // ---- Visitor IP & Access Security Log Actions ----
  recordAccessAttempt: (authMethod: AccessAuthMethod, status: AccessAttemptStatus, inputIdentifier?: string) => Promise<AccessLogEntry>
  clearAccessLogs: () => void
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

export function classifyOrderType(pickupId: string, dropoffId: string, forceCharter?: boolean): Order['type'] {
  if (forceCharter) return 'HOURLY_CHARTER'
  const pickup = getLocation(pickupId)
  const dropoff = getLocation(dropoffId)
  if (pickup.isAirport) return 'AIRPORT_PICKUP'
  if (dropoff.isAirport) return 'AIRPORT_DROPOFF'
  return 'TOUR_CHARTER'
}

function randomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

/** Resolves a booking's full `PassengerRequirements`, preferring the
 * structured field and falling back to the two deprecated top-level
 * booleans for any older call site that hasn't migrated yet. */
function resolvePassengerRequirements(input: BookingInput): PassengerRequirements {
  if (input.passengerRequirements) return input.passengerRequirements
  return { ...NO_PASSENGER_REQUIREMENTS, childSeat: input.childSeat ?? false, wheelchair: input.wheelchair ?? false }
}

/** Builds a live order from a customer booking, running the full Dynamic
 * Pricing Service (`lib/dynamicPricing.ts`) against the *current* simulated
 * zone weather/demand + fleet availability — this is what makes a real
 * booking's fare (as opposed to seed/ambient orders, which use neutral
 * conditions) actually reflect the client brief's dynamic-pricing factors. */
function buildOrderFromInput(
  input: BookingInput,
  context: { zoneConditions: ZoneCondition[]; pricingRules: PricingRules; vehicles: Vehicle[]; drivers: Driver[]; categoryPriceOverrides: FleetState['categoryPriceOverrides'] },
): Order {
  const pickup = getLocation(input.pickupId)
  const dropoff = getLocation(input.dropoffId)
  const isCharter = !!input.charterHours && input.charterHours > 0
  const type = classifyOrderType(input.pickupId, input.dropoffId, isCharter)
  const id = genId('ord')
  const routeToDropoff = getCachedRoute(pickup, dropoff) ?? buildRoutePath(pickup, dropoff, `${id}-leg2`)
  const flightInfo = input.flightNumber ? lookupFlight(input.flightNumber, input.scheduledTime) : null
  const isAirport = pickup.isAirport || dropoff.isAirport
  const waitingMinutes = flightInfo?.status === 'DELAYED' && pickup.isAirport ? flightInfo.delayMinutes : 0
  const durationMin = estimateDurationMin(routeToDropoff.distanceKm)

  const vehicleCategory = input.vehicleCategory ?? DEFAULT_CATEGORY_FOR_TYPE[input.vehicleType]
  const passengerRequirements = resolvePassengerRequirements(input)
  const catalogEntry = VEHICLE_CATEGORY_CATALOG[vehicleCategory]
  const override = context.categoryPriceOverrides[vehicleCategory]
  const pricedCategory = override ? { ...catalogEntry, ...override } : catalogEntry
  const pickupZone = pickup.region
  const zoneCondition = pickupZone ? context.zoneConditions.find((z) => z.region === pickupZone) : undefined
  const availableVehiclesInZone = pickupZone
    ? countAvailableVehicles(context.vehicles, context.drivers, pickupZone, vehicleCategory, catalogEntry.underlyingType)
    : 999

  const fareBreakdown = computeDynamicFareBreakdown({
    category: pricedCategory,
    distanceKm: routeToDropoff.distanceKm,
    durationMin,
    isAirport,
    pickupZone,
    scheduledTimeIso: new Date(input.scheduledTime).toISOString(),
    waitingMinutes,
    availableVehiclesInZone,
    weather: zoneCondition?.weather ?? 'CLEAR',
    demand: zoneCondition?.demand ?? 'NORMAL',
    rules: context.pricingRules,
    couponCode: input.couponCode ?? null,
    charterHours: input.charterHours ?? null,
    mountainRoute: input.mountainRoute ?? false,
  })
  // Coupon discount math stays in `lib/pricing.ts`'s legacy percent/fixed
  // shape (rather than duplicating it inside the pure pricing engine) so the
  // Marketplace/Customer App coupon UX behaves identically to before.
  const couponDef = findCoupon(input.couponCode)
  const discount = couponDef ? (couponDef.kind === 'PERCENT' ? Math.round(fareBreakdown.subtotal * (couponDef.value / 100)) : Math.min(fareBreakdown.subtotal, couponDef.value)) : 0
  const roundTo = Math.max(1, context.pricingRules.roundingIncrement)
  const total = Math.max(0, Math.round((fareBreakdown.subtotal - discount) / roundTo) * roundTo)
  const finalFareBreakdown = { ...fareBreakdown, discount, couponCode: couponDef ? couponDef.code : null, total }

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
    vehicleCategory,
    passengerRequirements,
    passengers: input.passengers,
    luggage: input.luggage,
    notes: input.notes,
    // Real bookings placed directly through this app are already written in
    // the customer's own words at checkout, so they never need the 翻譯校對
    // (Translation Proofreading) queue — that queue only applies to
    // ambient/seed orders simulating inbound foreign-language OTA channels.
    // See `lib/translation.ts`.
    translationStatus: 'NOT_NEEDED',
    sourceLanguage: null,
    originalNoteText: null,
    flightNumber: input.flightNumber || null,
    flightInfo,
    driverId: null,
    vehicleId: null,
    suggestedDriverId: null,
    priceEstimate: finalFareBreakdown.total,
    fareBreakdown: finalFareBreakdown,
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
    bookingUrgency: input.bookingUrgency ?? 'STANDARD',
    flightLandedAt: flightInfo?.status === 'LANDED' ? now : null,
    driverInfoRevealOverride: false,
    paymentMethod: input.paymentMethod ?? 'card',
    lateFeeAmount: null,
    lateFeeWaitMinutes: null,
    waitingFeeAgreed: false,
    waypoints: input.waypoints ?? [],
  }
}

/** Advances a freshly-created order through PAID -> (SUPPLIER_PENDING ->) CONFIRMED
 * synchronously, with a believable statusHistory/auditLog trail — mirrors the
 * booking-source -> Fleet OS -> supplier-confirmation flow from the client
 * brief without needing async store mutations for the common success path. */
function fastForwardToConfirmed(order: Order): Order {
  const now = Date.now()
  // Cash-on-arrival/drop-off (Airport Express's payment option) is only
  // *authorized* now — the app never captures it; it's marked PAID once the
  // trip actually completes and cash changes hands (see `tick()`).
  const isCash = order.paymentMethod === 'cash'
  let next: Order = { ...order, paymentStatus: isCash ? 'AUTHORIZED' : 'PAID', status: 'PAID' }
  next = { ...next, statusHistory: [...next.statusHistory, { id: genId('hist'), status: 'PAID', at: now + 400, actor: 'PAYMENT' }] }
  next = appendAudit(next, 'PAYMENT', isCash ? 'Payment method authorized (cash on arrival)' : 'Payment captured', isCash ? `${next.fareBreakdown.total.toLocaleString()} TWD due in cash` : `${next.fareBreakdown.total.toLocaleString()} TWD`)

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

/** Shared by both the last-minute-unmatched and major-flight-change auto-
 * cancel triggers: cancels an order and, if it had captured payment, opens
 * a refund request — mirroring the manual `resolveCancellation` approval
 * path but fired automatically by the simulation rather than a dispatcher. */
function autoCancelWithRefund(
  order: Order,
  reasonDetail: string,
  refundRequests: RefundRequest[],
  globalAuditLog: AuditLogEntry[],
): { order: Order; refundRequests: RefundRequest[]; globalAuditLog: AuditLogEntry[] } {
  const needsRefund = order.paymentStatus === 'PAID' || order.paymentStatus === 'AUTHORIZED'
  let next = appendHistory({ ...order, status: 'CANCELLED', cancellationReason: reasonDetail }, 'SYSTEM')
  next = appendAudit(next, 'SYSTEM', 'Automatically cancelled', reasonDetail)

  let nextRefunds = refundRequests
  let nextAuditLog = globalAuditLog
  if (needsRefund && order.paymentStatus === 'PAID') {
    next = appendHistory({ ...next, status: 'REFUND_PENDING', paymentStatus: 'REFUND_PENDING' }, 'SYSTEM')
    const refund: RefundRequest = {
      id: genId('rfd'), orderId: order.id, orderNo: order.orderNo, customerName: order.customer.name,
      amount: order.priceEstimate, reason: reasonDetail, status: 'PENDING', requestedAt: Date.now(), resolvedAt: null,
    }
    nextRefunds = [refund, ...nextRefunds]
    nextAuditLog = pushGlobalAudit(nextAuditLog, 'system', `Auto-cancelled ${order.orderNo}: opened refund request`, 'Order', order.id)
  } else if (needsRefund) {
    // Cash bookings never captured a real payment — nothing to refund, just
    // confirm no charge was made.
    next = { ...next, paymentStatus: 'UNPAID' }
  }

  return { order: next, refundRequests: nextRefunds, globalAuditLog: nextAuditLog }
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

  const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)]

  return {
    channel: channels[Math.floor(Math.random() * channels.length)],
    pickupId,
    dropoffId,
    scheduledTime: scheduled.toISOString(),
    vehicleType,
    vehicleCategory: DEFAULT_CATEGORY_FOR_TYPE[vehicleType],
    passengers: 1 + Math.floor(Math.random() * 5),
    luggage: Math.floor(Math.random() * 4),
    customer: { name, phone: '+1 555-0100', email: `${name.split(' ')[0].toLowerCase()}@example.com` },
    flightNumber: isAirportTrip ? randomFlightNumber() : '',
    notes: '',
  }
}

function buildAmbientOrder(context: { zoneConditions: ZoneCondition[]; pricingRules: PricingRules; vehicles: Vehicle[]; drivers: Driver[]; categoryPriceOverrides: FleetState['categoryPriceOverrides'] }): Order {
  const order = buildOrderFromInput(randomAmbientInput(), context)
  return fastForwardToConfirmed(order)
}

const seed = createSeedState()
const fleetOsSeed = buildFleetOsSeed(seed.orders, seed.drivers)

// Push the live order-number counter past every "FP-####" the bulk seed data
// already used, so a freshly booked order can never collide with a seeded
// one (see `ensureOrderNoAbove`'s docs in lib/pricing.ts).
const highestSeedOrderNo = seed.orders.reduce((max, o) => {
  const n = Number(o.orderNo.replace('FP-', ''))
  return Number.isFinite(n) && n > max ? n : max
}, 0)
ensureOrderNoAbove(highestSeedOrderNo)

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
  staffAccounts: SEED_STAFF_ACCOUNTS,
  operatingParams: DEFAULT_OPERATING_PARAMS,

  accessLogs: loadStoredAccessLogs(),

  zoneConditions: buildInitialZoneConditions(),
  pricingRules: DEFAULT_PRICING_RULES,
  categoryPriceOverrides: {},

  authSession: { isLoggedIn: false, method: null, displayName: null, email: null },

  createOrder: (input) => {
    const ctx = get()
    let order = buildOrderFromInput(input, { zoneConditions: ctx.zoneConditions, pricingRules: ctx.pricingRules, vehicles: ctx.vehicles, drivers: ctx.drivers, categoryPriceOverrides: ctx.categoryPriceOverrides })

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

    // Wanma-style late-boarding waiting fee: free for the first 15 minutes,
    // then billed in 30-minute blocks at a per-vehicle-category cash rate —
    // captured here (once, at the moment of pickup) so it survives onto the
    // trip-completion receipt without being folded into the app-collected
    // `fareBreakdown`.
    const waitMinutes = order.waitStartedAt ? Math.round((Date.now() - order.waitStartedAt) / 60_000) : 0
    const lateFee = waitMinutes > 0 ? computeWaitingFee(order.vehicleCategory, waitMinutes) : 0

    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== orderId) return o
        let next = appendHistory({ ...o, status: 'PASSENGER_ONBOARD', pickedUpAt: Date.now(), legProgress: 0, waitStartedAt: null, lateFeeAmount: lateFee, lateFeeWaitMinutes: waitMinutes }, 'DRIVER')
        if (lateFee > 0) next = appendAudit(next, 'DRIVER', 'Late-boarding waiting fee charged (cash)', `${waitMinutes} min wait \u00b7 NT$${lateFee.toLocaleString()}`)
        return next
      }),
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

  submitTranslationReview: (orderId, editedNotesZh) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId
          ? appendAudit({ ...o, notes: editedNotesZh, translationStatus: 'CONFIRMED' }, 'DISPATCHER', 'Translation proofread & confirmed', editedNotesZh)
          : o,
      ),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'dispatcher', `Confirmed translation review for ${s.orders.find((o) => o.id === orderId)?.orderNo ?? orderId}`, 'Order', orderId),
    }))
  },

  createManualOrder: (input) => {
    const id = genId('ord')
    const orderNo = nextOrderNo()
    const pickup = getLocation(input.pickupId)
    const dropoff = getLocation(input.dropoffId)
    const routeToDropoff = getCachedRoute(pickup, dropoff) ?? buildRoutePath(pickup, dropoff, `${id}-leg2`)
    const flightInfo = input.flightNumber ? lookupFlight(input.flightNumber, input.scheduledTime) : null
    const durationMin = estimateDurationMin(routeToDropoff.distanceKm)
    const now = Date.now()
    const vehicleCategory = DEFAULT_CATEGORY_FOR_TYPE[input.vehicleType]

    const order: Order = {
      id,
      orderNo,
      channel: input.channel,
      type: input.type,
      status: 'CONFIRMED',
      createdAt: now,
      scheduledTime: input.scheduledTime,
      customer: { name: input.customerName, phone: input.customerPhone, email: '' },
      pickup,
      dropoff,
      vehicleType: input.vehicleType,
      vehicleCategory,
      passengerRequirements: NO_PASSENGER_REQUIREMENTS,
      passengers: input.passengers,
      luggage: 0,
      notes: input.notes,
      flightNumber: input.flightNumber || null,
      flightInfo,
      driverId: null,
      vehicleId: null,
      suggestedDriverId: null,
      priceEstimate: input.quotedPrice,
      fareBreakdown: {
        baseFare: input.quotedPrice, distanceCost: 0, timeCost: 0, demandAdjustment: 0, weatherAdjustment: 0, nightSurcharge: 0,
        holidaySurcharge: 0, airportSurcharge: 0, tollFee: 0, parkingFee: 0, waitingFee: 0, vipSurcharge: 0, stopoverSurcharge: 0, charterHours: null,
        mountainSurcharge: 0, subtotal: input.quotedPrice, discount: 0, couponCode: null, total: input.quotedPrice,
        demandLevel: 'NORMAL', weatherCondition: 'CLEAR', appliedSurchargePct: 0, fairnessCapApplied: false,
        supplierPrice: Math.round(input.quotedPrice * 0.82), platformMargin: Math.round(input.quotedPrice * 0.18),
        explanationKey: null,
      },
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
      quotationVersion: 1,
      quotedAt: now,
      statusHistory: [
        { id: genId('hist'), status: 'CONFIRMED', at: now, actor: 'DISPATCHER' },
      ],
      auditLog: [{ id: genId('aud'), at: now, actor: 'DISPATCHER', action: `Manually entered by ${input.enteredBy}`, detail: `${input.channel} \u00b7 ${input.vehicleType}` }],
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
      pickupInstructions: pickup.isAirport
        ? { terminal: 'Terminal 1', gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${Math.floor(Math.random() * 20) + 1}`, meetAndGreetBoard: `Zhaofeng Travel \u00b7 ${input.customerName}` }
        : null,
      invoiceRequested: false,
      invoiceIssued: false,
      bookingUrgency: 'STANDARD',
      flightLandedAt: null,
      driverInfoRevealOverride: false,
      paymentMethod: 'cash',
      lateFeeAmount: null,
      lateFeeWaitMinutes: null,
      waitingFeeAgreed: false,
      waypoints: [],
      translationStatus: 'NOT_NEEDED',
      sourceLanguage: null,
      originalNoteText: null,
    }

    set((s) => ({
      orders: [order, ...s.orders],
      notifications: pushNotification(s.notifications, 'SUCCESS', 'notif.manualOrderCreated.title', 'notif.manualOrderCreated.message', { orderNo }, order.id),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, input.enteredBy, `Manually opened order ${orderNo} (${input.channel})`, 'Order', order.id),
    }))
    return order
  },

  revealDriverInfoNow: (orderId) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? appendAudit({ ...o, driverInfoRevealOverride: true }, 'SYSTEM', 'Driver contact details revealed early (demo)') : o)),
    })),

  agreeToWaitForLatePassenger: (orderId) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? appendAudit({ ...o, waitingFeeAgreed: true }, 'DRIVER', 'Agreed by phone to keep waiting for a late passenger') : o)),
    })),

  // Demo-only trigger so a tester/e2e script can put an ARRIVED order past
  // the 15-minute free grace period instantly, without waiting on real
  // wall-clock time, to exercise the Wanma-style waiting-fee flow.
  simulateLatePassenger: (orderId) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId && o.status === 'ARRIVED' ? { ...o, waitStartedAt: Date.now() - (WAITING_GRACE_MINUTES + 20) * 60_000 } : o,
      ),
    })),

  // Demo-only trigger (mirrors `toggleDemoNoResponse`) so a tester/e2e script
  // can force the flight-status transitions that drive the last-minute
  // auto-cancel and major-flight-change full-refund rules without waiting
  // on the randomized `driftFlightStatus` simulation.
  simulateFlightEvent: (orderId, kind) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order || !order.flightInfo) return {}
      const now = Date.now()
      if (kind === 'LANDED') {
        return {
          orders: s.orders.map((o) =>
            o.id === orderId && o.flightInfo ? { ...o, flightInfo: { ...o.flightInfo, status: 'LANDED' }, flightLandedAt: now } : o,
          ),
        }
      }
      if (kind === 'DIVERTED') {
        return {
          orders: s.orders.map((o) => (o.id === orderId && o.flightInfo ? { ...o, flightInfo: { ...o.flightInfo, status: 'DIVERTED' } } : o)),
        }
      }
      const delayMinutes = MAJOR_FLIGHT_SHIFT_MINUTES + 15
      return {
        orders: s.orders.map((o) =>
          o.id === orderId && o.flightInfo
            ? { ...o, flightInfo: { ...o.flightInfo, status: 'DELAYED', delayMinutes, estimatedTime: new Date(new Date(o.flightInfo.scheduledTime).getTime() + delayMinutes * 60_000).toISOString() } }
            : o,
        ),
      }
    })
  },

  addOrderWaypoint: (orderId, label) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId ? appendAudit({ ...o, waypoints: [...o.waypoints, { id: genId('wp'), label }] }, 'CUSTOMER', 'Added a stop', label) : o,
      ),
    })),

  removeOrderWaypoint: (orderId, waypointId) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, waypoints: o.waypoints.filter((w) => w.id !== waypointId) } : o)),
    })),

  reportDriverEmergency: (orderId, incidentType, details) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order) return {}

      const originalDriver = s.drivers.find((d) => d.id === order.driverId)
      const currentPos = order.currentPos ?? (originalDriver ? { lat: originalDriver.lat, lng: originalDriver.lng, x: originalDriver.svgX, y: originalDriver.svgY } : { lat: order.pickup.lat, lng: order.pickup.lng, x: order.pickup.svgX, y: order.pickup.svgY })
      const reportedLocation = {
        lat: currentPos.lat,
        lng: currentPos.lng,
        x: currentPos.x,
        y: currentPos.y,
        address: `${order.pickup.name} 往 ${order.dropoff.name} 途中 (事故地點)`,
      }

      const fullIncidentDetails: IncidentDetails = {
        note: details.note || 'Driver reported roadside emergency',
        passengerSafe: details.passengerSafe,
        needsAmbulance: details.needsAmbulance,
        vehicleTowed: details.vehicleTowed,
        reportedLocation,
      }

      const originalDriverId = order.driverId ?? undefined

      let nextOrder: Order = {
        ...order,
        incidentReportedAt: Date.now(),
        incidentType,
        incidentDetails: fullIncidentDetails,
        originalDriverId,
        isEmergencyRescue: true,
        emergencyStatus: 'INCIDENT_REPORTED',
      }

      nextOrder = appendAudit(
        nextOrder,
        'DRIVER',
        `緊急事故回報 (${incidentType})`,
        `司機回報事故：${fullIncidentDetails.note} · 乘客安全：${details.passengerSafe ? '是' : '需關注/就醫'} · 救護車：${details.needsAmbulance ? '需要 (119)' : '不需要'}`,
      )

      const updatedDrivers = s.drivers.map((d) =>
        d.id === originalDriverId
          ? {
              ...d,
              status: 'INCIDENT' as const,
            }
          : d,
      )

      const notifications = pushNotification(
        s.notifications,
        'ERROR',
        'notif.emergencyIncident.title',
        'notif.emergencyIncident.message',
        {
          orderNo: order.orderNo,
          incidentType,
          driverName: originalDriver?.name ?? 'Driver',
          driverNameZh: originalDriver?.nameZh ?? '司機',
        },
        orderId,
      )

      const globalAuditLog = pushGlobalAudit(
        s.globalAuditLog,
        originalDriver ? `${originalDriver.name} (${originalDriver.nameZh})` : 'Driver',
        `回報緊急事件 ${incidentType} (訂單 ${order.orderNo}) - 乘客安全: ${details.passengerSafe ? '安全' : '需協助'}`,
        'Order',
        order.id,
      )

      return {
        orders: s.orders.map((o) => (o.id === orderId ? nextOrder : o)),
        drivers: updatedDrivers,
        notifications,
        globalAuditLog,
        focusOrderId: orderId,
      }
    })
  },

  dispatchRescueDriver: (orderId, replacementDriverId) => {
    const s = get()
    const order = s.orders.find((o) => o.id === orderId)
    const replacementDriver = s.drivers.find((d) => d.id === replacementDriverId)
    if (!order || !replacementDriver || replacementDriver.status !== 'AVAILABLE') return

    const accidentPos = order.currentPos ?? {
      lat: order.incidentDetails?.reportedLocation.lat ?? order.pickup.lat,
      lng: order.incidentDetails?.reportedLocation.lng ?? order.pickup.lng,
      x: order.incidentDetails?.reportedLocation.x ?? order.pickup.svgX,
      y: order.incidentDetails?.reportedLocation.y ?? order.pickup.svgY,
    }

    const accidentLocationRef: LocationRef = {
      id: `${order.id}-accident-spot`,
      name: `Accident Location (${order.pickup.name} -> ${order.dropoff.name})`,
      nameZh: `事故接駁地點 (${order.pickup.nameZh} 往 ${order.dropoff.nameZh})`,
      address: order.incidentDetails?.reportedLocation.address ?? '即時事故救援定位點',
      lat: accidentPos.lat,
      lng: accidentPos.lng,
      svgX: accidentPos.x,
      svgY: accidentPos.y,
      isAirport: false,
    }

    const replacementDriverLoc = driverAsLocation(replacementDriver)
    const routeToAccident =
      getCachedRoute(replacementDriverLoc, accidentLocationRef) ??
      buildRoutePath(replacementDriverLoc, accidentLocationRef, `${order.id}-rescue-leg1-${replacementDriver.id}`)

    const routeFromAccidentToDropoff =
      getCachedRoute(accidentLocationRef, order.dropoff) ??
      buildRoutePath(accidentLocationRef, order.dropoff, `${order.id}-rescue-leg2-${order.dropoff.id}`)

    const attempt: DispatchAttempt = {
      id: genId('dsp'),
      orderId: order.id,
      stage: 1,
      driverId: replacementDriver.id,
      driverName: replacementDriver.name,
      channels: ['IN_APP', 'PHONE_CALL', 'LINE'],
      sentAt: Date.now(),
      respondBy: Date.now() + 15000,
      status: 'AWAITING_RESPONSE',
      resolvedAt: null,
      simulateNoResponse: false,
    }

    let nextOrder: Order = {
      ...order,
      status: 'DRIVER_MATCHING',
      emergencyStatus: 'RESCUE_DISPATCHED',
      rescueDriverId: replacementDriver.id,
      pendingDriverId: replacementDriver.id,
      dispatchAttempts: [...order.dispatchAttempts, attempt],
      routeToPickup: routeToAccident,
      routeToDropoff: routeFromAccidentToDropoff,
      legProgress: 0,
    }

    nextOrder = appendAudit(
      nextOrder,
      'DISPATCHER',
      '指派緊急救援司機 (Rescue Re-dispatch)',
      `已指派救援車輛/司機：${replacementDriver.name} (${replacementDriver.nameZh}) 前往事故地點接駁乘客`,
    )

    const updatedDrivers = s.drivers.map((d) =>
      d.id === replacementDriver.id ? { ...d, status: 'PENDING_RESPONSE' as const } : d,
    )

    const notifications = pushNotification(
      s.notifications,
      'WARNING',
      'notif.rescueDispatched.title',
      'notif.rescueDispatched.message',
      {
        orderNo: order.orderNo,
        driverName: replacementDriver.name,
        driverNameZh: replacementDriver.nameZh,
      },
      orderId,
      ['IN_APP', 'LINE', 'PHONE_CALL'],
      replacementDriver.id,
    )

    const globalAuditLog = pushGlobalAudit(
      s.globalAuditLog,
      'ops.dispatcher',
      `指派救援司機 ${replacementDriver.name} 前往支援訂單 ${order.orderNo}`,
      'Order',
      order.id,
    )

    set({
      orders: s.orders.map((o) => (o.id === orderId ? nextOrder : o)),
      drivers: updatedDrivers,
      notifications,
      globalAuditLog,
    })

    if (routeToAccident.source === 'SYNTHETIC') {
      scheduleRouteHydration(order.id, 'routeToPickup', replacementDriverLoc, accidentLocationRef)
    }
  },

  acceptRescueMission: (orderId, driverId) => {
    const s = get()
    const order = s.orders.find((o) => o.id === orderId)
    const driver = s.drivers.find((d) => d.id === driverId)
    if (!order || !driver) return

    const vehicle = s.vehicles.find((v) => v.id === driver.vehicleId)
    const lastIndex = order.dispatchAttempts.length - 1
    const attempts = order.dispatchAttempts.map((a, i) =>
      i === lastIndex ? { ...a, status: 'ACCEPTED' as const, resolvedAt: Date.now() } : a,
    )

    let nextOrder: Order = {
      ...order,
      status: 'DRIVER_EN_ROUTE',
      emergencyStatus: 'RESCUE_EN_ROUTE',
      driverId: driver.id,
      vehicleId: vehicle?.id ?? null,
      pendingDriverId: null,
      dispatchAttempts: attempts,
      legProgress: 0,
    }

    nextOrder = appendHistory(nextOrder, 'DRIVER')
    nextOrder = appendAudit(
      nextOrder,
      'DRIVER',
      '救援司機已接受任務 (Rescue Accepted)',
      `${driver.name} (${driver.nameZh}) 已接單並即刻驅車前往事故現場接駁`,
    )

    const updatedDrivers = s.drivers.map((d) =>
      d.id === driver.id ? { ...d, status: 'BUSY' as const, stats: bumpStats(d.stats, 'accepted') } : d,
    )

    const notifications = pushNotification(
      s.notifications,
      'SUCCESS',
      'notif.rescueAccepted.title',
      'notif.rescueAccepted.message',
      {
        orderNo: order.orderNo,
        driverName: driver.name,
        driverNameZh: driver.nameZh,
      },
      orderId,
    )

    const globalAuditLog = pushGlobalAudit(
      s.globalAuditLog,
      `${driver.name} (${driver.nameZh})`,
      `接受緊急救援任務 (訂單 ${order.orderNo})`,
      'Order',
      order.id,
    )

    set({
      orders: s.orders.map((o) => (o.id === orderId ? nextOrder : o)),
      drivers: updatedDrivers,
      notifications,
      globalAuditLog,
    })
  },

  resolveEmergencyIncident: (orderId) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order) return {}

      let nextOrder: Order = {
        ...order,
        emergencyStatus: 'RESOLVED',
      }
      nextOrder = appendAudit(nextOrder, 'DISPATCHER', '緊急事故已結案 (Emergency Resolved)', '安全處理流程確認完畢')

      const notifications = pushNotification(
        s.notifications,
        'SUCCESS',
        'notif.emergencyResolved.title',
        'notif.emergencyResolved.message',
        { orderNo: order.orderNo },
        orderId,
      )

      const globalAuditLog = pushGlobalAudit(
        s.globalAuditLog,
        'ops.safety',
        `結案緊急事故紀錄 (訂單 ${order.orderNo})`,
        'Order',
        order.id,
      )

      return {
        orders: s.orders.map((o) => (o.id === orderId ? nextOrder : o)),
        notifications,
        globalAuditLog,
      }
    })
  },

  loginWithLine: () => set({ authSession: { isLoggedIn: true, method: 'LINE' as AuthMethod, displayName: 'LINE User', email: null } }),
  loginWithEmail: (email, displayName) =>
    set({ authSession: { isLoggedIn: true, method: 'EMAIL' as AuthMethod, displayName: displayName ?? email.split('@')[0], email } }),
  logout: () => set({ authSession: { isLoggedIn: false, method: null, displayName: null, email: null } }),

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
  setDriverLoginEnabled: (driverId, v) =>
    set((s) => ({
      drivers: s.drivers.map((d) => (d.id === driverId ? { ...d, loginEnabled: v } : d)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'ops.manager', `${v ? 'Enabled' : 'Disabled'} driver app login`, 'Driver', driverId),
    })),

  addStaffAccount: ({ name, email, role }) =>
    set((s) => {
      const account: StaffAccount = { id: genId('staff'), name, email, role, status: 'ACTIVE', createdAt: new Date().toISOString().slice(0, 10) }
      return {
        staffAccounts: [...s.staffAccounts, account],
        globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'ops.manager', `Created staff account for ${name} (${role})`, 'StaffAccount', account.id),
      }
    }),
  setStaffAccountStatus: (id, status) =>
    set((s) => ({
      staffAccounts: s.staffAccounts.map((a) => (a.id === id ? { ...a, status } : a)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, 'ops.manager', `Set staff account status to ${status}`, 'StaffAccount', id),
    })),

  updateOperatingParams: (patch, actor = 'ops.manager') =>
    set((s) => ({
      operatingParams: { ...s.operatingParams, ...patch },
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, actor, `Updated operating parameters: ${Object.keys(patch).join(', ')}`, 'OperatingParams', 'global'),
    })),

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

    // Simulated Dynamic Pricing Service "live feed" — occasionally nudges one
    // zone's weather/demand by a step so `/fleet-os/pricing/dynamic` and the
    // Customer App's fare breakdown both feel like they're backed by a real
    // (if simulated) API rather than a frozen snapshot.
    const zoneConditions = driftZoneConditions(s.zoneConditions)

    let orders = s.orders
    if (s.ambientOrdersEnabled && liveDemoActiveCount < MAX_ACTIVE_AMBIENT_ORDERS && Math.random() < AMBIENT_ORDER_CHANCE) {
      const withSuggestion = buildAmbientOrder({ zoneConditions, pricingRules: s.pricingRules, vehicles: s.vehicles, drivers: s.drivers, categoryPriceOverrides: s.categoryPriceOverrides })
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

      const isRescue = order.isEmergencyRescue && order.emergencyStatus === 'RESCUE_DISPATCHED'

      // For rescue missions, let the driver UI or explicit acceptance handle it rather than background random auto-accept
      const timedOut = now >= attempt.respondBy
      const shouldAutoAccept = !isRescue && !order.demoForceNoResponse && !timedOut && Math.random() < AUTO_ACCEPT_CHANCE_PER_TICK

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

      if (attempt.stage === 1 && !isRescue) {
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
        // If an emergency is reported and rescue has not yet arrived/dispatched, pause movement
        if (order.incidentReportedAt && order.emergencyStatus === 'INCIDENT_REPORTED') {
          return order
        }
        const step = 1 / order.routeToPickup.durationTicks
        const nextProgress = order.legProgress + step
        if (nextProgress >= 1) {
          const isRescueLeg = order.isEmergencyRescue && order.emergencyStatus === 'RESCUE_EN_ROUTE'
          notifications = pushNotification(
            notifications,
            'SUCCESS',
            isRescueLeg ? 'notif.rescueArrived.title' : 'notif.driverArrived.title',
            isRescueLeg ? 'notif.rescueArrived.message' : 'notif.driverArrived.message',
            { orderNo: order.orderNo },
            order.id,
          )
          const pos = { lat: order.pickup.lat, lng: order.pickup.lng, x: order.pickup.svgX, y: order.pickup.svgY }
          drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
          const nextEmergencyStatus: EmergencyStatus | undefined = isRescueLeg ? 'RESCUE_ARRIVED' : order.emergencyStatus
          return appendHistory(
            { ...order, status: 'ARRIVED', legProgress: 1, currentPos: pos, waitStartedAt: now, emergencyStatus: nextEmergencyStatus },
            'SYSTEM',
          )
        }
        const pos = evaluateRoute(order.routeToPickup, nextProgress)
        drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
        return { ...order, legProgress: nextProgress, currentPos: pos }
      }

      if (order.status === 'PASSENGER_ONBOARD' && order.routeToDropoff) {
        // If an emergency is reported and rescue has not yet picked up, freeze car at incident spot
        if (order.incidentReportedAt && order.emergencyStatus === 'INCIDENT_REPORTED') {
          return order
        }
        const step = 1 / order.routeToDropoff.durationTicks
        const nextProgress = order.legProgress + step
        if (nextProgress >= 1) {
          notifications = pushNotification(notifications, 'SUCCESS', 'notif.tripCompleted.title', 'notif.tripCompleted.message', { orderNo: order.orderNo }, order.id)
          drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, status: 'AVAILABLE' } : d))
          const pos = { lat: order.dropoff.lat, lng: order.dropoff.lng, x: order.dropoff.svgX, y: order.dropoff.svgY }
          return appendHistory({ ...order, status: 'COMPLETED', legProgress: 1, currentPos: pos, emergencyStatus: order.isEmergencyRescue ? 'RESOLVED' : order.emergencyStatus }, 'SYSTEM')
        }
        const pos = evaluateRoute(order.routeToDropoff, nextProgress)
        drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
        return { ...order, legProgress: nextProgress, currentPos: pos }
      }

      if (order.flightInfo && ACTIVE_STATUS_SET.has(order.status) && order.status !== 'PASSENGER_ONBOARD' && Math.random() < 0.06) {
        const drifted = driftFlightStatus(order.flightInfo)
        if (drifted.status !== order.flightInfo.status) {
          notifications = pushNotification(notifications, drifted.status === 'DELAYED' ? 'WARNING' : 'INFO', 'notif.flightUpdated.title', 'notif.flightUpdated.message', { flightNumber: drifted.flightNumber, status: drifted.status.replace('_', ' '), delay: drifted.status === 'DELAYED' ? ` (+${drifted.delayMinutes}m)` : '' }, order.id)
        }
        // Wanma-style flight-aware airport buffer: record the moment the
        // flight first actually lands, which both the last-minute
        // auto-cancel rule below and the driver-facing free-wait/fee
        // escalation window (`lib/serviceRules.ts`) key off of.
        const flightLandedAt = drifted.status === 'LANDED' && !order.flightLandedAt ? now : order.flightLandedAt
        return { ...order, flightInfo: drifted, flightLandedAt }
      }

      return order
    })

    // ---- Airport-Express-style auto-cancel: a LAST_MINUTE, flight-based
    // airport-pickup booking that is still unmatched (never reached
    // DRIVER_EN_ROUTE) once the demo-compressed equivalent of the real
    // 30-minutes-after-landing window has elapsed is cancelled for free and,
    // if it had captured a card payment, automatically refunded. ----
    let refundRequests = s.refundRequests
    let globalAuditLog = s.globalAuditLog
    orders = orders.map((order) => {
      if (order.bookingUrgency !== 'LAST_MINUTE' || order.type !== 'AIRPORT_PICKUP') return order
      if (!order.flightLandedAt || !['CONFIRMED', 'DRIVER_MATCHING'].includes(order.status)) return order
      if (now - order.flightLandedAt < LAST_MINUTE_AUTO_CANCEL_DEMO_MS) return order

      const result = autoCancelWithRefund(
        order,
        'Best-effort last-minute request auto-cancelled: no driver matched within the post-landing window (free of charge)',
        refundRequests,
        globalAuditLog,
      )
      refundRequests = result.refundRequests
      globalAuditLog = result.globalAuditLog
      notifications = pushNotification(notifications, 'ERROR', 'notif.lastMinuteAutoCancelled.title', 'notif.lastMinuteAutoCancelled.message', { orderNo: order.orderNo }, order.id)
      return result.order
    })

    // ---- Wanma-style full-refund-on-major-flight-change: a diversion, or a
    // schedule shift of `MAJOR_FLIGHT_SHIFT_MINUTES`+ from what was booked,
    // triggers an automatic cancellation + full refund for any order that
    // hasn't already picked the passenger up. ----
    orders = orders.map((order) => {
      if (!order.flightInfo || order.status === 'PASSENGER_ONBOARD' || !ACTIVE_STATUS_SET.has(order.status)) return order
      const isDiverted = order.flightInfo.status === 'DIVERTED'
      const isMajorDelay = order.flightInfo.status === 'DELAYED' && order.flightInfo.delayMinutes >= MAJOR_FLIGHT_SHIFT_MINUTES
      if (!isDiverted && !isMajorDelay) return order

      const reason = isDiverted
        ? `Flight ${order.flightInfo.flightNumber} diverted to a different airport — automatically cancelled with a full refund`
        : `Flight ${order.flightInfo.flightNumber} shifted ${order.flightInfo.delayMinutes} min from the booked schedule — automatically cancelled with a full refund`
      const result = autoCancelWithRefund(order, reason, refundRequests, globalAuditLog)
      refundRequests = result.refundRequests
      globalAuditLog = result.globalAuditLog
      if (order.driverId) drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, status: 'AVAILABLE' } : d))
      notifications = pushNotification(
        notifications,
        'ERROR',
        isDiverted ? 'notif.flightDivertedCancelled.title' : 'notif.flightMajorDelayCancelled.title',
        isDiverted ? 'notif.flightDivertedCancelled.message' : 'notif.flightMajorDelayCancelled.message',
        { orderNo: order.orderNo, flightNumber: order.flightInfo.flightNumber },
        order.id,
      )
      return result.order
    })

    // Cash-on-arrival/drop-off (Airport Express's payment option) is only
    // ever *authorized* through the app — it becomes PAID the moment the
    // trip actually completes and cash genuinely changes hands.
    orders = orders.map((order) =>
      order.status === 'COMPLETED' && order.paymentMethod === 'cash' && order.paymentStatus === 'AUTHORIZED' ? { ...order, paymentStatus: 'PAID' } : order,
    )

    set({ orders, drivers, notifications, zoneConditions, refundRequests, globalAuditLog, tickCount: s.tickCount + 1 })
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

  // ---- Dynamic Pricing Service (/fleet-os/pricing/dynamic) — every rule
  // edit is written to the same global audit log used across Fleet OS, per
  // the client brief's "approval and audit log for every rule change." ----
  updatePricingRules: (patch, actor = 'fleet.manager') =>
    set((s) => {
      const changedKeys = Object.keys(patch)
      return {
        pricingRules: { ...s.pricingRules, ...patch },
        globalAuditLog: pushGlobalAudit(s.globalAuditLog, actor, `Updated pricing rule(s): ${changedKeys.join(', ')}`, 'PricingRules', changedKeys.join(',') || 'rules'),
      }
    }),

  setZoneCondition: (region, patch, actor = 'fleet.manager') =>
    set((s) => ({
      zoneConditions: s.zoneConditions.map((z) => (z.region === region ? { ...z, ...patch, updatedAt: Date.now() } : z)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, actor, `Overrode simulated conditions for ${region} (${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ')})`, 'ZoneCondition', region),
    })),

  setCategoryPriceOverride: (category, patch, actor = 'fleet.manager') =>
    set((s) => ({
      categoryPriceOverrides: { ...s.categoryPriceOverrides, [category]: patch },
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, actor, `Updated ${category} pricing: base ${patch.baseFare} / km ${patch.perKmRate} / min ${patch.perMinRate}`, 'VehicleCategory', category),
    })),

  // ---- Fleet & Vehicle Inventory backend (/fleet-os/vehicles) ----
  setVehicleMaintenance: (vehicleId, hours, reason, actor = 'fleet.manager') =>
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.id === vehicleId ? { ...v, maintenanceUntil: hours === null ? null : Date.now() + hours * 3_600_000, maintenanceReason: hours === null ? null : reason } : v)),
      globalAuditLog: pushGlobalAudit(
        s.globalAuditLog, actor, hours === null ? 'Cleared maintenance block' : `Blocked vehicle for maintenance (${hours}h): ${reason}`, 'Vehicle', vehicleId,
      ),
    })),

  setVehicleServiceZone: (vehicleId, zone, actor = 'fleet.manager') =>
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.id === vehicleId ? { ...v, serviceZone: zone } : v)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, actor, `Reassigned service zone to ${zone}`, 'Vehicle', vehicleId),
    })),

  setVehicleCategory: (vehicleId, category, actor = 'fleet.manager') =>
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.id === vehicleId ? { ...v, category, luggageCapacity: VEHICLE_CATEGORY_CATALOG[category].maxLuggage } : v)),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, actor, `Recategorized vehicle as ${category}`, 'Vehicle', vehicleId),
    })),

  toggleVehicleFeature: (vehicleId, feature, actor = 'fleet.manager') =>
    set((s) => ({
      vehicles: s.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, features: v.features.includes(feature) ? v.features.filter((f) => f !== feature) : [...v.features, feature] } : v,
      ),
      globalAuditLog: pushGlobalAudit(s.globalAuditLog, actor, `Toggled feature ${feature}`, 'Vehicle', vehicleId),
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

  recordAccessAttempt: async (authMethod, status, inputIdentifier) => {
    const entry = await createAccessLogEntry(authMethod, status, inputIdentifier)
    set((s) => {
      const updated = [entry, ...s.accessLogs].slice(0, 500)
      saveStoredAccessLogs(updated)
      return { accessLogs: updated }
    })
    return entry
  },

  clearAccessLogs: () => {
    set(() => {
      saveStoredAccessLogs([])
      return { accessLogs: [] }
    })
  },

  addNewDriver: (input, actor = 'fleet.admin') => {
    const driverId = genId('drv')
    const vehicleId = genId('veh')
    const catalogEntry = VEHICLE_CATEGORY_CATALOG[input.vehicleCategory]
    const physicalType = catalogEntry.category.includes('SEDAN')
      ? 'SEDAN'
      : catalogEntry.category.includes('SUV')
        ? 'SUV'
        : catalogEntry.category.includes('MINIBUS')
          ? 'MINIBUS'
          : catalogEntry.isVip
            ? 'LUXURY'
            : 'VAN'

    const newVehicle: Vehicle = {
      id: vehicleId,
      plate: input.vehiclePlate.trim().toUpperCase(),
      type: physicalType,
      category: input.vehicleCategory,
      colorHex: input.colorHex || '#22d3ee',
      capacity: catalogEntry.maxPassengers,
      luggageCapacity: catalogEntry.maxLuggage,
      driverId,
      serviceZone: input.serviceRegion,
      features: catalogEntry.features,
      insuranceStatus: 'VALID',
      complianceStatus: 'OK',
      maintenanceUntil: null,
      maintenanceReason: null,
    }

    const newDriver: Driver = {
      id: driverId,
      name: input.name.trim(),
      nameZh: input.nameZh.trim() || input.name.trim(),
      avatarEmoji: input.avatarEmoji || '👨‍✈️',
      colorHex: input.colorHex || '#22d3ee',
      phone: input.phone.trim(),
      tier: input.tier,
      status: 'AVAILABLE',
      rating: 5.0,
      completedTrips: 0,
      lat: 25.033,
      lng: 121.5654,
      svgX: 180,
      svgY: 120,
      vehicleId,
      documents: {
        license: {
          number: input.licenseNumber || `DL-${Math.floor(100000 + Math.random() * 900000)}`,
          expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
          status: 'VALID',
          ocrStatus: 'VERIFIED',
          lastUpdatedAt: new Date().toISOString(),
        },
        insurance: {
          number: input.insuranceNumber || `INS-${Math.floor(100000 + Math.random() * 900000)}`,
          expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
          status: 'VALID',
          ocrStatus: 'VERIFIED',
          lastUpdatedAt: new Date().toISOString(),
        },
        registration: {
          number: `REG-${newVehicle.plate}`,
          expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
          status: 'VALID',
          ocrStatus: 'VERIFIED',
          lastUpdatedAt: new Date().toISOString(),
        },
        inspection: {
          number: `INSP-${Math.floor(10000 + Math.random() * 90000)}`,
          expiresAt: new Date(Date.now() + 180 * 86400000).toISOString(),
          status: 'VALID',
          ocrStatus: 'VERIFIED',
          lastUpdatedAt: new Date().toISOString(),
        },
      },
      stats: {
        totalAllTime: 0,
        totalToday: 0,
        totalWeek: 0,
        acceptedToday: 0,
        declinedToday: 0,
        missedToday: 0,
        acceptedAllTime: 0,
        declinedAllTime: 0,
        missedAllTime: 0,
      },
      shiftSchedule: buildShiftSchedule(driverId),
      unresponsiveFlagUntil: null,
      unresponsiveOrderNo: null,
      workingMode: 'ANY',
      currentZone: input.serviceRegion,
      autoAcceptEnabled: true,
      airportPreference: true,
      shiftStartedAt: Date.now(),
      loginEnabled: true,
      serviceMinutesToday: 85,
      breakMode: false,
      lastBreakStartedAt: null,
      lastInspectionPassedAt: Date.now(),
      inspectionChecklist: { tires: true, brakes: true, lights: true, dashcam: true },
      walletBalance: 8650,
      instantCashoutHistory: [],
    }

    set((s) => ({
      drivers: [newDriver, ...s.drivers],
      vehicles: [newVehicle, ...s.vehicles],
      globalAuditLog: pushGlobalAudit(
        s.globalAuditLog,
        actor,
        `Added new driver ${newDriver.nameZh} (${newDriver.name}) with vehicle ${newVehicle.plate} (${newVehicle.category})`,
        'Driver',
        newDriver.id,
      ),
      notifications: pushNotification(
        s.notifications,
        'SUCCESS',
        'notif.driverAdded.title',
        'notif.driverAdded.message',
        { driverName: newDriver.nameZh, plate: newVehicle.plate },
      ),
    }))

    return newDriver
  },

  toggleDriverBreakMode: (driverId) =>
    set((s) => ({
      drivers: s.drivers.map((d) => {
        if (d.id !== driverId) return d
        const nextBreak = !d.breakMode
        return {
          ...d,
          breakMode: nextBreak,
          status: nextBreak ? 'BREAK' : 'AVAILABLE',
          lastBreakStartedAt: nextBreak ? Date.now() : null,
        }
      }),
    })),

  submitPreTripInspection: (driverId, checklist) => {
    const allPassed = checklist.tires && checklist.brakes && checklist.lights && checklist.dashcam
    set((s) => ({
      drivers: s.drivers.map((d) =>
        d.id === driverId
          ? {
              ...d,
              lastInspectionPassedAt: allPassed ? Date.now() : d.lastInspectionPassedAt,
              inspectionChecklist: checklist,
              status: allPassed && d.status === 'OFFLINE' ? 'AVAILABLE' : d.status,
            }
          : d,
      ),
    }))
    return allPassed
  },

  requestInstantCashout: (driverId, amount, method) => {
    const fee = method === 'BANK_TRANSFER' ? 15 : 0
    const netReceived = Math.max(0, amount - fee)
    const receipt: InstantCashoutReceipt = {
      id: genId('cashout'),
      timestamp: Date.now(),
      amount,
      method,
      accountMask: method === 'BANK_TRANSFER' ? 'CTBC Bank (822) **** 6789' : 'LINE Pay Money (iPASS) **** 3318',
      fee,
      netReceived,
      status: 'SUCCESS',
      referenceNo: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
    }

    set((s) => {
      const driver = s.drivers.find((d) => d.id === driverId)
      const currentBalance = driver?.walletBalance ?? 12500
      const nextBalance = Math.max(0, currentBalance - amount)

      return {
        drivers: s.drivers.map((d) =>
          d.id === driverId
            ? {
                ...d,
                walletBalance: nextBalance,
                instantCashoutHistory: [receipt, ...(d.instantCashoutHistory ?? [])],
              }
            : d,
        ),
        notifications: pushNotification(
          s.notifications,
          'SUCCESS',
          'notif.cashoutSuccess.title',
          'notif.cashoutSuccess.message',
          { amount: String(amount), net: String(netReceived) },
        ),
      }
    })

    return receipt
  },

  tipAndRateDriver: (orderId, tipAmount, ratingTags, ratingStars = 5) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order) return s

      const driverId = order.driverId
      const updatedOrders = s.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              tipAmount,
              tipTags: ratingTags,
              driverRatingByCustomer: ratingStars,
              fareBreakdown: {
                ...o.fareBreakdown,
                total: o.fareBreakdown.total + tipAmount,
              },
            }
          : o,
      )

      const updatedDrivers = driverId
        ? s.drivers.map((d) =>
            d.id === driverId
              ? {
                  ...d,
                  walletBalance: (d.walletBalance ?? 0) + tipAmount,
                  rating: Math.min(5, (d.rating * d.completedTrips + ratingStars) / (d.completedTrips + 1 || 1)),
                }
              : d,
          )
        : s.drivers

      return {
        orders: updatedOrders,
        drivers: updatedDrivers,
        notifications: pushNotification(
          s.notifications,
          'SUCCESS',
          'notif.tipReceived.title',
          'notif.tipReceived.message',
          { amount: String(tipAmount), orderNo: order.orderNo },
          order.id,
          undefined,
          driverId || undefined,
        ),
      }
    })
  },

  reportLostItem: (orderId, reportInput) => {
    const report: LostItemReport = {
      id: genId('lost'),
      reportedAt: Date.now(),
      ...reportInput,
      status: 'INVESTIGATING',
      driverAcknowledged: true,
    }

    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      return {
        orders: s.orders.map((o) =>
          o.id === orderId
            ? appendAudit(
                { ...o, lostItemReport: report },
                'CUSTOMER',
                'Reported forgotten item in vehicle',
                `${report.itemCategory}: ${report.itemDescription}`,
              )
            : o,
        ),
        globalAuditLog: pushGlobalAudit(
          s.globalAuditLog,
          'customer.portal',
          `Lost & found report filed for order ${order?.orderNo ?? orderId}: ${report.itemCategory}`,
          'Order',
          orderId,
        ),
        notifications: pushNotification(
          s.notifications,
          'WARNING',
          'notif.lostItemReported.title',
          'notif.lostItemReported.message',
          { item: report.itemDescription, orderNo: order?.orderNo ?? orderId },
          orderId,
        ),
      }
    })

    return report
  },

  acknowledgeLostItem: (orderId, dispatcherNotes) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId && o.lostItemReport
          ? {
              ...o,
              lostItemReport: {
                ...o.lostItemReport,
                status: 'FOUND_SAFE',
                dispatcherNotes: dispatcherNotes || 'Driver confirmed item secured in vehicle boot.',
              },
            }
          : o,
      ),
    }))
  },
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
