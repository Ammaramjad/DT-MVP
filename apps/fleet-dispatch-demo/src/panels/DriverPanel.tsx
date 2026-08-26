import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  Flag,
  Luggage,
  MapPin,
  Navigation,
  Phone,
  Plane,
  Power,
  ShieldAlert,
  Star,
  Users,
} from 'lucide-react'
import { useFleetStore } from '../store/useFleetStore'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { OrderTypeBadge, FlightBadge } from '../components/ui/OrderBadges'
import { RouteMapView } from '../components/map/RouteMapView'
import { DriverStatsHeader } from '../components/driver/DriverStatsHeader'
import { IncomingRequestModal } from '../components/driver/IncomingRequestModal'
import { DriverTabBar, type DriverTab } from '../components/driver/DriverTabBar'
import { EarningsScreen } from '../components/driver/EarningsScreen'
import { ActivityScreen } from '../components/driver/ActivityScreen'
import { AccountScreen } from '../components/driver/AccountScreen'
import { VehicleCard } from '../components/vehicles/VehicleCard'
import type { Order } from '../types'
import { formatClock, ticksToMinutesLabel } from '../lib/format'
import { remainingDistanceKm } from '../lib/geo'
import { useLang } from '../i18n'

const ACTIVE_STATUSES = ['ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD']

export default function DriverPanel() {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const orders = useFleetStore((s) => s.orders)
  const focusDriverId = useFleetStore((s) => s.focusDriverId)
  const setFocusDriver = useFleetStore((s) => s.setFocusDriver)
  const startTrip = useFleetStore((s) => s.startTrip)
  const verifyPickupPin = useFleetStore((s) => s.verifyPickupPin)
  const reportNoShow = useFleetStore((s) => s.reportNoShow)
  const setDriverAvailability = useFleetStore((s) => s.setDriverAvailability)

  const [tab, setTab] = useState<DriverTab>('HOME')
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)

  const activeDriverId = focusDriverId ?? drivers[0]?.id ?? null
  const driver = drivers.find((d) => d.id === activeDriverId) ?? drivers[0]
  const vehicle = vehicles.find((v) => v.id === driver?.vehicleId)

  const activeOrder = orders.find((o) => o.driverId === driver?.id && ACTIVE_STATUSES.includes(o.status))
  const incomingRequest = orders.find((o) => o.status === 'DRIVER_MATCHING' && o.pendingDriverId === driver?.id)

  const recentlyCompleted = orders.find((o) => o.id === justCompletedId && o.status === 'COMPLETED')

  useEffect(() => {
    if (!activeOrder && recentlyCompleted) {
      const timer = window.setTimeout(() => setJustCompletedId(null), 4200)
      return () => window.clearTimeout(timer)
    }
  }, [activeOrder, recentlyCompleted])

  useEffect(() => {
    if (activeOrder?.status === 'PASSENGER_ONBOARD' && activeOrder.legProgress > 0.85) {
      setJustCompletedId(activeOrder.id)
    }
  }, [activeOrder])

  useEffect(() => {
    setPinInput('')
    setPinError(false)
  }, [activeOrder?.id, activeOrder?.status])

  if (!driver) return null

  const activeLeg =
    activeOrder?.status === 'DRIVER_EN_ROUTE' || activeOrder?.status === 'ASSIGNED'
      ? activeOrder.routeToPickup
      : activeOrder?.routeToDropoff
  const remainingKm = activeLeg ? remainingDistanceKm(activeLeg, activeOrder!.legProgress) : 0
  const remainingTicks = activeLeg ? activeLeg.durationTicks * (1 - activeOrder!.legProgress) : 0

  return (
    <div className="min-h-screen bg-mission-950 bg-noise pb-24 text-white">
      {/* Standalone Driver App header — deliberately minimal, no admin/control-center
          chrome. Online/offline availability is front-and-center, Uber-driver-style. */}
      <div className="sticky top-0 z-[700] border-b border-white/10 bg-mission-950/90 px-4 py-3 backdrop-blur-xl" data-testid="driver-app-header">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">{driver.avatarEmoji}</div>
            <div>
              <p className="text-sm font-bold leading-tight text-white">{lang === 'zh' ? driver.nameZh : driver.name}</p>
              <p className="flex items-center gap-1 text-[10.5px] text-amber-300">
                <Star className="h-3 w-3 fill-amber-300" /> {driver.rating.toFixed(1)}
              </p>
            </div>
          </div>

          {(driver.status === 'AVAILABLE' || driver.status === 'OFFLINE') && (
            <button
              onClick={() => setDriverAvailability(driver.id, driver.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE')}
              data-testid="driver-online-toggle"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                driver.status === 'AVAILABLE' ? 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30' : 'bg-slate-600/25 text-slate-300 ring-1 ring-slate-500/30'
              }`}
            >
              <Power className="h-3.5 w-3.5" /> {driver.status === 'AVAILABLE' ? t('driver.online') : t('driver.offline')}
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
      </div>

      <AnimatePresence mode="wait">
        {tab === 'HOME' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto mt-4 max-w-md px-4">
            <DriverStatsHeader stats={driver.stats} />

            <div className="glass-panel mt-4 overflow-hidden rounded-[28px] shadow-2xl">
              <AnimatePresence mode="wait">
                {activeOrder ? (
                  <TripInProgress
                    key={activeOrder.id}
                    order={activeOrder}
                    remainingKm={remainingKm}
                    remainingTicks={remainingTicks}
                    onStart={() => startTrip(activeOrder.id)}
                    pinInput={pinInput}
                    onPinChange={setPinInput}
                    pinError={pinError}
                    onVerifyPin={() => {
                      const ok = verifyPickupPin(activeOrder.id, pinInput)
                      if (!ok) {
                        setPinError(true)
                        window.setTimeout(() => setPinError(false), 1600)
                      } else {
                        setPinInput('')
                      }
                    }}
                    onNoShow={() => reportNoShow(activeOrder.id)}
                  />
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 text-center">
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
                          {driver.status !== 'OFFLINE' && (
                            <>
                              <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
                              <span className="absolute inset-2 animate-pulse-slow rounded-full bg-cyan-400/10" />
                            </>
                          )}
                          <Navigation className={`h-8 w-8 ${driver.status === 'OFFLINE' ? 'text-slate-600' : 'text-cyan-300'}`} />
                        </div>
                        <p className="mt-3 font-semibold text-slate-200">{driver.status === 'OFFLINE' ? t('driver.youAreOffline') : t('driver.youAreAvailable')}</p>
                        <p className="mt-1 text-xs text-slate-500">{driver.status === 'OFFLINE' ? t('driver.goOnline') : t('driver.waitingDispatch')}</p>
                        {driver.status === 'OFFLINE' && (
                          <Button className="mt-4" onClick={() => setDriverAvailability(driver.id, 'AVAILABLE')}>
                            <Power className="h-4 w-4" /> {t('driver.goOnlineCta')}
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {vehicle && (
              <div className="mt-4">
                <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('driver.myVehicle')}</p>
                <VehicleCard type={vehicle.type} plate={vehicle.plate} size="sm" />
              </div>
            )}
          </motion.div>
        )}

        {tab === 'EARNINGS' && (
          <motion.div key="earnings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
            <EarningsScreen driver={driver} />
          </motion.div>
        )}

        {tab === 'ACTIVITY' && (
          <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
            <ActivityScreen driver={driver} orders={orders} />
          </motion.div>
        )}

        {tab === 'ACCOUNT' && (
          <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
            <AccountScreen driver={driver} drivers={drivers} vehicle={vehicle} onSwitchDriver={setFocusDriver} />
          </motion.div>
        )}
      </AnimatePresence>

      <DriverTabBar active={tab} onChange={setTab} />

      {/* Full-screen incoming-request takeover — shows above whichever tab is
          active, exactly like the real Uber Driver app. */}
      <AnimatePresence>{incomingRequest && <IncomingRequestModal key={incomingRequest.id} order={incomingRequest} />}</AnimatePresence>
    </div>
  )
}

function TripInProgress({
  order,
  remainingKm,
  remainingTicks,
  onStart,
  pinInput,
  onPinChange,
  pinError,
  onVerifyPin,
  onNoShow,
}: {
  order: Order
  remainingKm: number
  remainingTicks: number
  onStart: () => void
  pinInput: string
  onPinChange: (v: string) => void
  pinError: boolean
  onVerifyPin: () => void
  onNoShow: () => void
}) {
  const { t, lang } = useLang()
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-bold">{order.orderNo}</span>
          <OrderTypeBadge type={order.type} />
        </div>
        <div className="mt-2.5 rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Users className="h-3.5 w-3.5" /> {order.customer.name}
            <Phone className="ml-2 h-3.5 w-3.5" /> {order.customer.phone}
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            <p className="flex items-start gap-1.5 text-slate-300">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" /> {lang === 'zh' ? order.pickup.nameZh : order.pickup.name}
            </p>
            <p className="flex items-start gap-1.5 text-slate-300">
              <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-300" /> {lang === 'zh' ? order.dropoff.nameZh : order.dropoff.name}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {order.passengers}
            </span>
            <span className="flex items-center gap-1">
              <Luggage className="h-3 w-3" /> {order.luggage}
            </span>
            <span>{formatClock(order.scheduledTime, lang)}</span>
          </div>
          {order.notes && <p className="mt-2 rounded-lg bg-amber-400/10 p-2 text-[11px] text-amber-200">{t('driver.notesForDriver', { notes: order.notes })}</p>}
        </div>

        {order.flightInfo && (
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-cyan-300" />
              <div>
                <p className="font-medium">{order.flightInfo.flightNumber}</p>
                <p className="text-slate-500">{t('booking.gate', { gate: order.flightInfo.gate })}</p>
              </div>
            </div>
            <FlightBadge status={order.flightInfo.status} />
          </div>
        )}
      </div>

      {/* Turn-by-turn-style map focus: a larger, more prominent map than the
          old compact card, with the next-action button pinned directly below it. */}
      <div className="h-56 overflow-hidden">
        <RouteMapView order={order} />
      </div>

      <div className="space-y-3 p-4">
        {(order.status === 'DRIVER_EN_ROUTE' || order.status === 'PASSENGER_ONBOARD') && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {order.status === 'DRIVER_EN_ROUTE' ? t('driver.drivingToPickup') : t('driver.drivingToDest')}
              </span>
              <span>{t('driver.kmEta', { km: remainingKm.toFixed(1), eta: ticksToMinutesLabel(remainingTicks, lang) })}</span>
            </div>
            <ProgressBar progress={order.legProgress} tone={order.status === 'PASSENGER_ONBOARD' ? 'amber' : 'cyan'} />
          </div>
        )}

        {order.status === 'ARRIVED' && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5" data-testid="driver-pin-entry">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('driver.enterPickupPin')}</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={pinInput}
                onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
                data-testid="driver-pin-input"
                placeholder="\u2022\u2022\u2022\u2022"
                className={`w-full rounded-lg border bg-slate-950/60 px-3 py-2.5 text-center font-mono text-lg tracking-[0.5em] text-white outline-none ${
                  pinError ? 'border-red-400/60 ring-2 ring-red-400/30' : 'border-white/10 focus:border-cyan-400/50'
                }`}
              />
            </div>
            {pinError && <p className="mt-1.5 text-[11px] text-red-300">{t('driver.pinIncorrect')}</p>}
            <button
              onClick={onNoShow}
              data-testid="driver-report-no-show"
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-amber-300 hover:bg-amber-400/10"
            >
              <ShieldAlert className="h-3.5 w-3.5" /> {t('driver.reportNoShow')}
            </button>
          </div>
        )}

        <ActionButton status={order.status} onStart={onStart} onVerifyPin={onVerifyPin} pinReady={pinInput.length === 4} />
      </div>
    </motion.div>
  )
}

function ActionButton({
  status,
  onStart,
  onVerifyPin,
  pinReady,
}: {
  status: string
  onStart: () => void
  onVerifyPin: () => void
  pinReady: boolean
}) {
  const { t } = useLang()
  if (status === 'ASSIGNED') {
    return (
      <Button fullWidth size="lg" onClick={onStart}>
        <Navigation className="h-4 w-4" /> {t('driver.startTrip')}
      </Button>
    )
  }
  if (status === 'ARRIVED') {
    return (
      <Button fullWidth size="lg" variant="success" onClick={onVerifyPin} disabled={!pinReady} data-testid="driver-verify-pin-button">
        <CheckCircle2 className="h-4 w-4" /> {t('driver.confirmPickup')}
      </Button>
    )
  }
  if (status === 'DRIVER_EN_ROUTE') {
    return (
      <Button fullWidth size="lg" variant="secondary" disabled>
        {t('driver.arriving')}
      </Button>
    )
  }
  if (status === 'PASSENGER_ONBOARD') {
    return (
      <Button fullWidth size="lg" variant="secondary" disabled>
        {t('driver.enRouteDest')}
      </Button>
    )
  }
  return null
}
