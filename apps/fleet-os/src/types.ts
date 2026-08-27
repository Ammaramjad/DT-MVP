export type OrderType = 'AIRPORT_PICKUP' | 'AIRPORT_DROPOFF' | 'TOUR_CHARTER' | 'INTERCITY_TRANSFER' | 'HOURLY_CHARTER'

/**
 * Full order-state machine per the client brief — threaded consistently
 * through Customer App / Driver App / Fleet OS. Booking source -> Fleet OS
 * central order -> supplier availability/confirmation -> driver
 * match/notification -> customer live tracking -> pickup -> completion ->
 * payment/voucher/invoice/reporting/audit.
 *
 *   DRAFT -> PENDING_PAYMENT -> PAID -> SUPPLIER_PENDING -> CONFIRMED
 *   -> DRIVER_MATCHING -> ASSIGNED -> DRIVER_EN_ROUTE -> ARRIVED
 *   -> PASSENGER_ONBOARD -> COMPLETED
 *
 * Side branches at any point prior to COMPLETED:
 *   CANCELLATION_REQUESTED -> CANCELLED -> REFUND_PENDING -> REFUNDED
 *   PENDING_PAYMENT -> FAILED (payment failure)
 *   SUPPLIER_PENDING -> FAILED (supplier rejection)
 */
export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'SUPPLIER_PENDING'
  | 'CONFIRMED'
  | 'DRIVER_MATCHING'
  | 'ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'ARRIVED'
  | 'PASSENGER_ONBOARD'
  | 'COMPLETED'
  | 'CANCELLATION_REQUESTED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'FAILED'

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'SUPPLIER_PENDING',
  'CONFIRMED',
  'DRIVER_MATCHING',
  'ASSIGNED',
  'DRIVER_EN_ROUTE',
  'ARRIVED',
  'PASSENGER_ONBOARD',
]

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED']

export type PaymentStatus = 'UNPAID' | 'AUTHORIZED' | 'PAID' | 'REFUND_PENDING' | 'REFUNDED' | 'FAILED'
export type SupplierConfirmStatus = 'NOT_APPLICABLE' | 'PENDING' | 'CONFIRMED' | 'REJECTED'
export type VoucherStatus = 'NOT_ISSUED' | 'ISSUED' | 'REDEEMED' | 'VOID'

export type VehicleType = 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY' | 'MINIBUS'

/**
 * Customer-facing vehicle *service categories* — the client brief's 10-category
 * catalogue used for the vehicle-selection/recommendation UI, dynamic pricing,
 * and dispatch matching. Each category maps onto one of the five physical
 * `VehicleType` groups above (e.g. the 6-seater van, 9-seater van, VIP van and
 * accessible van are all physically `VAN`s) but carries its own capacity,
 * luggage, accessibility, and pricing profile — mirroring how modern
 * ride-hailing "product types" sit on top of a smaller set of physical
 * vehicle classes. See `src/data/vehicleCatalog.ts`.
 */
export type VehicleCategory =
  | 'ECONOMY_SEDAN'
  | 'COMFORT_SEDAN'
  | 'PREMIUM_SEDAN'
  | 'SUV'
  | 'VAN_6'
  | 'VAN_9'
  | 'LUXURY_SEDAN'
  | 'LUXURY_VAN'
  | 'ACCESSIBLE'
  | 'CHARTER_MINIBUS'

/** Fleet-inventory feature flags used both for customer eligibility filtering
 * and the Fleet OS vehicle-inventory module's feature chips. */
export type VehicleFeature = 'CHILD_SEAT' | 'WHEELCHAIR_ACCESS' | 'VIP_INTERIOR' | 'WIFI' | 'MEET_AND_GREET' | 'LARGE_LUGGAGE'

/** Derived (not stored) operational state shown in the Fleet OS vehicle
 * inventory module — see `lib/fleetVehicles.ts#vehicleOperationalStatus`. */
export type VehicleOperationalStatus = 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'OCCUPIED' | 'OFFLINE' | 'MAINTENANCE' | 'DOCUMENT_ISSUE'

/** Demo API simulation — see `lib/dynamicPricing.ts`. In production these would be
 * populated by a real weather API and a real demand/telemetry pipeline. */
export type WeatherCondition = 'CLEAR' | 'RAIN' | 'HEAVY_RAIN' | 'TYPHOON_WARNING'
export type DemandLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'

/** Accessibility/special-assistance requirements captured during booking and
 * carried through to vehicle eligibility filtering + driver matching. */
export interface PassengerRequirements {
  childSeat: boolean
  wheelchair: boolean
  pet: boolean
  specialAssistance: string
}

export type DriverTier = 'OWNED_FLEET' | 'PAID_MEMBER' | 'OUTSIDE_CONTRACTOR'

export type DriverStatus = 'AVAILABLE' | 'PENDING_RESPONSE' | 'BUSY' | 'OFFLINE' | 'BREAK'
export type DriverWorkingMode = 'AIRPORT_PRIORITY' | 'CITY_PRIORITY' | 'ANY'

/** Phase 2 multi-channel driver notification module. */
export type NotificationChannel = 'IN_APP' | 'LINE' | 'EMAIL' | 'PHONE_CALL' | 'SMS'

export type DispatchAttemptStatus = 'AWAITING_RESPONSE' | 'ACCEPTED' | 'DECLINED' | 'TIMED_OUT'

export type DeclineReason = 'TOO_FAR' | 'LOW_FARE' | 'VEHICLE_MISMATCH' | 'OFF_SHIFT' | 'OTHER'

/** One escalation "rung" of the driver-notification ladder for a given order. */
export interface DispatchAttempt {
  id: string
  orderId: string
  stage: 1 | 2
  driverId: string
  driverName: string
  channels: NotificationChannel[]
  sentAt: number
  respondBy: number
  status: DispatchAttemptStatus
  resolvedAt: number | null
  simulateNoResponse: boolean
  declineReason?: DeclineReason | null
}

export interface ShiftDay {
  date: string
  shift: 'DAY' | 'NIGHT' | 'OFF'
  adjusted?: boolean
}

export interface DriverStats {
  totalAllTime: number
  totalToday: number
  totalWeek: number
  acceptedToday: number
  declinedToday: number
  missedToday: number
  acceptedAllTime: number
  declinedAllTime: number
  missedAllTime: number
}

export type BookingChannel = 'Website' | 'LINE@' | 'KKday' | 'Booking.com' | 'Klook' | 'Phone / Agent' | 'ezTravel'

export type FlightStatusKind = 'ON_TIME' | 'DELAYED' | 'BOARDING' | 'LANDED' | 'DIVERTED'

export interface FlightInfo {
  flightNumber: string
  airline: string
  status: FlightStatusKind
  gate: string
  scheduledTime: string
  estimatedTime: string
  delayMinutes: number
}

/**
 * Booking urgency tier — inspired by 機場快綫 Airport Express's "保證有車"
 * (guaranteed vehicle, booked with normal lead time) vs. "24小時內臨時預約"
 * (same-day/last-minute, 15 min-24 hr ahead, explicitly best-effort/NOT
 * guaranteed). See `lib/serviceRules.ts` for the matching windows and the
 * simulated auto-cancel-if-unmatched-within-30-minutes-of-landing rule.
 */
export type BookingUrgency = 'STANDARD' | 'LAST_MINUTE'

/** Simulated payment method at checkout — 'CASH' models the competitor
 * pattern of "pay online by card, or cash on arrival/drop-off." No real
 * payment gateway is ever involved. */
export type PaymentMethodKey = 'card' | 'linepay' | 'applepay' | 'cash'

/** One informal, non-routed waypoint a customer can add to a booking —
 * modeled on 機場快綫's "multi-stop pickup/drop-off support" and 萬馬接送's
 * "~5 minutes per intermediate stop" policy. Kept fare-neutral (advertised
 * as a free perk) and purely informational for the map/route simulation. */
export interface TripWaypoint {
  id: string
  label: string
}

export type TaiwanRegion =
  | 'TAIPEI'
  | 'NEW_TAIPEI'
  | 'TAOYUAN'
  | 'HSINCHU'
  | 'TAICHUNG'
  | 'TAINAN'
  | 'KAOHSIUNG'
  | 'HUALIEN'
  | 'TAITUNG'
  | 'NANTOU'

export interface LocationRef {
  id: string
  name: string
  nameZh: string
  address: string
  lat: number
  lng: number
  svgX: number
  svgY: number
  isAirport: boolean
  region?: TaiwanRegion
}

export type DocumentKind = 'license' | 'insurance' | 'registration' | 'inspection'
export type OcrReviewStatus = 'PENDING' | 'VERIFIED' | 'FLAGGED'

export interface DocumentRecord {
  number: string
  expiresAt: string
  status: 'VALID' | 'EXPIRING' | 'EXPIRED'
  ocrStatus: OcrReviewStatus
  lastUpdatedAt: string
}

export interface Driver {
  id: string
  name: string
  nameZh: string
  avatarEmoji: string
  colorHex: string
  phone: string
  tier: DriverTier
  status: DriverStatus
  rating: number
  completedTrips: number
  lat: number
  lng: number
  svgX: number
  svgY: number
  vehicleId: string
  documents: Record<DocumentKind, DocumentRecord>
  stats: DriverStats
  shiftSchedule: ShiftDay[]
  unresponsiveFlagUntil: number | null
  unresponsiveOrderNo: string | null
  workingMode: DriverWorkingMode
  currentZone: string
  autoAcceptEnabled: boolean
  airportPreference: boolean
  shiftStartedAt: number | null
  /** 帳號管理 (Account Management) "可機帳號" tab — whether this driver's app
   * login is currently enabled. Disabling mirrors the reference site's
   * staff-account 停用/啟用 toggle applied to the driver side. */
  loginEnabled: boolean
}

export interface Vehicle {
  id: string
  plate: string
  type: VehicleType
  category: VehicleCategory
  colorHex: string
  capacity: number
  luggageCapacity: number
  driverId: string
  serviceZone: TaiwanRegion
  features: VehicleFeature[]
  insuranceStatus: 'VALID' | 'EXPIRING' | 'EXPIRED'
  complianceStatus: 'OK' | 'FLAGGED'
  /** Fleet Manager "maintenance block" — while set (epoch ms in the future),
   * this vehicle must never be offered to customers or the dispatch engine. */
  maintenanceUntil: number | null
  maintenanceReason: string | null
}

export interface RoutePoint {
  lat: number
  lng: number
  x: number
  y: number
}

/** Where a route's polyline came from — surfaced in the UI so the dynamic
 * OSRM routing integration (and its offline fallback) can be verified live. */
export type RouteSource = 'OSRM' | 'SYNTHETIC'

export interface RoutePath {
  points: RoutePoint[]
  distanceKm: number
  durationTicks: number
  source: RouteSource
}

/** Itemized fare breakdown shown to the customer at quotation/booking time
 * (Phase 1 depth item: "visible fare breakdown with named surcharges").
 * Extended for Phase 3's simulated dynamic-pricing engine — every additional
 * line item here is always shown to the customer before checkout (never a
 * hidden fee), per the client brief's transparency requirement. */
export interface FareBreakdown {
  baseFare: number
  distanceCost: number
  timeCost: number
  demandAdjustment: number
  weatherAdjustment: number
  nightSurcharge: number
  holidaySurcharge: number
  airportSurcharge: number
  tollFee: number
  parkingFee: number
  waitingFee: number
  vipSurcharge: number
  /** Hourly Charter (計時包車) line items — see 萬馬接送's product rules.
   * `charterHours` is null for ordinary point-to-point trips. */
  charterHours: number | null
  mountainSurcharge: number
  subtotal: number
  discount: number
  couponCode: string | null
  total: number

  /** Dynamic-pricing context captured at quotation time so the customer-facing
   * "calm explanation" and the Fleet OS Dynamic Pricing module can both render
   * a consistent story for this exact fare. */
  demandLevel: DemandLevel
  weatherCondition: WeatherCondition
  appliedSurchargePct: number
  fairnessCapApplied: boolean
  /** Internal-only (Fleet OS): what the supplier/driver side nets vs. the
   * platform's margin on this fare — never shown to the customer. */
  supplierPrice: number
  platformMargin: number
  explanationKey: string | null
  explanationParams?: Record<string, string | number>
}

/** One zone's live simulated conditions — "Demo API simulation" per the
 * client brief. Real Weather/Maps/fleet-GPS/supplier-availability APIs would
 * replace this feed without changing any downstream consumer. */
export interface ZoneCondition {
  region: TaiwanRegion
  weather: WeatherCondition
  demand: DemandLevel
  updatedAt: number
}

/** Fleet-Manager-configurable dynamic pricing rules, edited from
 * `/fleet-os/pricing/dynamic` with every change written to an audit log. */
export interface PricingRules {
  maxSurgeMultiplierPct: number
  weatherSurchargePct: Record<WeatherCondition, number>
  demandSurchargePct: Record<DemandLevel, number>
  minAvailableVehiclesBeforeSurge: number
  lowAvailabilitySurchargePct: number
  vipSurchargePct: number
  nightSurchargePct: number
  nightStartHour: number
  nightEndHour: number
  holidaySurchargePct: number
  zoneSurcharges: Record<TaiwanRegion, number>
  roundingIncrement: number
  transparencyMessage: string
  transparencyMessageZh: string
}

export type StatusActor = 'SYSTEM' | 'DISPATCHER' | 'DRIVER' | 'CUSTOMER' | 'SUPPLIER' | 'PAYMENT'

/** One entry in an order's full amendment/status audit trail, rendered as a
 * timeline in Fleet OS (Phase 1 depth item: audit trail). */
export interface StatusHistoryEntry {
  id: string
  status: OrderStatus
  at: number
  actor: StatusActor
}

/** Broader operational audit trail beyond pure status transitions — payment
 * captures, voucher issuance, supplier confirmations, refund approvals,
 * support notes — shown on the Fleet OS order-detail audit log. */
export interface AuditEntry {
  id: string
  at: number
  actor: StatusActor
  action: string
  detail?: string
}

export interface CustomerInfo {
  name: string
  phone: string
  email: string
}

export interface Order {
  id: string
  orderNo: string
  channel: BookingChannel
  type: OrderType
  status: OrderStatus
  createdAt: number
  scheduledTime: string
  customer: CustomerInfo
  pickup: LocationRef
  dropoff: LocationRef
  vehicleType: VehicleType
  vehicleCategory: VehicleCategory
  passengerRequirements: PassengerRequirements
  passengers: number
  luggage: number
  notes: string
  flightNumber: string | null
  flightInfo: FlightInfo | null
  driverId: string | null
  vehicleId: string | null
  suggestedDriverId: string | null
  priceEstimate: number
  fareBreakdown: FareBreakdown
  distanceKm: number
  durationMin: number
  routeToPickup: RoutePath | null
  routeToDropoff: RoutePath | null
  legProgress: number
  currentPos: { lat: number; lng: number; x: number; y: number } | null
  pickedUpAt: number | null

  /** Multi-channel notification + escalation ladder audit trail (Phase 2). */
  pendingDriverId: string | null
  dispatchAttempts: DispatchAttempt[]
  escalationStage: 0 | 1 | 2
  unresponsiveDriverIds: string[]
  demoForceNoResponse: boolean

  /** Quotation versioning + full status audit trail (Phase 1 depth items). */
  quotationVersion: number
  quotedAt: number
  statusHistory: StatusHistoryEntry[]
  auditLog: AuditEntry[]

  /** Order-detail depth items: payment/supplier/voucher status, PIN, ratings. */
  paymentStatus: PaymentStatus
  supplierStatus: SupplierConfirmStatus
  voucherStatus: VoucherStatus
  pickupPin: string
  cancellationReason: string | null
  refundAmount: number | null
  supportTicketId: string | null
  driverRatingByCustomer: number | null
  customerRatingByDriver: number | null
  tollParkingEvidenceUploaded: boolean
  noShowReported: boolean
  waitStartedAt: number | null
  pickupInstructions: {
    terminal: string
    gate: string
    meetAndGreetBoard: string
  } | null
  invoiceRequested: boolean
  invoiceIssued: boolean

  /** Booking urgency tier — see `BookingUrgency`. */
  bookingUrgency: BookingUrgency
  /** Epoch ms when the linked flight's status first became `LANDED` — used
   * to drive the last-minute 30-minute auto-cancel-if-unmatched rule and
   * the flight-aware airport-ready-buffer/waiting-fee escalation. */
  flightLandedAt: number | null
  /** Demo-only override so a tester/e2e script can force the driver-info
   * reveal without waiting for the real time window — mirrors the existing
   * `demoForceNoResponse` convention. */
  driverInfoRevealOverride: boolean
  /** Simulated payment method chosen at checkout. */
  paymentMethod: PaymentMethodKey
  /** Cash-collected late-boarding/no-show waiting fee (Wanma-style, paid to
   * the driver in cash, per-30-minute block after a 15-minute grace period)
   * — set once at pickup verification, never bundled into `fareBreakdown`
   * since it is never captured through the app. */
  lateFeeAmount: number | null
  lateFeeWaitMinutes: number | null
  /** Set by the driver over the phone once a late passenger is confirmed to
   * still be coming — mirrors 萬馬接送's "driver agrees by phone to wait." */
  waitingFeeAgreed: boolean
  /** Informal multi-stop support (client trust signal: "completely free ...
   * multi-stop pickup/drop-off support"). */
  waypoints: TripWaypoint[]

  /** 翻譯校對 (Translation Proofreading) — mirrors the reference Fleet OS's
   * queue for orders that arrive from a foreign-language channel (Klook/
   * KKday/ezTravel/Booking.com/LINE OA) with a foreign customer. `notes`
   * holds the AI-pretranslated (demo-simulated) Traditional Chinese working
   * copy that ops can edit; `originalNoteText`/`sourceLanguage` hold the
   * original-language source text for side-by-side proofing. See
   * `lib/translation.ts` and `/fleet-os/translation-qa`. */
  translationStatus: TranslationStatus
  sourceLanguage: SourceLanguage | null
  originalNoteText: string | null
}

export type TranslationStatus = 'NOT_NEEDED' | 'PENDING' | 'CONFIRMED'
export type SourceLanguage = 'EN' | 'JA' | 'KO'

export interface BookingInput {
  channel: BookingChannel
  pickupId: string
  dropoffId: string
  scheduledTime: string
  vehicleType: VehicleType
  vehicleCategory: VehicleCategory
  passengers: number
  luggage: number
  customer: CustomerInfo
  flightNumber: string
  notes: string
  couponCode?: string | null
  quotationVersion?: number
  passengerRequirements?: PassengerRequirements
  /** @deprecated use `passengerRequirements.childSeat` — kept so any older
   * call site that only sets these two booleans keeps compiling. */
  childSeat?: boolean
  /** @deprecated use `passengerRequirements.wheelchair` */
  wheelchair?: boolean
  invoiceRequested?: boolean
  bookingUrgency?: BookingUrgency
  paymentMethod?: PaymentMethodKey
  waypoints?: TripWaypoint[]
  /** Hourly Charter (計時包車) inputs — see `lib/dynamicPricing.ts`. */
  charterHours?: number | null
  mountainRoute?: boolean
}

export type NotificationKind = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'

/** Notifications carry i18n keys + interpolation params (rather than
 * pre-rendered text) so the same live feed renders correctly in whichever
 * language is currently active, including for older entries. */
export interface AppNotification {
  id: string
  timestamp: number
  kind: NotificationKind
  titleKey: string
  messageKey: string
  params?: Record<string, string | number>
  orderId?: string
  channels?: NotificationChannel[]
  driverId?: string
}

/** A completed/cancelled trip recorded against a customer for booking-frequency analytics. */
export interface CustomerHistoryEntry {
  id: string
  pickupName: string
  dropoffName: string
  type: OrderType
  scheduledTime: string
  status: 'COMPLETED' | 'CANCELLED'
  priceEstimate: number
}

export interface SavedPassenger {
  id: string
  name: string
  phone: string
  relationship: string
  isEmergencyContact: boolean
}

export interface PaymentToken {
  id: string
  brand: 'Visa' | 'Mastercard' | 'JCB' | 'LINE Pay' | 'Apple Pay'
  last4: string
  expiry: string
  isDefault: boolean
}

export interface NotificationPreference {
  email: boolean
  line: boolean
  sms: boolean
}

export interface PrivacyRequest {
  id: string
  kind: 'DATA_DOWNLOAD' | 'DELETE_ACCOUNT'
  status: 'PENDING' | 'COMPLETED'
  requestedAt: number
}

export interface CustomerProfile {
  id: string
  name: string
  phone: string
  email: string
  memberSince: string
  historicalOrders: CustomerHistoryEntry[]
  savedPassengers: SavedPassenger[]
  paymentMethods: PaymentToken[]
  notificationPreference: NotificationPreference
  privacyRequests: PrivacyRequest[]
  memberTier: 'SILVER' | 'GOLD' | 'PLATINUM'
  memberPoints: number
  consentMarketing: boolean
}

export interface CapacityDay {
  date: string
  orderCount: number
  scheduledDrivers: number
  onLeave: number
  isPeak: boolean
  isToday: boolean
  isPast: boolean
}

// ---------------------------------------------------------------------------
// Fleet OS modules: Suppliers / Catalog / Campaigns / Support / Refunds /
// Finance / Roles / System Health / Privacy Audit
// ---------------------------------------------------------------------------

export type SupplierStatus = 'ACTIVE' | 'PAUSED' | 'SUSPENDED'

export interface Supplier {
  id: string
  name: string
  nameZh: string
  channel: BookingChannel
  status: SupplierStatus
  commissionPct: number
  avgConfirmMinutes: number
  activeOrders: number
  rating: number
  contactEmail: string
  productsListed: number
}

export type CampaignStatus = 'ACTIVE' | 'SCHEDULED' | 'ENDED' | 'PAUSED'

export interface Campaign {
  id: string
  code: string
  name: string
  nameZh: string
  kind: 'PERCENT' | 'FIXED'
  value: number
  startsAt: string
  endsAt: string
  usageLimit: number
  perUserLimit: number
  usedCount: number
  status: CampaignStatus
  eligibility: string
}

export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface SupportMessage {
  id: string
  from: 'CUSTOMER' | 'AGENT'
  text: string
  at: number
}

export interface SupportTicket {
  id: string
  ticketNo: string
  orderId: string | null
  orderNo: string | null
  customerName: string
  subject: string
  category: string
  status: SupportTicketStatus
  priority: SupportTicketPriority
  createdAt: number
  updatedAt: number
  messages: SupportMessage[]
}

export type RefundRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED'

export interface RefundRequest {
  id: string
  orderId: string
  orderNo: string
  customerName: string
  amount: number
  reason: string
  status: RefundRequestStatus
  requestedAt: number
  resolvedAt: number | null
}

export interface Role {
  id: string
  name: string
  nameZh: string
  permissions: string[]
  userCount: number
  twoFactorRequired: boolean
}

export type SystemHealthStatus = 'OPERATIONAL' | 'DEGRADED' | 'DOWN'

export interface SystemHealthMetric {
  id: string
  name: string
  status: SystemHealthStatus
  latencyMs: number
  uptimePct: number
  lastIncident: string | null
  acknowledged: boolean
}

export interface CatalogProduct {
  id: string
  name: string
  nameZh: string
  routeLabel: string
  vehicleType: VehicleType
  basePrice: number
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
  inventory: number
  region: TaiwanRegion
}

export type MarketplaceSource = 'Direct' | 'Klook' | 'KKday' | 'ezTravel' | 'Booking.com'
export type MarketplaceCategory = 'AIRPORT_PICKUP' | 'AIRPORT_DROPOFF' | 'HOURLY_CHARTER' | 'INTERCITY_TRANSFER' | 'ATTRACTION_ROUTE'

export interface MarketplaceListing {
  id: string
  source: MarketplaceSource
  category: MarketplaceCategory
  title: string
  titleZh: string
  fromLocationId: string
  toLocationId: string
  vehicleType: VehicleType
  price: number
  rating: number
  reviewCount: number
  cancellationPolicy: 'FREE_24H' | 'FREE_48H' | 'NON_REFUNDABLE'
  durationMin: number
  languages: string[]
  capacity: number
  inclusions: string[]
  exclusions: string[]
}

export interface PayoutRecord {
  id: string
  driverId: string
  driverName: string
  period: string
  grossAmount: number
  commission: number
  netAmount: number
  status: 'PENDING' | 'PROCESSING' | 'PAID'
  method: string
}

export interface AuditLogEntry {
  id: string
  at: number
  actor: string
  action: string
  targetType: string
  targetId: string
}

// ---------------------------------------------------------------------------
// 帳號管理 (Account Management) & 營運參數 (Operating Parameters) — the
// reference site's two "系統" (System) sidebar modules, distinct from the
// existing role/permission matrix in Fleet OS Admin: this is a concrete list
// of individually-managed dispatcher/support-staff login accounts, and a
// single centralized set of scheduling/flight-board operating parameters.
// ---------------------------------------------------------------------------
export type StaffRole = 'ADMIN' | 'SUPPORT'
export type StaffAccountStatus = 'ACTIVE' | 'DISABLED'

export interface StaffAccount {
  id: string
  name: string
  email: string
  role: StaffRole
  status: StaffAccountStatus
  createdAt: string
}

/** Input shape for the reference site's 手動開單 (Manual Order Entry) screen
 * — a dispatcher/counter-staff form for phone or walk-in bookings. Unlike
 * `BookingInput` (customer self-serve checkout), this always creates the
 * order already `CONFIRMED` with a manually-quoted price, since a phone
 * order is confirmed the moment staff key it in. */
export interface ManualOrderInput {
  type: 'AIRPORT_PICKUP' | 'AIRPORT_DROPOFF' | 'TOUR_CHARTER'
  channel: BookingChannel
  flightNumber: string
  customerName: string
  customerPhone: string
  passengers: number
  scheduledTime: string
  pickupId: string
  dropoffId: string
  vehicleType: VehicleType
  quotedPrice: number
  notes: string
  enteredBy: string
}

export interface OperatingParams {
  /** Day-shift window (24h clock hours). Everything outside this window is
   * treated as the night shift for scheduling purposes. */
  dayShiftStartHour: number
  dayShiftEndHour: number
  /** How many days ahead of a given date the night/day shift roster must be
   * auto-generated and published by. */
  nightShiftPublishAheadDays: number
  dayShiftPublishAheadDays: number
  /** How many days into the future a driver may request/adjust leave or a
   * preferred shift via the Driver App. */
  driverPlanningWindowDays: number
  /** How often the Flight Board auto-refreshes flight status (minutes). */
  flightBoardRefreshMinutes: number
}

// ---------------------------------------------------------------------------
// Lightweight, fully-simulated account access (LINE quick login, email
// login/registration) — no real backend/session; see `AccountAccessModal`.
// ---------------------------------------------------------------------------
export type AuthMethod = 'LINE' | 'EMAIL'

export interface AuthSession {
  isLoggedIn: boolean
  method: AuthMethod | null
  displayName: string | null
  email: string | null
}
