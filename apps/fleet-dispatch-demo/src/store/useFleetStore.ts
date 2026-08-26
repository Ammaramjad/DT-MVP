import { create } from 'zustand'
import type { AppNotification, BookingInput, Driver, NotificationKind, Order, Vehicle } from '../types'
import { createSeedState, SEED_VEHICLES } from '../data/seed'
import { AIRPORTS, getLocation, NON_AIRPORTS } from '../data/locations'
import { buildRoutePath, evaluateRoute } from '../lib/geo'
import { driftFlightStatus, lookupFlight, randomFlightNumber } from '../lib/flight'
import { estimateDurationMin, estimateFare, genId, nextOrderNo } from '../lib/pricing'
import { suggestDriver } from '../lib/dispatch'

const MAX_NOTIFICATIONS = 40
const AMBIENT_ORDER_CHANCE = 0.05
const AUTO_ASSIGN_CHANCE = 0.6
const MAX_ACTIVE_AMBIENT_ORDERS = 10

interface FleetState {
  orders: Order[]
  drivers: Driver[]
  vehicles: Vehicle[]
  notifications: AppNotification[]
  autoDispatchEnabled: boolean
  ambientOrdersEnabled: boolean
  focusOrderId: string | null
  focusDriverId: string | null
  tickCount: number

  createOrder: (input: BookingInput) => Order
  assignOrder: (orderId: string, driverId?: string) => void
  startTrip: (orderId: string) => void
  markPickedUp: (orderId: string) => void
  cancelOrder: (orderId: string) => void
  setAutoDispatch: (v: boolean) => void
  setAmbientOrders: (v: boolean) => void
  setFocusOrder: (id: string | null) => void
  setFocusDriver: (id: string | null) => void
  dismissNotification: (id: string) => void
  setDriverAvailability: (driverId: string, status: 'AVAILABLE' | 'OFFLINE') => void
  tick: () => void
}

function pushNotification(
  notifications: AppNotification[],
  kind: NotificationKind,
  title: string,
  message: string,
  orderId?: string,
): AppNotification[] {
  const next: AppNotification = { id: genId('ntf'), timestamp: Date.now(), kind, title, message, orderId }
  return [next, ...notifications].slice(0, MAX_NOTIFICATIONS)
}

export function classifyOrderType(pickupId: string, dropoffId: string): Order['type'] {
  const pickup = getLocation(pickupId)
  const dropoff = getLocation(dropoffId)
  if (pickup.isAirport) return 'AIRPORT_PICKUP'
  if (dropoff.isAirport) return 'AIRPORT_DROPOFF'
  return 'TOUR_CHARTER'
}

function buildOrderFromInput(input: BookingInput): Order {
  const pickup = getLocation(input.pickupId)
  const dropoff = getLocation(input.dropoffId)
  const type = classifyOrderType(input.pickupId, input.dropoffId)
  const id = genId('ord')
  const routeToDropoff = buildRoutePath(pickup, dropoff, `${id}-leg2`)
  const flightInfo = input.flightNumber ? lookupFlight(input.flightNumber, input.scheduledTime) : null

  return {
    id,
    orderNo: nextOrderNo(),
    channel: input.channel,
    type,
    status: 'NEW',
    createdAt: Date.now(),
    scheduledTime: input.scheduledTime,
    customer: input.customer,
    pickup,
    dropoff,
    vehicleType: input.vehicleType,
    passengers: input.passengers,
    luggage: input.luggage,
    notes: input.notes,
    flightNumber: input.flightNumber || null,
    flightInfo,
    driverId: null,
    vehicleId: null,
    suggestedDriverId: null,
    priceEstimate: estimateFare(routeToDropoff.distanceKm, input.vehicleType, pickup.isAirport || dropoff.isAirport),
    distanceKm: routeToDropoff.distanceKm,
    durationMin: estimateDurationMin(routeToDropoff.distanceKm),
    routeToPickup: null,
    routeToDropoff,
    legProgress: 0,
    currentPos: null,
    pickedUpAt: null,
  }
}

function randomAmbientInput(): BookingInput {
  const channels: BookingInput['channel'][] = ['KKday', 'Booking.com', 'Klook', 'LINE@', 'Phone / Agent']
  const vehicleTypes: BookingInput['vehicleType'][] = ['SEDAN', 'SUV', 'VAN', 'LUXURY', 'MINIBUS']
  const names = ['Kenji Watanabe', 'Olivia Chen', 'Liam O\u2019Connor', 'Anya Petrova', 'Noah Kim', 'Fatima Al-Sayed', 'Lucas Silva', 'Grace Park']

  const isAirportTrip = Math.random() > 0.35
  let pickupId: string
  let dropoffId: string
  if (isAirportTrip) {
    const airport = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)]
    const other = NON_AIRPORTS[Math.floor(Math.random() * NON_AIRPORTS.length)]
    const inbound = Math.random() > 0.5
    pickupId = inbound ? airport.id : other.id
    dropoffId = inbound ? other.id : airport.id
  } else {
    const a = NON_AIRPORTS[Math.floor(Math.random() * NON_AIRPORTS.length)]
    let b = NON_AIRPORTS[Math.floor(Math.random() * NON_AIRPORTS.length)]
    if (b.id === a.id) b = NON_AIRPORTS[(NON_AIRPORTS.indexOf(a) + 1) % NON_AIRPORTS.length]
    pickupId = a.id
    dropoffId = b.id
  }

  const scheduled = new Date(Date.now() + (30 + Math.random() * 150) * 60_000)
  const name = names[Math.floor(Math.random() * names.length)]

  return {
    channel: channels[Math.floor(Math.random() * channels.length)],
    pickupId,
    dropoffId,
    scheduledTime: scheduled.toISOString(),
    vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
    passengers: 1 + Math.floor(Math.random() * 5),
    luggage: Math.floor(Math.random() * 4),
    customer: { name, phone: '+1 555-0100', email: `${name.split(' ')[0].toLowerCase()}@example.com` },
    flightNumber: isAirportTrip ? randomFlightNumber() : '',
    notes: '',
  }
}

const seed = createSeedState()

export const useFleetStore = create<FleetState>((set, get) => ({
  orders: seed.orders,
  drivers: seed.drivers,
  vehicles: SEED_VEHICLES,
  notifications: seed.notifications,
  autoDispatchEnabled: true,
  ambientOrdersEnabled: true,
  focusOrderId: seed.orders[0]?.id ?? null,
  focusDriverId: 'drv-1',
  tickCount: 0,

  createOrder: (input) => {
    const order = buildOrderFromInput(input)
    const withSuggestion = { ...order, suggestedDriverId: suggestDriver(order, get().drivers, get().vehicles) }

    set((state) => ({
      orders: [withSuggestion, ...state.orders],
      notifications: pushNotification(
        state.notifications,
        'INFO',
        'New Order Received',
        `Order ${withSuggestion.orderNo} received via ${withSuggestion.channel} \u2014 ${withSuggestion.pickup.name} \u2192 ${withSuggestion.dropoff.name}.`,
        withSuggestion.id,
      ),
      focusOrderId: withSuggestion.id,
    }))

    return withSuggestion
  },

  assignOrder: (orderId, driverId) => {
    const state = get()
    const order = state.orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'NEW') return
    const chosenDriverId = driverId ?? order.suggestedDriverId ?? suggestDriver(order, state.drivers, state.vehicles)
    if (!chosenDriverId) return
    const driver = state.drivers.find((d) => d.id === chosenDriverId)
    if (!driver || driver.status !== 'AVAILABLE') return
    const vehicle = state.vehicles.find((v) => v.id === driver.vehicleId)

    const driverAsLoc = {
      id: `${driver.id}-pos`,
      name: 'Current position',
      nameZh: '目前位置',
      address: '',
      lat: driver.lat,
      lng: driver.lng,
      svgX: driver.svgX,
      svgY: driver.svgY,
      isAirport: false,
    }
    const routeToPickup = buildRoutePath(driverAsLoc, order.pickup, `${order.id}-leg1-${driver.id}`)

    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId
          ? { ...o, status: 'ASSIGNED', driverId: driver.id, vehicleId: vehicle?.id ?? null, routeToPickup, legProgress: 0 }
          : o,
      ),
      drivers: s.drivers.map((d) => (d.id === driver.id ? { ...d, status: 'BUSY' } : d)),
      notifications: pushNotification(
        s.notifications,
        'SUCCESS',
        'Driver Assigned',
        `${driver.name} (${driver.nameZh}) assigned to order ${order.orderNo}. LINE@ notification sent to driver.`,
        order.id,
      ),
    }))
  },

  startTrip: (orderId) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId && o.status === 'ASSIGNED' ? { ...o, status: 'EN_ROUTE_TO_PICKUP', legProgress: 0 } : o)),
      notifications: pushNotification(
        s.notifications,
        'INFO',
        'Driver En Route',
        'Driver has started the trip toward the pickup location.',
        orderId,
      ),
    }))
  },

  markPickedUp: (orderId) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId && o.status === 'ARRIVED_AT_PICKUP' ? { ...o, status: 'PICKED_UP', pickedUpAt: Date.now() } : o)),
      notifications: pushNotification(s.notifications, 'SUCCESS', 'Passenger Picked Up', 'Passenger confirmed onboard. Heading to destination.', orderId),
    }))
  },

  cancelOrder: (orderId) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      return {
        orders: s.orders.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o)),
        drivers: order?.driverId ? s.drivers.map((d) => (d.id === order.driverId ? { ...d, status: 'AVAILABLE' } : d)) : s.drivers,
        notifications: pushNotification(s.notifications, 'WARNING', 'Order Cancelled', `Order ${order?.orderNo ?? ''} was cancelled.`, orderId),
      }
    })
  },

  setAutoDispatch: (v) => set({ autoDispatchEnabled: v }),
  setAmbientOrders: (v) => set({ ambientOrdersEnabled: v }),
  setFocusOrder: (id) => set({ focusOrderId: id }),
  setFocusDriver: (id) => set({ focusDriverId: id }),
  dismissNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  setDriverAvailability: (driverId, status) =>
    set((s) => ({
      drivers: s.drivers.map((d) => (d.id === driverId && d.status !== 'BUSY' ? { ...d, status } : d)),
    })),

  tick: () => {
    const s = get()
    let notifications = s.notifications

    const activeCount = s.orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status)).length

    // Ambient cross-platform order aggregation: new bookings arrive on their own
    // from other channels so the Control Center always feels alive.
    let orders = s.orders
    if (s.ambientOrdersEnabled && activeCount < MAX_ACTIVE_AMBIENT_ORDERS && Math.random() < AMBIENT_ORDER_CHANCE) {
      const input = randomAmbientInput()
      const order = buildOrderFromInput(input)
      const withSuggestion = { ...order, suggestedDriverId: suggestDriver(order, s.drivers, s.vehicles) }
      orders = [withSuggestion, ...orders]
      notifications = pushNotification(
        notifications,
        'INFO',
        'New Order Received',
        `Order ${withSuggestion.orderNo} received via ${withSuggestion.channel} \u2014 ${withSuggestion.pickup.name} \u2192 ${withSuggestion.dropoff.name}.`,
        withSuggestion.id,
      )
    }

    let drivers = s.drivers

    // Auto-dispatch engine: probabilistically assign NEW orders that already
    // have a suggested driver, simulating the automatic priority engine.
    if (s.autoDispatchEnabled) {
      for (const order of orders) {
        if (order.status !== 'NEW') continue
        if (!order.suggestedDriverId) continue
        if (Math.random() > AUTO_ASSIGN_CHANCE) continue
        const driver = drivers.find((d) => d.id === order.suggestedDriverId)
        if (!driver || driver.status !== 'AVAILABLE') continue
        const vehicle = s.vehicles.find((v) => v.id === driver.vehicleId)
        const driverAsLoc = {
          id: `${driver.id}-pos`,
          name: 'Current position',
          nameZh: '目前位置',
          address: '',
          lat: driver.lat,
          lng: driver.lng,
          svgX: driver.svgX,
          svgY: driver.svgY,
          isAirport: false,
        }
        const routeToPickup = buildRoutePath(driverAsLoc, order.pickup, `${order.id}-leg1-${driver.id}`)
        orders = orders.map((o) =>
          o.id === order.id
            ? { ...o, status: 'ASSIGNED', driverId: driver.id, vehicleId: vehicle?.id ?? null, routeToPickup, legProgress: 0 }
            : o,
        )
        drivers = drivers.map((d) => (d.id === driver.id ? { ...d, status: 'BUSY' } : d))
        notifications = pushNotification(
          notifications,
          'SUCCESS',
          'Auto-Dispatch: Driver Assigned',
          `${driver.name} (${driver.nameZh}) auto-assigned to order ${order.orderNo} by priority engine.`,
          order.id,
        )
      }
    }

    // Movement + lifecycle progression for active orders.
    orders = orders.map((order) => {
      if (order.status === 'EN_ROUTE_TO_PICKUP' && order.routeToPickup) {
        const step = 1 / order.routeToPickup.durationTicks
        const nextProgress = order.legProgress + step
        if (nextProgress >= 1) {
          notifications = pushNotification(notifications, 'SUCCESS', 'Driver Arrived', `Driver arrived at pickup for order ${order.orderNo}.`, order.id)
          const pos = { lat: order.pickup.lat, lng: order.pickup.lng, x: order.pickup.svgX, y: order.pickup.svgY }
          drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
          return { ...order, status: 'ARRIVED_AT_PICKUP', legProgress: 1, currentPos: pos }
        }
        const pos = evaluateRoute(order.routeToPickup, nextProgress)
        drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
        return { ...order, legProgress: nextProgress, currentPos: pos }
      }

      if (order.status === 'PICKED_UP') {
        return { ...order, status: 'IN_TRANSIT', legProgress: 0 }
      }

      if (order.status === 'IN_TRANSIT' && order.routeToDropoff) {
        const step = 1 / order.routeToDropoff.durationTicks
        const nextProgress = order.legProgress + step
        if (nextProgress >= 1) {
          notifications = pushNotification(notifications, 'SUCCESS', 'Trip Completed', `Order ${order.orderNo} completed successfully.`, order.id)
          drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, status: 'AVAILABLE' } : d))
          const pos = { lat: order.dropoff.lat, lng: order.dropoff.lng, x: order.dropoff.svgX, y: order.dropoff.svgY }
          return { ...order, status: 'COMPLETED', legProgress: 1, currentPos: pos }
        }
        const pos = evaluateRoute(order.routeToDropoff, nextProgress)
        drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
        return { ...order, legProgress: nextProgress, currentPos: pos }
      }

      if (order.flightInfo && ['NEW', 'ASSIGNED', 'EN_ROUTE_TO_PICKUP'].includes(order.status) && Math.random() < 0.06) {
        const drifted = driftFlightStatus(order.flightInfo)
        if (drifted.status !== order.flightInfo.status) {
          notifications = pushNotification(
            notifications,
            drifted.status === 'DELAYED' ? 'WARNING' : 'INFO',
            'Flight Status Updated',
            `Flight ${drifted.flightNumber}: now ${drifted.status.replace('_', ' ')}${drifted.status === 'DELAYED' ? ` (+${drifted.delayMinutes}m)` : ''}.`,
            order.id,
          )
        }
        return { ...order, flightInfo: drifted }
      }

      return order
    })

    set({ orders, drivers, notifications, tickCount: s.tickCount + 1 })
  },
}))
