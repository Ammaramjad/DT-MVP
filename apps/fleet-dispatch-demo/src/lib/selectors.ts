import type { Driver, Order } from '../types'

export function computeKpis(orders: Order[], drivers: Driver[]) {
  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status)).length
  const availableDrivers = drivers.filter((d) => d.status === 'AVAILABLE').length
  const completedToday = orders.filter((o) => o.status === 'COMPLETED')
  const todayRevenue = completedToday.reduce((sum, o) => sum + o.priceEstimate, 0)

  const delayedFlights = orders.filter((o) => o.flightInfo?.status === 'DELAYED').length
  const flightOrders = orders.filter((o) => o.flightInfo).length
  const onTimePct = flightOrders === 0 ? 98 : Math.round(((flightOrders - delayedFlights) / flightOrders) * 100)

  return { activeOrders, availableDrivers, todayRevenue, onTimePct, completedCount: completedToday.length }
}

export function documentAlerts(drivers: Driver[]) {
  return drivers.flatMap((d) => {
    const alerts: { driverId: string; driverName: string; docType: string; status: string; expiresAt: string }[] = []
    if (d.documents.license.status !== 'VALID') {
      alerts.push({ driverId: d.id, driverName: d.name, docType: 'Driving License', status: d.documents.license.status, expiresAt: d.documents.license.expiresAt })
    }
    if (d.documents.insurance.status !== 'VALID') {
      alerts.push({ driverId: d.id, driverName: d.name, docType: 'Insurance', status: d.documents.insurance.status, expiresAt: d.documents.insurance.expiresAt })
    }
    return alerts
  })
}
