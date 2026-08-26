import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Luggage, MapPinned, Phone, Plane, ShieldCheck, Star, Users } from 'lucide-react'
import { useFleetStore } from '../store/useFleetStore'
import { PanelHeader } from '../components/layout/PanelHeader'
import { StatusStepper } from '../components/ui/StatusStepper'
import { OrderTypeBadge, FlightBadge } from '../components/ui/OrderBadges'
import { RouteMapView } from '../components/map/RouteMapView'
import { formatClock, formatTWD, ticksToMinutesLabel } from '../lib/format'
import { remainingDistanceKm } from '../lib/geo'

export default function CustomerTrackingPanel() {
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const focusOrderId = useFleetStore((s) => s.focusOrderId)
  const setFocusOrder = useFleetStore((s) => s.setFocusOrder)
  const [copied, setCopied] = useState(false)

  const sortedOrders = useMemo(() => [...orders].sort((a, b) => b.createdAt - a.createdAt), [orders])
  const selectedId = focusOrderId ?? sortedOrders[0]?.id ?? null
  const order = orders.find((o) => o.id === selectedId) ?? sortedOrders[0]

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(t)
  }, [copied])

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">No orders yet — book a ride first.</div>
    )
  }

  const driver = drivers.find((d) => d.id === order.driverId)
  const vehicle = vehicles.find((v) => v.id === order.vehicleId)
  const isDispatched = order.status !== 'NEW' && order.status !== 'CANCELLED'
  const isDone = order.status === 'COMPLETED'
  const isCancelled = order.status === 'CANCELLED'

  const activeLeg =
    order.status === 'EN_ROUTE_TO_PICKUP' || order.status === 'ASSIGNED' || order.status === 'NEW' ? order.routeToPickup : order.routeToDropoff
  const remainingKm = activeLeg ? remainingDistanceKm(activeLeg, order.legProgress) : order.distanceKm
  const remainingTicks = activeLeg ? activeLeg.durationTicks * (1 - order.legProgress) : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white pb-32 text-slate-900">
      <PanelHeader title="Track Your Ride" subtitle="走瘋派車 · Live Tracking" icon={<MapPinned className="h-5 w-5" />} light />

      <div className="mx-auto mt-4 max-w-2xl px-4">
        <select
          value={order.id}
          onChange={(e) => setFocusOrder(e.target.value)}
          data-testid="customer-order-select"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {sortedOrders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNo} · {o.customer.name} · {o.status}
            </option>
          ))}
        </select>
      </div>

      <div className="mx-auto mt-4 max-w-2xl px-4">
        <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-bold text-slate-800">{order.orderNo}</p>
              <p className="text-xs text-slate-400">Scheduled {formatClock(order.scheduledTime)}</p>
            </div>
            <OrderTypeBadge type={order.type} />
          </div>

          {isCancelled ? (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-center text-sm text-red-500">This order was cancelled.</div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <StatusStepper status={order.status} />
            </div>
          )}

          {!isDispatched && !isCancelled && (
            <div className="mt-4 rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-600">
              Your order has been received. The dispatch engine is finding the best available driver…
            </div>
          )}

          {isDispatched && driver && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">{driver.avatarEmoji}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {driver.name} <span className="text-slate-400">· {driver.nameZh}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {vehicle?.plate} · {vehicle?.type} · <Star className="inline h-3 w-3 fill-amber-400 text-amber-400" /> {driver.rating.toFixed(1)}
                </p>
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600">
                <Phone className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {!isDone && !isCancelled && (
            <div className="mt-4 h-64 overflow-hidden rounded-xl">
              <RouteMapView order={order} />
            </div>
          )}

          {(order.status === 'EN_ROUTE_TO_PICKUP' || order.status === 'IN_TRANSIT') && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 p-3.5">
              <div>
                <p className="text-xs text-blue-500">
                  {order.status === 'EN_ROUTE_TO_PICKUP' ? 'Driver arriving in' : 'Arriving at destination in'}
                </p>
                <p className="text-lg font-bold text-blue-700">{ticksToMinutesLabel(remainingTicks)}</p>
              </div>
              <div className="text-right text-xs text-blue-500">
                {remainingKm.toFixed(1)} km remaining
              </div>
            </div>
          )}

          {isDone && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 rounded-xl bg-emerald-50 p-5 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 font-semibold text-emerald-700">Trip Completed — Thank you for riding with 走瘋派車!</p>
              <div className="mt-2 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </motion.div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] text-slate-400">Pickup</p>
              <p className="font-medium text-slate-700">{order.pickup.name}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] text-slate-400">Drop-off</p>
              <p className="font-medium text-slate-700">{order.dropoff.name}</p>
            </div>
          </div>

          {order.flightInfo && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-slate-700">{order.flightInfo.flightNumber}</span>
                <span className="text-xs text-slate-400">Gate {order.flightInfo.gate}</span>
              </div>
              <FlightBadge status={order.flightInfo.status} />
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {order.passengers} passengers
            </span>
            <span className="flex items-center gap-1">
              <Luggage className="h-3.5 w-3.5" /> {order.luggage} bags
            </span>
            <span className="font-semibold text-slate-600">{formatTWD(order.priceEstimate)}</span>
          </div>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(`https://zoufengpaiche.demo/track/${order.orderNo}`).catch(() => {})
              setCopied(true)
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? 'Link copied!' : 'Share secure tracking link'}
          </button>
        </div>
      </div>
    </div>
  )
}
