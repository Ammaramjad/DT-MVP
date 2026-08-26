import { create } from 'zustand'
import type {
  AppNotification,
  BookingInput,
  CustomerProfile,
  DispatchAttempt,
  Driver,
  DriverStats,
  LocationRef,
  NotificationChannel,
  NotificationKind,
  Order,
  StatusActor,
  Vehicle,
} from '../types'
import { createSeedState, SEED_VEHICLES } from '../data/seed'
import { AIRPORTS, getLocation, NON_AIRPORTS } from '../data/locations'
import { buildRoutePath, evaluateRoute } from '../lib/geo'
import { getCachedRoute, resolveDynamicRoute } from '../lib/routing'
import { driftFlightStatus, lookupFlight, randomFlightNumber } from '../lib/flight'
import { computeFareBreakdown, estimateDurationMin, genId, nextOrderNo } from '../lib/pricing'
import { suggestDriver } from '../lib/dispatch'
import { buildCapacityForecast } from '../lib/capacity'

const MAX_NOTIFICATIONS = 60
const AMBIENT_ORDER_CHANCE = 0.05
const AUTO_ASSIGN_CHANCE = 0.6
const MAX_ACTIVE_AMBIENT_ORDERS = 10

// Escalation ladder timings — kept short (8-15 simulated seconds) so the
// no-response demo path is watchable live rather than requiring a real wait.
const STAGE_TIMEOUT_MIN_MS = 8000
const STAGE_TIMEOUT_MAX_MS = 15000
const AUTO_ACCEPT_CHANCE_PER_TICK = 0.32
const UNRESPONSIVE_FLAG_MS = 20_000

interface FleetState {
  orders: Order[]
  drivers: Driver[]
  vehicles: Vehicle[]
  notifications: AppNotification[]
  customerProfiles: CustomerProfile[]
  capacityForecast: ReturnType<typeof buildCapacityForecast>
  autoDispatchEnabled: boolean
  ambientOrdersEnabled: boolean
  focusOrderId: string | null
  focusDriverId: string | null
  tickCount: number

  createOrder: (input: BookingInput) => Order
  assignOrder: (orderId: string, driverId?: string) => void
  respondToDispatch: (orderId: string, accept: boolean) => void
  toggleDemoNoResponse: (orderId: string) => void
  startTrip: (orderId: string) => void
  markPickedUp: (orderId: string) => void
  cancelOrder: (orderId: string) => void
  setAutoDispatch: (v: boolean) => void
  setAmbientOrders: (v: boolean) => void
  setFocusOrder: (id: string | null) => void
  setFocusDriver: (id: string | null) => void
  dismissNotification: (id: string) => void
  setDriverAvailability: (driverId: string, status: 'AVAILABLE' | 'OFFLINE') => void
  hydrateSeedRoutes: () => void
  tick: () => void
}

function pushNotification(
  notifications: AppNotification[],
  kind: NotificationKind,
  titleKey: string,
  messageKey: string,
  params?: Record<string, string | number>,
  orderId?: string,
  channels?: NotificationChannel[],
  driverId?: string,
): AppNotification[] {
  const next: AppNotification = { id: genId('ntf'), timestamp: Date.now(), kind, titleKey, messageKey, params, orderId, channels, driverId }
  return [next, ...notifications].slice(0, MAX_NOTIFICATIONS)
}

function appendHistory(order: Order, actor: StatusActor): Order {
  return {
    ...order,
    statusHistory: [...order.statusHistory, { id: genId('hist'), status: order.status, at: Date.now(), actor }],
  }
}

function randomTimeoutMs(): number {
  return STAGE_TIMEOUT_MIN_MS + Math.random() * (STAGE_TIMEOUT_MAX_MS - STAGE_TIMEOUT_MIN_MS)
}

function driverAsLocation(driver: Driver): LocationRef {
  return {
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
}

function bumpStats(stats: DriverStats, kind: 'accepted' | 'declined' | 'missed'): DriverStats {
  if (kind === 'accepted') return { ...stats, acceptedToday: stats.acceptedToday + 1, acceptedAllTime: stats.acceptedAllTime + 1 }
  if (kind === 'declined') return { ...stats, declinedToday: stats.declinedToday + 1, declinedAllTime: stats.declinedAllTime + 1 }
  return { ...stats, missedToday: stats.missedToday + 1, missedAllTime: stats.missedAllTime + 1 }
}

/** Creates (or escalates to) one rung of the multi-channel notification ladder for an order. */
function startDispatchAttempt(
  order: Order,
  driver: Driver,
  stage: 1 | 2,
  notifications: AppNotification[],
  actor: StatusActor = 'SYSTEM',
): { order: Order; notifications: AppNotification[] } {
  const channels: NotificationChannel[] = stage === 1 ? ['IN_APP'] : ['LINE', 'PHONE_CALL']
  const now = Date.now()
  const attempt: DispatchAttempt = {
    id: genId('disp'),
    orderId: order.id,
    stage,
    driverId: driver.id,
    driverName: driver.name,
    channels,
    sentAt: now,
    respondBy: now + randomTimeoutMs(),
    status: 'AWAITING_RESPONSE',
    resolvedAt: null,
    simulateNoResponse: order.demoForceNoResponse,
  }

  const updatedOrder = appendHistory(
    {
      ...order,
      status: 'PENDING_DRIVER_RESPONSE',
      pendingDriverId: driver.id,
      escalationStage: stage,
      dispatchAttempts: [...order.dispatchAttempts, attempt],
    },
    actor,
  )

  const nextNotifications =
    stage === 1
      ? pushNotification(
          notifications,
          'INFO',
          'notif.dispatchSent.title',
          'notif.dispatchSent.message',
          { orderNo: order.orderNo, driverName: driver.name, driverNameZh: driver.nameZh },
          order.id,
          channels,
          driver.id,
        )
      : pushNotification(
          notifications,
          'WARNING',
          'notif.escalating.title',
          'notif.escalating.message',
          { orderNo: order.orderNo, driverName: driver.name },
          order.id,
          channels,
          driver.id,
        )

  return { order: updatedOrder, notifications: nextNotifications }
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
  // Reuse an already-resolved real road route for this exact pickup/dropoff
  // pair if one exists in the cache; otherwise fall back to the synthetic
  // generator immediately and let the caller kick off a real-route fetch.
  const routeToDropoff = getCachedRoute(pickup, dropoff) ?? buildRoutePath(pickup, dropoff, `${id}-leg2`)
  const flightInfo = input.flightNumber ? lookupFlight(input.flightNumber, input.scheduledTime) : null
  const isAirport = pickup.isAirport || dropoff.isAirport
  const waitingMinutes = flightInfo?.status === 'DELAYED' && pickup.isAirport ? flightInfo.delayMinutes : 0
  const durationMin = estimateDurationMin(routeToDropoff.distanceKm)
  const fareBreakdown = computeFareBreakdown(routeToDropoff.distanceKm, durationMin, input.vehicleType, isAirport, {
    waitingMinutes,
    couponCode: input.couponCode,
  })

  const now = Date.now()

  return {
    id,
    orderNo: nextOrderNo(),
    channel: input.channel,
    type,
    status: 'NEW',
    createdAt: now,
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
    priceEstimate: fareBreakdown.total,
    fareBreakdown,
    distanceKm: routeToDropoff.distanceKm,
    durationMin,
    routeToPickup: null,
    routeToDropoff,
    legProgress: 0,
    currentPos: null,
    pickedUpAt: null,
    pendingDriverId: null,
    dispatchAttempts: [],
    escalationStage: 0,
    unresponsiveDriverIds: [],
    demoForceNoResponse: false,
    quotationVersion: input.quotationVersion ?? 1,
    quotedAt: now,
    statusHistory: [{ id: genId('hist'), status: 'NEW', at: now, actor: 'CUSTOMER' }],
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
  customerProfiles: seed.customerProfiles,
  capacityForecast: buildCapacityForecast(seed.drivers.length),
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
        'notif.orderReceived.title',
        'notif.orderReceived.message',
        { orderNo: withSuggestion.orderNo, channel: withSuggestion.channel, pickup: withSuggestion.pickup.name, dropoff: withSuggestion.dropoff.name },
        withSuggestion.id,
      ),
      focusOrderId: withSuggestion.id,
    }))

    if (withSuggestion.routeToDropoff?.source === 'SYNTHETIC') {
      scheduleRouteHydration(withSuggestion.id, 'routeToDropoff', withSuggestion.pickup, withSuggestion.dropoff)
    }

    return withSuggestion
  },

  // "Assign" now kicks off the multi-channel dispatch/notification ladder
  // rather than instantly confirming a driver — mirrors the real Phase 2
  // notification module (In-App -> LINE+Phone escalation -> unresponsive flag).
  assignOrder: (orderId, driverId) => {
    const state = get()
    const order = state.orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'NEW') return
    const chosenDriverId = driverId ?? order.suggestedDriverId ?? suggestDriver(order, state.drivers, state.vehicles, order.unresponsiveDriverIds)
    if (!chosenDriverId) return
    const driver = state.drivers.find((d) => d.id === chosenDriverId)
    if (!driver || driver.status !== 'AVAILABLE') return

    const { order: updatedOrder, notifications } = startDispatchAttempt(order, driver, 1, state.notifications, 'DISPATCHER')

    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
      drivers: s.drivers.map((d) => (d.id === driver.id ? { ...d, status: 'PENDING_RESPONSE' } : d)),
      notifications,
    }))
  },

  // Called by the Driver App's Accept/Decline buttons on an incoming request.
  respondToDispatch: (orderId, accept) => {
    const state = get()
    const order = state.orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'PENDING_DRIVER_RESPONSE' || !order.pendingDriverId) return
    const driver = state.drivers.find((d) => d.id === order.pendingDriverId)
    if (!driver) return

    const lastIndex = order.dispatchAttempts.length - 1
    const lastAttempt = order.dispatchAttempts[lastIndex]
    const attempts: DispatchAttempt[] = order.dispatchAttempts.map((a, i) =>
      i === lastIndex ? { ...a, status: accept ? 'ACCEPTED' : 'DECLINED', resolvedAt: Date.now() } : a,
    )

    if (accept) {
      const vehicle = state.vehicles.find((v) => v.id === driver.vehicleId)
      const driverLoc = driverAsLocation(driver)
      const routeToPickup = getCachedRoute(driverLoc, order.pickup) ?? buildRoutePath(driverLoc, order.pickup, `${order.id}-leg1-${driver.id}`)
      const updatedOrder = appendHistory(
        {
          ...order,
          status: 'ASSIGNED',
          driverId: driver.id,
          vehicleId: vehicle?.id ?? null,
          pendingDriverId: null,
          routeToPickup,
          legProgress: 0,
          dispatchAttempts: attempts,
        },
        'DRIVER',
      )
      set((s) => ({
        orders: s.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        drivers: s.drivers.map((d) => (d.id === driver.id ? { ...d, status: 'BUSY', stats: bumpStats(d.stats, 'accepted') } : d)),
        notifications: pushNotification(
          s.notifications,
          'SUCCESS',
          'notif.driverAccepted.title',
          'notif.driverAccepted.message',
          { driverName: driver.name, driverNameZh: driver.nameZh, orderNo: order.orderNo },
          order.id,
          lastAttempt?.channels,
          driver.id,
        ),
      }))
      if (routeToPickup.source === 'SYNTHETIC') {
        scheduleRouteHydration(order.id, 'routeToPickup', driverLoc, order.pickup)
      }
      return
    }

    const freedDrivers = state.drivers.map((d) => (d.id === driver.id ? { ...d, status: 'AVAILABLE' as const, stats: bumpStats(d.stats, 'declined') } : d))
    const nextSuggestion = suggestDriver({ ...order, driverId: null }, freedDrivers, state.vehicles, order.unresponsiveDriverIds)
    const updatedOrder = appendHistory(
      { ...order, status: 'NEW', pendingDriverId: null, dispatchAttempts: attempts, escalationStage: 0, suggestedDriverId: nextSuggestion },
      'DRIVER',
    )
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
      drivers: freedDrivers,
      notifications: pushNotification(
        s.notifications,
        'WARNING',
        'notif.driverDeclined.title',
        'notif.driverDeclined.message',
        { driverName: driver.name, orderNo: order.orderNo },
        order.id,
        lastAttempt?.channels,
        driver.id,
      ),
    }))
  },

  // Demo-only toggle: forces the escalation ladder to run its full course
  // live (in-app -> LINE+phone -> unresponsive) instead of auto-simulating
  // an instant driver acceptance, so the flow can be shown end-to-end.
  toggleDemoNoResponse: (orderId) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, demoForceNoResponse: !o.demoForceNoResponse } : o)),
    })),

  startTrip: (orderId) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId && o.status === 'ASSIGNED' ? appendHistory({ ...o, status: 'EN_ROUTE_TO_PICKUP', legProgress: 0 }, 'DRIVER') : o)),
      notifications: pushNotification(s.notifications, 'INFO', 'notif.driverEnRoute.title', 'notif.driverEnRoute.message', undefined, orderId),
    }))
  },

  markPickedUp: (orderId) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId && o.status === 'ARRIVED_AT_PICKUP' ? appendHistory({ ...o, status: 'PICKED_UP', pickedUpAt: Date.now() }, 'DRIVER') : o)),
      notifications: pushNotification(s.notifications, 'SUCCESS', 'notif.passengerPickedUp.title', 'notif.passengerPickedUp.message', undefined, orderId),
    }))
  },

  cancelOrder: (orderId) => {
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      return {
        orders: s.orders.map((o) => (o.id === orderId ? appendHistory({ ...o, status: 'CANCELLED' }, 'DISPATCHER') : o)),
        drivers: order?.driverId ? s.drivers.map((d) => (d.id === order.driverId ? { ...d, status: 'AVAILABLE' } : d)) : s.drivers,
        notifications: pushNotification(s.notifications, 'WARNING', 'notif.orderCancelled.title', 'notif.orderCancelled.message', { orderNo: order?.orderNo ?? '' }, orderId),
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
      drivers: s.drivers.map((d) => (d.id === driverId && d.status !== 'BUSY' && d.status !== 'PENDING_RESPONSE' ? { ...d, status } : d)),
    })),

  // Fetches real OSRM routes for every seeded "already in progress" order
  // once on app load, so the demo shows genuine road-snapped routes even
  // for orders that were never freshly booked in this session.
  hydrateSeedRoutes: () => {
    const state = get()
    for (const order of state.orders) {
      if (order.routeToDropoff && order.routeToDropoff.source === 'SYNTHETIC') {
        scheduleRouteHydration(order.id, 'routeToDropoff', order.pickup, order.dropoff)
      }
      if (order.routeToPickup && order.routeToPickup.source === 'SYNTHETIC' && order.driverId) {
        const driver = state.drivers.find((d) => d.id === order.driverId)
        if (driver) scheduleRouteHydration(order.id, 'routeToPickup', driverAsLocation(driver), order.pickup)
      }
    }
  },

  tick: () => {
    const s = get()
    const now = Date.now()
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
        'notif.orderReceived.title',
        'notif.orderReceived.message',
        { orderNo: withSuggestion.orderNo, channel: withSuggestion.channel, pickup: withSuggestion.pickup.name, dropoff: withSuggestion.dropoff.name },
        withSuggestion.id,
      )
      if (withSuggestion.routeToDropoff?.source === 'SYNTHETIC') {
        scheduleRouteHydration(withSuggestion.id, 'routeToDropoff', withSuggestion.pickup, withSuggestion.dropoff)
      }
    }

    let drivers = s.drivers

    // Clear expired "unresponsive" flags on drivers.
    drivers = drivers.map((d) => (d.unresponsiveFlagUntil && d.unresponsiveFlagUntil <= now ? { ...d, unresponsiveFlagUntil: null, unresponsiveOrderNo: null } : d))

    // Auto-dispatch engine: probabilistically sends the first-channel dispatch
    // notification for NEW orders that already have a suggested driver.
    if (s.autoDispatchEnabled) {
      for (const order of orders) {
        if (order.status !== 'NEW') continue
        if (!order.suggestedDriverId) continue
        if (Math.random() > AUTO_ASSIGN_CHANCE) continue
        const driver = drivers.find((d) => d.id === order.suggestedDriverId)
        if (!driver || driver.status !== 'AVAILABLE') continue

        const { order: updatedOrder, notifications: nextNotifications } = startDispatchAttempt(order, driver, 1, notifications, 'SYSTEM')
        orders = orders.map((o) => (o.id === order.id ? updatedOrder : o))
        drivers = drivers.map((d) => (d.id === driver.id ? { ...d, status: 'PENDING_RESPONSE' } : d))
        notifications = nextNotifications
      }
    }

    // Escalation ladder: resolve or advance every order currently awaiting a
    // driver's response to its dispatch notification.
    orders = orders.map((order) => {
      if (order.status !== 'PENDING_DRIVER_RESPONSE' || !order.pendingDriverId) return order
      const attemptIndex = order.dispatchAttempts.length - 1
      const attempt = order.dispatchAttempts[attemptIndex]
      if (!attempt || attempt.status !== 'AWAITING_RESPONSE') return order

      const driver = drivers.find((d) => d.id === order.pendingDriverId)
      if (!driver) return order

      const timedOut = now >= attempt.respondBy
      const shouldAutoAccept = !order.demoForceNoResponse && !timedOut && Math.random() < AUTO_ACCEPT_CHANCE_PER_TICK

      if (shouldAutoAccept) {
        const vehicle = s.vehicles.find((v) => v.id === driver.vehicleId)
        const driverLoc = driverAsLocation(driver)
        const routeToPickup = getCachedRoute(driverLoc, order.pickup) ?? buildRoutePath(driverLoc, order.pickup, `${order.id}-leg1-${driver.id}`)
        drivers = drivers.map((d) => (d.id === driver.id ? { ...d, status: 'BUSY', stats: bumpStats(d.stats, 'accepted') } : d))
        notifications = pushNotification(
          notifications,
          'SUCCESS',
          'notif.driverAccepted.title',
          'notif.driverAccepted.message',
          { driverName: driver.name, driverNameZh: driver.nameZh, orderNo: order.orderNo },
          order.id,
          attempt.channels,
          driver.id,
        )
        if (routeToPickup.source === 'SYNTHETIC') {
          scheduleRouteHydration(order.id, 'routeToPickup', driverLoc, order.pickup)
        }
        return appendHistory(
          {
            ...order,
            status: 'ASSIGNED',
            driverId: driver.id,
            vehicleId: vehicle?.id ?? null,
            pendingDriverId: null,
            routeToPickup,
            legProgress: 0,
            dispatchAttempts: order.dispatchAttempts.map((a, i) => (i === attemptIndex ? { ...a, status: 'ACCEPTED', resolvedAt: now } : a)),
          },
          'DRIVER',
        )
      }

      if (!timedOut) return order

      if (attempt.stage === 1) {
        const resolvedAttempts = order.dispatchAttempts.map((a, i) => (i === attemptIndex ? { ...a, status: 'TIMED_OUT' as const, resolvedAt: now } : a))
        const { order: escalated, notifications: nextNotifications } = startDispatchAttempt({ ...order, dispatchAttempts: resolvedAttempts }, driver, 2, notifications, 'SYSTEM')
        notifications = nextNotifications
        return escalated
      }

      // Stage 2 also timed out: mark the driver unresponsive, flag it for the
      // Control Center, and requeue the order for reassignment.
      drivers = drivers.map((d) =>
        d.id === driver.id
          ? { ...d, status: 'AVAILABLE', unresponsiveFlagUntil: now + UNRESPONSIVE_FLAG_MS, unresponsiveOrderNo: order.orderNo, stats: bumpStats(d.stats, 'missed') }
          : d,
      )
      const unresponsiveDriverIds = [...order.unresponsiveDriverIds, driver.id]
      const freedForSuggestion = drivers
      const nextSuggestion = suggestDriver({ ...order, driverId: null }, freedForSuggestion, s.vehicles, unresponsiveDriverIds)
      notifications = pushNotification(
        notifications,
        'ERROR',
        'notif.driverUnresponsive.title',
        'notif.driverUnresponsive.message',
        { driverName: driver.name, driverNameZh: driver.nameZh, orderNo: order.orderNo },
        order.id,
        attempt.channels,
        driver.id,
      )
      return appendHistory(
        {
          ...order,
          status: 'NEW',
          pendingDriverId: null,
          escalationStage: 0,
          unresponsiveDriverIds,
          suggestedDriverId: nextSuggestion,
          dispatchAttempts: order.dispatchAttempts.map((a, i) => (i === attemptIndex ? { ...a, status: 'TIMED_OUT' as const, resolvedAt: now } : a)),
        },
        'SYSTEM',
      )
    })

    // Movement + lifecycle progression for active orders.
    orders = orders.map((order) => {
      if (order.status === 'EN_ROUTE_TO_PICKUP' && order.routeToPickup) {
        const step = 1 / order.routeToPickup.durationTicks
        const nextProgress = order.legProgress + step
        if (nextProgress >= 1) {
          notifications = pushNotification(notifications, 'SUCCESS', 'notif.driverArrived.title', 'notif.driverArrived.message', { orderNo: order.orderNo }, order.id)
          const pos = { lat: order.pickup.lat, lng: order.pickup.lng, x: order.pickup.svgX, y: order.pickup.svgY }
          drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
          return appendHistory({ ...order, status: 'ARRIVED_AT_PICKUP', legProgress: 1, currentPos: pos }, 'SYSTEM')
        }
        const pos = evaluateRoute(order.routeToPickup, nextProgress)
        drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
        return { ...order, legProgress: nextProgress, currentPos: pos }
      }

      if (order.status === 'PICKED_UP') {
        return appendHistory({ ...order, status: 'IN_TRANSIT', legProgress: 0 }, 'SYSTEM')
      }

      if (order.status === 'IN_TRANSIT' && order.routeToDropoff) {
        const step = 1 / order.routeToDropoff.durationTicks
        const nextProgress = order.legProgress + step
        if (nextProgress >= 1) {
          notifications = pushNotification(notifications, 'SUCCESS', 'notif.tripCompleted.title', 'notif.tripCompleted.message', { orderNo: order.orderNo }, order.id)
          drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, status: 'AVAILABLE' } : d))
          const pos = { lat: order.dropoff.lat, lng: order.dropoff.lng, x: order.dropoff.svgX, y: order.dropoff.svgY }
          return appendHistory({ ...order, status: 'COMPLETED', legProgress: 1, currentPos: pos }, 'SYSTEM')
        }
        const pos = evaluateRoute(order.routeToDropoff, nextProgress)
        drivers = drivers.map((d) => (d.id === order.driverId ? { ...d, lat: pos.lat, lng: pos.lng, svgX: pos.x, svgY: pos.y } : d))
        return { ...order, legProgress: nextProgress, currentPos: pos }
      }

      if (order.flightInfo && ['NEW', 'PENDING_DRIVER_RESPONSE', 'ASSIGNED', 'EN_ROUTE_TO_PICKUP'].includes(order.status) && Math.random() < 0.06) {
        const drifted = driftFlightStatus(order.flightInfo)
        if (drifted.status !== order.flightInfo.status) {
          notifications = pushNotification(
            notifications,
            drifted.status === 'DELAYED' ? 'WARNING' : 'INFO',
            'notif.flightUpdated.title',
            'notif.flightUpdated.message',
            { flightNumber: drifted.flightNumber, status: drifted.status.replace('_', ' '), delay: drifted.status === 'DELAYED' ? ` (+${drifted.delayMinutes}m)` : '' },
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

/** Resolves (and, once resolved, patches into the store) a real road-snapped
 * OSRM route for one order leg — called after the order/leg is created with
 * its synthetic fallback so the UI updates in place the moment the routing
 * service responds, with zero risk to the synchronous booking flow if the
 * network is slow or unavailable. */
function scheduleRouteHydration(orderId: string, leg: 'routeToPickup' | 'routeToDropoff', from: LocationRef, to: LocationRef): void {
  resolveDynamicRoute(from, to).then((route) => {
    if (!route) return
    const state = useFleetStore.getState()
    const order = state.orders.find((o) => o.id === orderId)
    if (!order || order[leg]?.source === 'OSRM') return
    useFleetStore.setState({
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, [leg]: route } : o)),
    })
  })
}
