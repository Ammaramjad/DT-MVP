import { useState, useMemo } from 'react'
import {
  Coins,
  Gauge,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Plane,
  Radar,
  Siren,
  Split,
  Tv2,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { FleetMapView } from '../../components/map/FleetMapView'
import { OrderQueueCard } from '../../components/control/OrderQueueCard'
import { FlightBadge } from '../../components/ui/OrderBadges'
import { Badge } from '../../components/ui/Badge'
import { formatClock, formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'
import clsx from 'clsx'

export type MultiScreenPreset = 'DUAL' | 'QUAD' | 'TRIPLE'
export type PopoutModule = 'NONE' | 'MAP' | 'QUEUE' | 'FLIGHTS' | 'TELEMATICS' | 'FINANCE'

export default function MultiScreenPanel() {
  const { t, lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const focusOrderId = useFleetStore((s) => s.focusOrderId)
  const setFocusOrder = useFleetStore((s) => s.setFocusOrder)

  const [preset, setPreset] = useState<MultiScreenPreset>('DUAL')
  const [popout, setPopout] = useState<PopoutModule>('NONE')

  const activeOrders = useMemo(
    () => orders.filter((o) => !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)),
    [orders],
  )

  const emergencyOrders = useMemo(
    () => orders.filter((o) => o.incidentReportedAt && o.emergencyStatus !== 'RESOLVED' && !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)),
    [orders],
  )

  const flightsList = useMemo(() => {
    const flightOrders = orders.filter((o) => o.flightNumber && o.flightInfo)
    const map = new Map<string, typeof flightOrders>()
    for (const fo of flightOrders) {
      const list = map.get(fo.flightNumber!) || []
      list.push(fo)
      map.set(fo.flightNumber!, list)
    }
    return Array.from(map.values()).map((group) => ({
      flightInfo: group[0].flightInfo!,
      orders: group,
    }))
  }, [orders])

  const onlineDrivers = useMemo(() => drivers.filter((d) => d.status === 'AVAILABLE' || d.status === 'BUSY' || d.status === 'BREAK'), [drivers])

  const totalSettledToday = useMemo(() => {
    return orders
      .filter((o) => o.status === 'COMPLETED')
      .slice(0, 30)
      .reduce((sum, o) => sum + o.priceEstimate, 0)
  }, [orders])

  return (
    <FleetOsPage
      title={t('fleetos.multiscreen.title')}
      subtitle={t('fleetos.multiscreen.subtitle')}
      icon={<Tv2 className="h-5 w-5 text-cyan-400" />}
      right={
        <div className="flex items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex rounded-xl border border-white/10 bg-slate-900/80 p-1 backdrop-blur-md">
            <button
              onClick={() => setPreset('DUAL')}
              data-testid="preset-dual-btn"
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                preset === 'DUAL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              <Split className="h-3.5 w-3.5" />
              {t('fleetos.multiscreen.dual')}
            </button>
            <button
              onClick={() => setPreset('QUAD')}
              data-testid="preset-quad-btn"
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                preset === 'QUAD'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {t('fleetos.multiscreen.quad')}
            </button>
            <button
              onClick={() => setPreset('TRIPLE')}
              data-testid="preset-triple-btn"
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                preset === 'TRIPLE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              {t('fleetos.multiscreen.triple')}
            </button>
          </div>
        </div>
      }
    >
      {/* Pop-out Fullscreen Modal Simulation */}
      {popout !== 'NONE' && (
        <div className="fixed inset-0 z-[999] flex flex-col bg-slate-950/95 p-4 backdrop-blur-2xl" data-testid="popout-window-modal">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-red-500" />
              <span className="flex h-3 w-3 rounded-full bg-amber-500" />
              <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
              <p className="ml-2 text-sm font-bold text-white tracking-wide">
                {popout === 'MAP' && t('fleetos.multiscreen.popoutMap')}
                {popout === 'QUEUE' && t('fleetos.multiscreen.popoutQueue')}
                {popout === 'FLIGHTS' && t('fleetos.multiscreen.popoutFlights')}
                {popout === 'TELEMATICS' && t('fleetos.multiscreen.popoutTelematics')}
                {popout === 'FINANCE' && t('fleetos.multiscreen.popoutFinance')}
              </p>
            </div>
            <button
              onClick={() => setPopout('NONE')}
              data-testid="close-popout-btn"
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              {t('fleetos.multiscreen.restoreGrid')}
            </button>
          </div>

          <div className="mt-4 flex-1 overflow-auto">
            {popout === 'MAP' && (
              <div className="h-full min-h-[600px] rounded-2xl overflow-hidden border border-cyan-500/30">
                <FleetMapView />
              </div>
            )}
            {popout === 'QUEUE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeOrders.map((o) => (
                  <OrderQueueCard key={o.id} order={o} focused={o.id === focusOrderId} onFocus={() => setFocusOrder(o.id)} />
                ))}
              </div>
            )}
            {popout === 'FLIGHTS' && (
              <div className="space-y-3">
                <FlightsWallTable flights={flightsList} lang={lang} />
              </div>
            )}
            {popout === 'TELEMATICS' && (
              <div className="space-y-3">
                <DriverTelematicsGrid drivers={onlineDrivers} lang={lang} t={t} />
              </div>
            )}
            {popout === 'FINANCE' && (
              <div className="space-y-3">
                <SettlementWall orders={orders} totalSettledToday={totalSettledToday} t={t} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Multi-Screen Command Bar & Status Ticker */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" data-testid="multiscreen-kpis">
        <div className="glass-panel rounded-xl p-3 border-cyan-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiMapTracking')}</p>
          <p className="text-xl font-black text-cyan-300 mt-0.5">{onlineDrivers.length} <span className="text-xs font-normal text-slate-400">GPS Units</span></p>
        </div>
        <div className="glass-panel rounded-xl p-3 border-purple-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiActiveQueue')}</p>
          <p className="text-xl font-black text-purple-300 mt-0.5">{activeOrders.length} <span className="text-xs font-normal text-slate-400">Rides</span></p>
        </div>
        <div className="glass-panel rounded-xl p-3 border-amber-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiFlightRadar')}</p>
          <p className="text-xl font-black text-amber-300 mt-0.5">{flightsList.length} <span className="text-xs font-normal text-slate-400">Flights</span></p>
        </div>
        <div className="glass-panel rounded-xl p-3 border-emerald-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiFatigueCompliance')}</p>
          <p className="text-xl font-black text-emerald-300 mt-0.5">99.4% <span className="text-xs font-normal text-slate-400">HoS Safe</span></p>
        </div>
        <div className="glass-panel rounded-xl p-3 border-rose-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiEmergency')}</p>
          <p className="text-xl font-black text-rose-400 mt-0.5">{emergencyOrders.length} <span className="text-xs font-normal text-slate-400">Active SOS</span></p>
        </div>
        <div className="glass-panel rounded-xl p-3 border-blue-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiSettlementDay')}</p>
          <p className="text-xl font-black text-blue-300 mt-0.5">{formatTWD(totalSettledToday)}</p>
        </div>
      </div>

      {/* Preset 1: DUAL MONITOR (Left Screen = Live Cyber Map & Telematics, Right Screen = Queue & Incident Wall) */}
      {preset === 'DUAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="dual-screen-layout">
          {/* SCREEN 1: Live Taiwan Cyber Map & Fleet Telematics */}
          <div className="glass-panel rounded-2xl p-4 border border-cyan-500/30 flex flex-col min-h-[620px] relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {t('fleetos.multiscreen.screen1Title')} · <span className="text-slate-400 font-medium">{t('fleetos.multiscreen.screen1Subtitle')}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPopout('MAP')}
                  data-testid="popout-map-btn"
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                  title={t('fleetos.multiscreen.maximize')}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 rounded-xl overflow-hidden border border-white/10 relative min-h-[360px]">
              <FleetMapView />
            </div>

            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>{t('fleetos.multiscreen.telematicsStrip')}</span>
                <span className="text-[10px] text-cyan-400 font-mono">100Hz TELEMETRY STREAM</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
                  <p className="text-[10px] text-slate-400 font-medium">{t('fleetos.multiscreen.idleRate')}</p>
                  <p className="text-sm font-bold text-emerald-300">12%</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
                  <p className="text-[10px] text-slate-400 font-medium">{t('fleetos.multiscreen.avgSpeed')}</p>
                  <p className="text-sm font-bold text-cyan-300">54 km/h</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
                  <p className="text-[10px] text-slate-400 font-medium">{t('fleetos.multiscreen.fatigueAlerts')}</p>
                  <p className="text-sm font-bold text-amber-300">0 critical</p>
                </div>
              </div>
            </div>
          </div>

          {/* SCREEN 2: Real-Time Dispatch Queue & Incident Wall */}
          <div className="glass-panel rounded-2xl p-4 border border-purple-500/30 flex flex-col min-h-[620px] relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  {t('fleetos.multiscreen.screen2Title')} · <span className="text-slate-400 font-medium">{t('fleetos.multiscreen.screen2Subtitle')}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPopout('QUEUE')}
                  data-testid="popout-queue-btn"
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                  title={t('fleetos.multiscreen.maximize')}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Emergency Alerts Strip if any */}
            {emergencyOrders.length > 0 && (
              <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs mb-1">
                  <Siren className="h-4 w-4 animate-spin-slow text-rose-400" />
                  {t('fleetos.multiscreen.emergencyActiveCount', { n: emergencyOrders.length })}
                </div>
                {emergencyOrders.map((eo) => (
                  <p key={eo.id} className="text-[11px] text-rose-200 truncate">
                    {eo.orderNo} · {eo.incidentType} · {eo.incidentDetails?.note || 'Incident logged'}
                  </p>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2.5 pr-1" data-testid="multiscreen-order-stream">
              {activeOrders.slice(0, 12).map((o) => (
                <OrderQueueCard key={o.id} order={o} focused={o.id === focusOrderId} onFocus={() => setFocusOrder(o.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preset 2: QUAD COMMAND WALL (A: Map, B: Flights, C: Fatigue/Telematics, D: Financial Stream) */}
      {preset === 'QUAD' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="quad-screen-layout">
          {/* QUAD A: Fullscreen Live Map with Route Tracks */}
          <div className="glass-panel rounded-2xl p-4 border border-cyan-500/30 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-cyan-400" />
                <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">{t('fleetos.multiscreen.quadMap')}</p>
              </div>
              <button onClick={() => setPopout('MAP')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-white/10 min-h-[300px]">
              <FleetMapView />
            </div>
          </div>

          {/* QUAD B: Flight Status Board with Delays & Linked Fleet */}
          <div className="glass-panel rounded-2xl p-4 border border-amber-500/30 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">{t('fleetos.multiscreen.quadFlights')}</p>
              </div>
              <button onClick={() => setPopout('FLIGHTS')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px]">
              <FlightsWallTable flights={flightsList} lang={lang} />
            </div>
          </div>

          {/* QUAD C: Driver Availability & Fatigue Telematics Wall */}
          <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-emerald-400" />
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">{t('fleetos.multiscreen.quadTelematics')}</p>
              </div>
              <button onClick={() => setPopout('TELEMATICS')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px]">
              <DriverTelematicsGrid drivers={onlineDrivers} lang={lang} t={t} />
            </div>
          </div>

          {/* QUAD D: Active Order Stream & Financial Settlement */}
          <div className="glass-panel rounded-2xl p-4 border border-blue-500/30 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-blue-400" />
                <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">{t('fleetos.multiscreen.quadFinance')}</p>
              </div>
              <button onClick={() => setPopout('FINANCE')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px]">
              <SettlementWall orders={orders} totalSettledToday={totalSettledToday} t={t} />
            </div>
          </div>
        </div>
      )}

      {/* Preset 3: TRIPLE DISPLAY (Split 3: Main Map 50%, Top Right Flights 25%, Bottom Right Telematics 25%) */}
      {preset === 'TRIPLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" data-testid="triple-screen-layout">
          <div className="lg:col-span-7 glass-panel rounded-2xl p-4 border border-cyan-500/30 flex flex-col min-h-[620px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">{t('fleetos.multiscreen.quadMap')}</p>
              <button onClick={() => setPopout('MAP')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-white/10">
              <FleetMapView />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel rounded-2xl p-4 border border-amber-500/30 flex flex-col h-[300px]">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">{t('fleetos.multiscreen.quadFlights')}</p>
                <button onClick={() => setPopout('FLIGHTS')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <FlightsWallTable flights={flightsList} lang={lang} />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 flex flex-col h-[304px]">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">{t('fleetos.multiscreen.quadTelematics')}</p>
                <button onClick={() => setPopout('TELEMATICS')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <DriverTelematicsGrid drivers={onlineDrivers} lang={lang} t={t} />
              </div>
            </div>
          </div>
        </div>
      )}
    </FleetOsPage>
  )
}

function FlightsWallTable({ flights, lang }: { flights: { flightInfo: any; orders: any[] }[]; lang: 'en' | 'zh' }) {
  if (flights.length === 0) {
    return <p className="text-center py-6 text-xs text-slate-500">No linked airport flights currently active</p>
  }
  return (
    <div className="space-y-1.5" data-testid="flights-wall-table">
      {flights.map(({ flightInfo, orders }) => (
        <div key={flightInfo.flightNumber} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-2 border border-white/5">
          <div className="flex items-center gap-2">
            <FlightBadge status={flightInfo.status} />
            <div>
              <p className="text-xs font-bold text-white">{flightInfo.flightNumber} · {flightInfo.airline} · Gate {flightInfo.gate}</p>
              <p className="text-[10px] text-slate-400">
                Sched: {formatClock(flightInfo.scheduledTime, lang)} · Est: {formatClock(flightInfo.estimatedTime, lang)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge tone={flightInfo.status === 'DELAYED' ? 'amber' : flightInfo.status === 'DIVERTED' ? 'red' : 'green'}>
              {flightInfo.status}
            </Badge>
            <p className="text-[10px] text-cyan-300 mt-0.5">{orders.length} linked orders</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function DriverTelematicsGrid({ drivers, lang, t }: { drivers: any[]; lang: 'en' | 'zh'; t: any }) {
  return (
    <div className="space-y-1.5" data-testid="driver-telematics-wall">
      {drivers.slice(0, 10).map((d) => {
        const serviceMin = d.serviceMinutesToday || 120
        const hoursRemaining = Math.max(0, (420 - serviceMin) / 60).toFixed(1)
        const isFatigued = serviceMin >= 360
        return (
          <div key={d.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-2 border border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-base">{d.avatarEmoji}</span>
              <div>
                <p className="text-xs font-bold text-slate-200">{lang === 'zh' ? d.nameZh : d.name}</p>
                <p className="text-[10px] text-slate-400">
                  {d.currentZone} · ⭐ {d.rating.toFixed(1)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge tone={d.status === 'AVAILABLE' ? 'green' : d.status === 'BREAK' ? 'purple' : 'amber'}>
                {t(`driverStatus.${d.status}`)}
              </Badge>
              <p className={clsx('text-[10px] mt-0.5 font-medium', isFatigued ? 'text-amber-400 font-bold' : 'text-slate-400')}>
                HoS: {hoursRemaining}h left
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SettlementWall({ orders, totalSettledToday, t }: { orders: any[]; totalSettledToday: number; t: any }) {
  const completed = orders.filter((o) => o.status === 'COMPLETED').slice(0, 8)
  return (
    <div className="space-y-2" data-testid="settlement-wall">
      <div className="rounded-xl bg-gradient-to-r from-blue-950/60 to-cyan-950/60 p-2.5 border border-blue-400/20 flex items-center justify-between">
        <span className="text-xs text-blue-200 font-semibold">{t('fleetos.multiscreen.todaySettlementGross')}</span>
        <span className="text-sm font-black text-cyan-300">{formatTWD(totalSettledToday)}</span>
      </div>
      <div className="space-y-1.5">
        {completed.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-2 border border-white/5 text-xs">
            <div>
              <p className="font-bold text-slate-200">{o.orderNo} · {o.customer.name}</p>
              <p className="text-[10px] text-slate-400">{o.pickup.nameZh || o.pickup.name} → {o.dropoff.nameZh || o.dropoff.name}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-emerald-400">+{formatTWD(o.priceEstimate)}</p>
              <p className="text-[10px] text-slate-500">{o.paymentMethod.toUpperCase()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
