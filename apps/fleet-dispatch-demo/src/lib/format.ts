export const TICK_MS = 1500

export function formatTWD(amount: number): string {
  return `NT$${Math.round(amount).toLocaleString('en-US')}`
}

export function formatClock(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(ts: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  return `${diffHr}h ago`
}

export function ticksToMinutesLabel(remainingTicks: number): string {
  const seconds = remainingTicks * (TICK_MS / 1000)
  const minutes = Math.max(0, Math.round(seconds / 60))
  if (minutes <= 0) return '<1 min'
  return `${minutes} min`
}

export function nowPlusMinutesISO(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

export function orderTypeLabel(type: string): string {
  switch (type) {
    case 'AIRPORT_PICKUP':
      return 'Airport Pickup · 機場接'
    case 'AIRPORT_DROPOFF':
      return 'Airport Drop-off · 機場送'
    case 'TOUR_CHARTER':
      return 'Tour Charter · 旅遊包車'
    default:
      return type
  }
}

export function orderStatusLabel(status: string): string {
  switch (status) {
    case 'NEW':
      return 'New'
    case 'PENDING_DRIVER_RESPONSE':
      return 'Notifying Driver'
    case 'ASSIGNED':
      return 'Assigned'
    case 'EN_ROUTE_TO_PICKUP':
      return 'Driver En Route'
    case 'ARRIVED_AT_PICKUP':
      return 'Arrived at Pickup'
    case 'PICKED_UP':
      return 'Picked Up'
    case 'IN_TRANSIT':
      return 'In Transit'
    case 'COMPLETED':
      return 'Completed'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

export function notificationChannelLabel(channel: string): string {
  switch (channel) {
    case 'IN_APP':
      return 'In-App Push'
    case 'LINE':
      return 'LINE Message'
    case 'EMAIL':
      return 'Email'
    case 'PHONE_CALL':
      return 'Phone Call'
    default:
      return channel
  }
}

export function countdownLabel(msRemaining: number): string {
  const s = Math.max(0, Math.ceil(msRemaining / 1000))
  return `${s}s`
}

export function driverTierLabel(tier: string): string {
  switch (tier) {
    case 'OWNED_FLEET':
      return 'Owned Fleet'
    case 'PAID_MEMBER':
      return 'Paid Member'
    case 'OUTSIDE_CONTRACTOR':
      return 'Outside Contractor'
    default:
      return tier
  }
}
