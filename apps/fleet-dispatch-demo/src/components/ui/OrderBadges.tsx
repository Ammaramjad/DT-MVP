import { Plane, PlaneLanding, PlaneTakeoff, MapPinned, Bell, MessageCircle, Mail, PhoneCall } from 'lucide-react'
import { Badge } from './Badge'
import type { Driver, FlightStatusKind, NotificationChannel, Order, OrderStatus } from '../../types'
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
  NEW: 'amber',
  PENDING_DRIVER_RESPONSE: 'pink',
  ASSIGNED: 'cyan',
  EN_ROUTE_TO_PICKUP: 'purple',
  ARRIVED_AT_PICKUP: 'pink',
  PICKED_UP: 'pink',
  IN_TRANSIT: 'purple',
  COMPLETED: 'green',
  CANCELLED: 'red',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { lang } = useLang()
  const pulse = status === 'EN_ROUTE_TO_PICKUP' || status === 'IN_TRANSIT' || status === 'NEW' || status === 'PENDING_DRIVER_RESPONSE'
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
}

const CHANNEL_TONE: Record<NotificationChannel, 'cyan' | 'green' | 'purple' | 'amber'> = {
  IN_APP: 'cyan',
  LINE: 'green',
  EMAIL: 'purple',
  PHONE_CALL: 'amber',
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
}

export function FlightBadge({ status }: { status: FlightStatusKind }) {
  const { lang } = useLang()
  return (
    <Badge tone={FLIGHT_TONE[status]} pulse={status === 'DELAYED'}>
      <Plane className="h-3 w-3" /> {flightStatusLabel(status, lang)}
    </Badge>
  )
}
