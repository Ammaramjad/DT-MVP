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

export type FlightStatusKind = 'ON_TIME' | 'DELAYED' | 'BOARDING' | 'LANDED'

export interface FlightInfo {
  flightNumber: string
  airline: string
  status: FlightStatusKind
  gate: string
  scheduledTime: string
  estimatedTime: string
  delayMinutes: number
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
}

export interface Vehicle {
  id: string
  plate: string
  type: VehicleType
  colorHex: string
  capacity: number
  driverId: string
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
 * (Phase 1 depth item: "visible fare breakdown with named surcharges"). */
export interface FareBreakdown {
  baseFare: number
  distanceCost: number
  timeCost: number
  airportSurcharge: number
  waitingFee: number
  subtotal: number
  discount: number
  couponCode: string | null
  total: number
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
}

export interface BookingInput {
  channel: BookingChannel
  pickupId: string
  dropoffId: string
  scheduledTime: string
  vehicleType: VehicleType
  passengers: number
  luggage: number
  customer: CustomerInfo
  flightNumber: string
  notes: string
  couponCode?: string | null
  quotationVersion?: number
  childSeat?: boolean
  wheelchair?: boolean
  invoiceRequested?: boolean
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
