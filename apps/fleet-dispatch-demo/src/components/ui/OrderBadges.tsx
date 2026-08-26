import { Plane, PlaneLanding, PlaneTakeoff, MapPinned } from 'lucide-react'
import { Badge } from './Badge'
import type { Driver, FlightStatusKind, Order, OrderStatus } from '../../types'
import { orderStatusLabel, orderTypeLabel, driverTierLabel } from '../../lib/format'
import { flightStatusLabel } from '../../lib/flight'

export function OrderTypeBadge({ type }: { type: Order['type'] }) {
  if (type === 'AIRPORT_PICKUP') {
    return (
      <Badge tone="cyan">
        <PlaneLanding className="h-3 w-3" /> {orderTypeLabel(type)}
      </Badge>
    )
  }
  if (type === 'AIRPORT_DROPOFF') {
    return (
      <Badge tone="purple">
        <PlaneTakeoff className="h-3 w-3" /> {orderTypeLabel(type)}
      </Badge>
    )
  }
  return (
    <Badge tone="lime">
      <MapPinned className="h-3 w-3" /> {orderTypeLabel(type)}
    </Badge>
  )
}

const STATUS_TONE: Record<OrderStatus, 'cyan' | 'purple' | 'pink' | 'amber' | 'lime' | 'slate' | 'red' | 'green'> = {
  NEW: 'amber',
  ASSIGNED: 'cyan',
  EN_ROUTE_TO_PICKUP: 'purple',
  ARRIVED_AT_PICKUP: 'pink',
  PICKED_UP: 'pink',
  IN_TRANSIT: 'purple',
  COMPLETED: 'green',
  CANCELLED: 'red',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const pulse = status === 'EN_ROUTE_TO_PICKUP' || status === 'IN_TRANSIT' || status === 'NEW'
  return (
    <Badge tone={STATUS_TONE[status]} pulse={pulse}>
      {orderStatusLabel(status)}
    </Badge>
  )
}

export function TierBadge({ tier }: { tier: Driver['tier'] }) {
  const tone = tier === 'OWNED_FLEET' ? 'cyan' : tier === 'PAID_MEMBER' ? 'purple' : 'amber'
  return <Badge tone={tone}>{driverTierLabel(tier)}</Badge>
}

const FLIGHT_TONE: Record<FlightStatusKind, 'cyan' | 'red' | 'amber' | 'green'> = {
  ON_TIME: 'green',
  DELAYED: 'red',
  BOARDING: 'amber',
  LANDED: 'cyan',
}

export function FlightBadge({ status }: { status: FlightStatusKind }) {
  return (
    <Badge tone={FLIGHT_TONE[status]} pulse={status === 'DELAYED'}>
      <Plane className="h-3 w-3" /> {flightStatusLabel(status)}
    </Badge>
  )
}
