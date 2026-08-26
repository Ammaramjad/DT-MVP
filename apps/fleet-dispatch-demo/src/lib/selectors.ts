import type { Driver, Order } from '../types'

export function computeKpis(orders: Order[], drivers: Driver[]) {
  const now = Date.now()
  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status)).length
  const availableDrivers = drivers.filter((d) => d.status === 'AVAILABLE').length
  const completedToday = orders.filter((o) => o.status === 'COMPLETED')
  const todayRevenue = completedToday.reduce((sum, o) => sum + o.priceEstimate, 0)

  const delayedFlights = orders.filter((o) => o.flightInfo?.status === 'DELAYED').length
  const flightOrders = orders.filter((o) => o.flightInfo).length
  const onTimePct = flightOrders === 0 ? 98 : Math.round(((flightOrders - delayedFlights) / flightOrders) * 100)

  const unassignedOrders = orders.filter((o) => o.status === 'NEW' || o.status === 'PENDING_DRIVER_RESPONSE').length
  const anomalies =
    drivers.filter((d) => d.unresponsiveFlagUntil && d.unresponsiveFlagUntil > now).length +
    orders.filter((o) => o.flightInfo?.status === 'DELAYED' && !['COMPLETED', 'CANCELLED'].includes(o.status)).length
  const todayIso = new Date().toISOString().slice(0, 10)
  const onLeaveToday = drivers.filter((d) => d.shiftSchedule.find((s) => s.date === todayIso)?.shift === 'OFF').length

  return {
    activeOrders,
    availableDrivers,
    todayRevenue,
    onTimePct,
    completedCount: completedToday.length,
    unassignedOrders,
    anomalies,
    onLeaveToday,
  }
}

export function documentAlerts(drivers: Driver[]) {
  return drivers.flatMap((d) => {
    const alerts: { driverId: string; driverName: string; docTypeKey: string; status: string; expiresAt: string }[] = []
    if (d.documents.license.status !== 'VALID') {
      alerts.push({ driverId: d.id, driverName: d.name, docTypeKey: 'doc.license', status: d.documents.license.status, expiresAt: d.documents.license.expiresAt })
    }
    if (d.documents.insurance.status !== 'VALID') {
      alerts.push({ driverId: d.id, driverName: d.name, docTypeKey: 'doc.insurance', status: d.documents.insurance.status, expiresAt: d.documents.insurance.expiresAt })
    }
    return alerts
  })
}
