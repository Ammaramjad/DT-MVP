import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Car,
  CheckCircle2,
  Flag,
  Luggage,
  MapPin,
  Navigation,
  Phone,
  Plane,
  Power,
  Star,
  Users,
} from 'lucide-react'
import { useFleetStore } from '../store/useFleetStore'
import { PanelHeader } from '../components/layout/PanelHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { OrderTypeBadge, FlightBadge, StatusBadge } from '../components/ui/OrderBadges'
import { RouteMapView } from '../components/map/RouteMapView'
import { DriverStatsHeader } from '../components/driver/DriverStatsHeader'
import { IncomingRequestCard } from '../components/driver/IncomingRequestCard'
import { VehicleCard } from '../components/vehicles/VehicleCard'
import { driverTierLabel, formatClock, ticksToMinutesLabel } from '../lib/format'
import { remainingDistanceKm } from '../lib/geo'
import { useLang } from '../i18n'

const ACTIVE_STATUSES = ['ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT']

export default function DriverPanel() {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const orders = useFleetStore((s) => s.orders)
  const focusDriverId = useFleetStore((s) => s.focusDriverId)
  const setFocusDriver = useFleetStore((s) => s.setFocusDriver)
  const startTrip = useFleetStore((s) => s.startTrip)
  const markPickedUp = useFleetStore((s) => s.markPickedUp)
  const setDriverAvailability = useFleetStore((s) => s.setDriverAvailability)

  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)

  const activeDriverId = focusDriverId ?? drivers[0]?.id ?? null
  const driver = drivers.find((d) => d.id === activeDriverId) ?? drivers[0]
  const vehicle = vehicles.find((v) => v.id === driver?.vehicleId)

  const activeOrder = orders.find((o) => o.driverId === driver?.id && ACTIVE_STATUSES.includes(o.status))
  const incomingRequest = orders.find((o) => o.status === 'PENDING_DRIVER_RESPONSE' && o.pendingDriverId === driver?.id)
  const todaysJobs = useMemo(
    () => orders.filter((o) => o.driverId === driver?.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [orders, driver?.id],
  )

  const recentlyCompleted = orders.find((o) => o.id === justCompletedId && o.status === 'COMPLETED')

  useEffect(() => {
    if (!activeOrder && recentlyCompleted) {
      const timer = window.setTimeout(() => setJustCompletedId(null), 4200)
      return () => window.clearTimeout(timer)
    }
  }, [activeOrder, recentlyCompleted])

  useEffect(() => {
    if (activeOrder?.status === 'IN_TRANSIT' && activeOrder.legProgress > 0.85) {
      setJustCompletedId(activeOrder.id)
    }
  }, [activeOrder])

  if (!driver) return null

  const activeLeg =
    activeOrder?.status === 'EN_ROUTE_TO_PICKUP' || activeOrder?.status === 'ASSIGNED'
      ? activeOrder.routeToPickup
      : activeOrder?.routeToDropoff
  const remainingKm = activeLeg ? remainingDistanceKm(activeLeg, activeOrder!.legProgress) : 0
  const remainingTicks = activeLeg ? activeLeg.durationTicks * (1 - activeOrder!.legProgress) : 0

  return (
    <div className="min-h-screen bg-mission-950 bg-noise pb-28 text-white">
      <PanelHeader title={t('driver.title')} subtitle={t('driver.subtitle')} icon={<Car className="h-5 w-5" />} />

      <div className="mx-auto mt-4 max-w-md px-4">
        <select
          value={driver.id}
          onChange={(e) => setFocusDriver(e.target.value)}
          data-testid="driver-select"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
        >
          {drivers.map((d) => (
            <option key={d.id} value={d.id} className="bg-slate-900">
              {d.name} ({d.nameZh}) — {d.status}
            </option>
          ))}
        </select>
      </div>

      <div className="mx-auto mt-4 max-w-md px-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('driver.myStats')}</p>
        <DriverStatsHeader stats={driver.stats} />
      </div>

      {incomingRequest && (
        <div className="mx-auto mt-4 max-w-md px-4">
          <IncomingRequestCard order={incomingRequest} />
        </div>
      )}

      <div className="mx-auto mt-4 max-w-md px-4">
        <div className="glass-panel overflow-hidden rounded-[28px] shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl">{driver.avatarEmoji}</div>
                <div>
                  <p className="font-semibold text-white">{lang === 'zh' ? driver.nameZh : driver.name}</p>
                  <p className="text-xs text-slate-400">{lang === 'zh' ? driver.name : driver.nameZh}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-amber-300">
                    <Star className="h-3 w-3 fill-amber-300" /> {driver.rating.toFixed(1)} · {driver.completedTrips}
                  </div>
                </div>
              </div>
              {(driver.status === 'AVAILABLE' || driver.status === 'OFFLINE') && (
                <button
                  onClick={() => setDriverAvailability(driver.id, driver.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE')}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ${
                    driver.status === 'AVAILABLE' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'
                  }`}
                >
                  <Power className="h-3 w-3" /> {driver.status === 'AVAILABLE' ? t('driver.online') : t('driver.offline')}
                </button>
              )}
              {driver.status === 'BUSY' && (
                <Badge tone="cyan" pulse>
                  {t('driver.onTrip')}
                </Badge>
              )}
              {driver.status === 'PENDING_RESPONSE' && (
                <Badge tone="pink" pulse>
                  {t('driver.awaitingResponse')}
                </Badge>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone="slate">{driverTierLabel(driver.tier, lang)}</Badge>
            </div>
            {vehicle && (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('driver.myVehicle')}</p>
                <VehicleCard type={vehicle.type} plate={vehicle.plate} size="sm" />
              </div>
            )}
          </div>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {activeOrder ? (
                <motion.div key={activeOrder.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{activeOrder.orderNo}</span>
                    <OrderTypeBadge type={activeOrder.type} />
                  </div>

                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Users className="h-3.5 w-3.5" /> {activeOrder.customer.name}
                      <Phone className="ml-2 h-3.5 w-3.5" /> {activeOrder.customer.phone}
                    </div>
                    <div className="mt-2 space-y-1.5 text-xs">
                      <p className="flex items-start gap-1.5 text-slate-300">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" /> {lang === 'zh' ? activeOrder.pickup.nameZh : activeOrder.pickup.name}
                      </p>
                      <p className="flex items-start gap-1.5 text-slate-300">
                        <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-300" /> {lang === 'zh' ? activeOrder.dropoff.nameZh : activeOrder.dropoff.name}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {activeOrder.passengers}
                      </span>
                      <span className="flex items-center gap-1">
                        <Luggage className="h-3 w-3" /> {activeOrder.luggage}
                      </span>
                      <span>{formatClock(activeOrder.scheduledTime, lang)}</span>
                    </div>
                    {activeOrder.notes && <p className="mt-2 rounded-lg bg-amber-400/10 p-2 text-[11px] text-amber-200">{t('driver.notesForDriver', { notes: activeOrder.notes })}</p>}
                  </div>

                  {activeOrder.flightInfo && (
                    <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-cyan-300" />
                        <div>
                          <p className="font-medium">{activeOrder.flightInfo.flightNumber}</p>
                          <p className="text-slate-500">{t('booking.gate', { gate: activeOrder.flightInfo.gate })}</p>
                        </div>
                      </div>
                      <FlightBadge status={activeOrder.flightInfo.status} />
                    </div>
                  )}

                  <div className="h-44 overflow-hidden rounded-xl">
                    <RouteMapView order={activeOrder} />
                  </div>

                  {(activeOrder.status === 'EN_ROUTE_TO_PICKUP' || activeOrder.status === 'IN_TRANSIT') && (
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          {activeOrder.status === 'EN_ROUTE_TO_PICKUP' ? t('driver.drivingToPickup') : t('driver.drivingToDest')}
                        </span>
                        <span>{t('driver.kmEta', { km: remainingKm.toFixed(1), eta: ticksToMinutesLabel(remainingTicks, lang) })}</span>
                      </div>
                      <ProgressBar progress={activeOrder.legProgress} tone={activeOrder.status === 'IN_TRANSIT' ? 'amber' : 'cyan'} />
                    </div>
                  )}

                  <ActionButton order={activeOrder} onStart={() => startTrip(activeOrder.id)} onPickup={() => markPickedUp(activeOrder.id)} />
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6 text-center">
                  {recentlyCompleted ? (
                    <div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260 }}
                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"
                      >
                        <CheckCircle2 className="h-9 w-9" />
                      </motion.div>
                      <p className="mt-3 font-semibold">{t('driver.tripCompleted')}</p>
                      <div className="mt-2 flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}>
                            <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                        <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
                        <span className="absolute inset-2 animate-pulse-slow rounded-full bg-cyan-400/10" />
                        <Navigation className="h-8 w-8 text-cyan-300" />
                      </div>
                      <p className="mt-3 font-semibold text-slate-200">{driver.status === 'OFFLINE' ? t('driver.youAreOffline') : t('driver.youAreAvailable')}</p>
                      <p className="mt-1 text-xs text-slate-500">{driver.status === 'OFFLINE' ? t('driver.goOnline') : t('driver.waitingDispatch')}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="glass-panel mt-4 rounded-2xl p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('driver.jobList')}</p>
          <div className="space-y-1.5">
            {todaysJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-2 text-xs">
                <span className="font-mono text-slate-300">{job.orderNo}</span>
                <span className="truncate text-slate-500">
                  {(lang === 'zh' ? job.pickup.nameZh : job.pickup.name).split(' ')[0]} → {(lang === 'zh' ? job.dropoff.nameZh : job.dropoff.name).split(' ')[0]}
                </span>
                <StatusBadge status={job.status} />
              </div>
            ))}
            {todaysJobs.length === 0 && <p className="p-3 text-center text-xs text-slate-500">{t('driver.noJobsToday')}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  order,
  onStart,
  onPickup,
}: {
  order: { status: string }
  onStart: () => void
  onPickup: () => void
}) {
  const { t } = useLang()
  if (order.status === 'ASSIGNED') {
    return (
      <Button fullWidth size="lg" onClick={onStart}>
        <Navigation className="h-4 w-4" /> {t('driver.startTrip')}
      </Button>
    )
  }
  if (order.status === 'ARRIVED_AT_PICKUP') {
    return (
      <Button fullWidth size="lg" variant="success" onClick={onPickup}>
        <CheckCircle2 className="h-4 w-4" /> {t('driver.confirmPickup')}
      </Button>
    )
  }
  if (order.status === 'EN_ROUTE_TO_PICKUP') {
    return (
      <Button fullWidth size="lg" variant="secondary" disabled>
        {t('driver.arriving')}
      </Button>
    )
  }
  if (order.status === 'IN_TRANSIT' || order.status === 'PICKED_UP') {
    return (
      <Button fullWidth size="lg" variant="secondary" disabled>
        {t('driver.enRouteDest')}
      </Button>
    )
  }
  return null
}
