import type { Driver, Order } from '../types'

export interface ConflictCheckResult {
  hasConflict: boolean
  isOutsideShift: boolean
  isOverlapConflict: boolean
  outsideShiftMessage?: string
  overlapMessage?: string
  overlappingOrders: Order[]
  recommended: boolean
}

/**
 * Checks whether a given driver has schedule conflicts with an order:
 * 1. Outside shift hours warning
 * 2. Trip overlap / double booking within a 2-hour window buffer
 */
export function evaluateDriverOrderConflict(
  driver: Driver,
  order: Order,
  allOrders: Order[],
): ConflictCheckResult {
  const result: ConflictCheckResult = {
    hasConflict: false,
    isOutsideShift: false,
    isOverlapConflict: false,
    overlappingOrders: [],
    recommended: true,
  }

  // Parse order pickup date & time
  const orderDate = new Date(order.scheduledTime)
  const orderTimeMinutes = orderDate.getHours() * 60 + orderDate.getMinutes()
  const orderTimeStr = `${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`

  // 1. Shift check
  if (driver.workingHours) {
    const { shiftStart, shiftEnd, onShift } = driver.workingHours
    const [startH, startM] = shiftStart.split(':').map(Number)
    const [endH, endM] = shiftEnd.split(':').map(Number)
    const startMin = startH * 60 + (startM || 0)
    const endMin = endH * 60 + (endM || 0)

    let isWithinShift = false
    if (endMin > startMin) {
      // Regular same-day shift (e.g. 09:00 - 18:00)
      isWithinShift = orderTimeMinutes >= startMin && orderTimeMinutes <= endMin
    } else {
      // Overnight shift spanning midnight (e.g. 18:00 - 03:00)
      isWithinShift = orderTimeMinutes >= startMin || orderTimeMinutes <= endMin
    }

    if (!isWithinShift || !onShift) {
      result.isOutsideShift = true
      result.hasConflict = true
      result.recommended = false
      result.outsideShiftMessage = `⚠️ Shift Conflict: Order time ${orderTimeStr} is outside driver's working shift (${shiftStart}-${shiftEnd})`
    }
  }

  // 2. Overlap / Double-booking Conflict check (within 2-hour window buffer)
  const BUFFER_MS = 2 * 60 * 60 * 1000 // 2 hours
  const orderEpoch = orderDate.getTime()

  const driverAssignedOrders = allOrders.filter(
    (o) =>
      o.id !== order.id &&
      o.driverId === driver.id &&
      !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status),
  )

  for (const existing of driverAssignedOrders) {
    const existingEpoch = new Date(existing.scheduledTime).getTime()
    const diff = Math.abs(existingEpoch - orderEpoch)
    if (diff <= BUFFER_MS) {
      result.isOverlapConflict = true
      result.hasConflict = true
      result.recommended = false
      result.overlappingOrders.push(existing)
      const existingTime = new Date(existing.scheduledTime)
      const existingTimeStr = `${String(existingTime.getHours()).padStart(2, '0')}:${String(existingTime.getMinutes()).padStart(2, '0')}`
      result.overlapMessage = `⚠️ Double-Booking Conflict: Driver ${driver.nameZh || driver.name} already has order ${existing.orderNo} at ${existingTimeStr}`
    }
  }

  return result
}
