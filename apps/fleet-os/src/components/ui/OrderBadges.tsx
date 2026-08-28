import { Plane, PlaneLanding, PlaneTakeoff, MapPinned, Bell, MessageCircle, Mail, PhoneCall, Globe2, ShieldCheck, Zap } from 'lucide-react'
import { Badge } from './Badge'
import type { BookingChannel, BookingUrgency, Driver, FlightStatusKind, NotificationChannel, Order, OrderStatus } from '../../types'
import { orderStatusLabel, orderTypeLabel, driverTierLabel, notificationChannelLabel } from '../../lib/format'
import { flightStatusLabel } from '../../lib/flight'
import { useLang } from '../../i18n'

export function OrderTypeBadge({ type }: { type: Order['type'] }) {
  const { lang } = useLang()
  if (type === 'AIRPORT_PICKUP') {
    return (
      <Badge tone="cyan">
        <PlaneLanding className="h-3 w-3" /> {orderTypeLabel(type, lang)}
      </Badge>
    )
  }
  if (type === 'AIRPORT_DROPOFF') {
    return (
      <Badge tone="purple">
        <PlaneTakeoff className="h-3 w-3" /> {orderTypeLabel(type, lang)}
      </Badge>
    )
  }
  return (
    <Badge tone="lime">
      <MapPinned className="h-3 w-3" /> {orderTypeLabel(type, lang)}
    </Badge>
  )
}

const STATUS_TONE: Record<OrderStatus, 'cyan' | 'purple' | 'pink' | 'amber' | 'lime' | 'slate' | 'red' | 'green'> = {
  DRAFT: 'slate',
  PENDING_PAYMENT: 'amber',
  PAID: 'lime',
  SUPPLIER_PENDING: 'amber',
  CONFIRMED: 'cyan',
  DRIVER_MATCHING: 'pink',
  ASSIGNED: 'cyan',
  DRIVER_EN_ROUTE: 'purple',
  ARRIVED: 'pink',
  PASSENGER_ONBOARD: 'purple',
  COMPLETED: 'green',
  CANCELLATION_REQUESTED: 'amber',
  CANCELLED: 'red',
  REFUND_PENDING: 'amber',
  REFUNDED: 'slate',
  FAILED: 'red',
}

const PULSE_STATUSES = new Set<OrderStatus>(['DRIVER_EN_ROUTE', 'PASSENGER_ONBOARD', 'DRIVER_MATCHING', 'CONFIRMED', 'SUPPLIER_PENDING', 'CANCELLATION_REQUESTED', 'REFUND_PENDING'])

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { lang } = useLang()
  const pulse = PULSE_STATUSES.has(status)
  return (
    <Badge tone={STATUS_TONE[status]} pulse={pulse}>
      {orderStatusLabel(status, lang)}
    </Badge>
  )
}

const CHANNEL_ICON: Record<NotificationChannel, typeof Bell> = {
  IN_APP: Bell,
  LINE: MessageCircle,
  EMAIL: Mail,
  PHONE_CALL: PhoneCall,
  SMS: MessageCircle,
}

const CHANNEL_TONE: Record<NotificationChannel, 'cyan' | 'green' | 'purple' | 'amber'> = {
  IN_APP: 'cyan',
  LINE: 'green',
  EMAIL: 'purple',
  PHONE_CALL: 'amber',
  SMS: 'green',
}

export function ChannelBadge({ channel, compact = false }: { channel: NotificationChannel; compact?: boolean }) {
  const { lang } = useLang()
  const Icon = CHANNEL_ICON[channel]
  return (
    <Badge tone={CHANNEL_TONE[channel]} className={compact ? 'px-1.5 py-0.5' : undefined}>
      <Icon className="h-3 w-3" /> {compact ? null : notificationChannelLabel(channel, lang)}
    </Badge>
  )
}

export function TierBadge({ tier }: { tier: Driver['tier'] }) {
  const { lang } = useLang()
  const tone = tier === 'OWNED_FLEET' ? 'cyan' : tier === 'PAID_MEMBER' ? 'purple' : 'amber'
  return <Badge tone={tone}>{driverTierLabel(tier, lang)}</Badge>
}

const FLIGHT_TONE: Record<FlightStatusKind, 'cyan' | 'red' | 'amber' | 'green'> = {
  ON_TIME: 'green',
  DELAYED: 'red',
  BOARDING: 'amber',
  LANDED: 'cyan',
  DIVERTED: 'red',
}

export function FlightBadge({ status }: { status: FlightStatusKind }) {
  const { lang } = useLang()
  return (
    <Badge tone={FLIGHT_TONE[status]} pulse={status === 'DELAYED' || status === 'DIVERTED'}>
      <Plane className="h-3 w-3" /> {flightStatusLabel(status, lang)}
    </Badge>
  )
}

const SOURCE_TONE: Record<BookingChannel, 'cyan' | 'red' | 'amber' | 'green' | 'purple' | 'slate'> = {
  Website: 'cyan',
  'LINE@': 'green',
  KKday: 'amber',
  'Booking.com': 'purple',
  Klook: 'red',
  'Phone / Agent': 'slate',
  ezTravel: 'amber',
}

/** Booking-source badge — surfaces which channel an order originated from
 * (Direct B2C / Klook / KKday / Booking.com / LINE OA / manual operator)
 * on Driver-App trip offers and Fleet OS order cards. */
export function SourceBadge({ channel }: { channel: BookingChannel }) {
  return (
    <Badge tone={SOURCE_TONE[channel] ?? 'slate'}>
      <Globe2 className="h-3 w-3" /> {channel}
    </Badge>
  )
}

/** 機場快綫-style booking-urgency badge — "保證有車" guaranteed vs. the
 * best-effort/NOT-guaranteed last-minute tier — surfaced on every order card
 * that shows a trip so the distinction stays visible past the booking flow. */
export function UrgencyBadge({ urgency }: { urgency: BookingUrgency }) {
  const { t } = useLang()
  if (urgency === 'STANDARD') {
    return (
      <Badge tone="green">
        <ShieldCheck className="h-3 w-3" /> {t('booking.urgencyStandardShort')}
      </Badge>
    )
  }
  return (
    <Badge tone="amber" pulse>
      <Zap className="h-3 w-3" /> {t('booking.urgencyLastMinuteShort')}
    </Badge>
  )
}
