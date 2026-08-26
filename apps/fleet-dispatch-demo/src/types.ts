export type OrderType = 'AIRPORT_PICKUP' | 'AIRPORT_DROPOFF' | 'TOUR_CHARTER'

export type OrderStatus =
  | 'NEW'
  | 'PENDING_DRIVER_RESPONSE'
  | 'ASSIGNED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED_AT_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED'

export type VehicleType = 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY' | 'MINIBUS'

export type DriverTier = 'OWNED_FLEET' | 'PAID_MEMBER' | 'OUTSIDE_CONTRACTOR'

export type DriverStatus = 'AVAILABLE' | 'PENDING_RESPONSE' | 'BUSY' | 'OFFLINE'

/** Phase 2 multi-channel driver notification module. */
export type NotificationChannel = 'IN_APP' | 'LINE' | 'EMAIL' | 'PHONE_CALL'

export type DispatchAttemptStatus = 'AWAITING_RESPONSE' | 'ACCEPTED' | 'DECLINED' | 'TIMED_OUT'

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

export type BookingChannel = 'Website' | 'LINE@' | 'KKday' | 'Booking.com' | 'Klook' | 'Phone / Agent'

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
}

export interface DocumentRecord {
  number: string
  expiresAt: string
  status: 'VALID' | 'EXPIRING' | 'EXPIRED'
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
  documents: {
    license: DocumentRecord
    insurance: DocumentRecord
  }
  stats: DriverStats
  shiftSchedule: ShiftDay[]
  unresponsiveFlagUntil: number | null
  unresponsiveOrderNo: string | null
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

export interface RoutePath {
  points: RoutePoint[]
  distanceKm: number
  durationTicks: number
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
}

export type NotificationKind = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'

export interface AppNotification {
  id: string
  timestamp: number
  kind: NotificationKind
  title: string
  message: string
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

export interface CustomerProfile {
  id: string
  name: string
  phone: string
  email: string
  memberSince: string
  historicalOrders: CustomerHistoryEntry[]
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
