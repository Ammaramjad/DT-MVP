import { useEffect, useState, useMemo } from 'react'
import {
  ExternalLink,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Monitor,
  Plane,
  Radar,
  ShieldAlert,
  Siren,
  Split,
  Tv2,
  Users2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { FleetMapView } from '../../components/map/FleetMapView'
import { OrderQueueCard } from '../../components/control/OrderQueueCard'
import { FlightBadge } from '../../components/ui/OrderBadges'
import { Badge } from '../../components/ui/Badge'
import { formatClock, formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'
import { multiScreenBus } from '../../lib/multiScreenSync'
import clsx from 'clsx'

export type MultiScreenPreset = 'DUAL' | 'QUAD' | 'TRIPLE' | 'SPLIT_2X1'
export type PopoutModule = 'NONE' | 'MAP' | 'QUEUE' | 'FLIGHTS' | 'TELEMATICS' | 'NOTIFICATIONS'

export default function MultiScreenPanel() {
  const { t, lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const focusOrderId = useFleetStore((s) => s.focusOrderId)
  const setFocusOrder = useFleetStore((s) => s.setFocusOrder)
  const notifications = useFleetStore((s) => s.notifications)

  const [preset, setPreset] = useState<MultiScreenPreset>('DUAL')
  const [popout, setPopout] = useState<PopoutModule>('NONE')
  const [audioChime, setAudioChime] = useState(true)

  // Initialize broadcast channel sync
  useEffect(() => {
    multiScreenBus.init()
    return () => {
      multiScreenBus.close()
    }
  }, [])

  const activeOrders = useMemo(
    () => orders.filter((o) => !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)),
    [orders],
  )

  const emergencyOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.incidentReportedAt &&
          o.emergencyStatus !== 'RESOLVED' &&
          !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status),
      ),
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

  const onlineDrivers = useMemo(
    () => drivers.filter((d) => d.status === 'AVAILABLE' || d.status === 'BUSY' || d.status === 'BREAK'),
    [drivers],
  )

  const totalSettledToday = useMemo(() => {
    return orders
      .filter((o) => o.status === 'COMPLETED')
      .slice(0, 30)
      .reduce((sum, o) => sum + o.priceEstimate, 0)
  }, [orders])

  const handleOrderSelect = (id: string) => {
    setFocusOrder(id)
    multiScreenBus.broadcast({ type: 'FOCUS_ORDER', orderId: id })
  }

  // Multi-Monitor physical window spawn helpers
  const openStandaloneScreen = (path: string, windowName: string) => {
    const w = 1280
    const h = 800
    const left = window.screen.width ? window.screen.width / 4 : 50
    const top = 50
    window.open(
      path,
      windowName,
      `width=${w},height=${h},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=no`,
    )
  }

  const launchDualMonitorWall = () => {
    openStandaloneScreen('/fleet-os/screens/map', 'WallScreen1_Map')
    setTimeout(() => {
      openStandaloneScreen('/fleet-os/screens/orders', 'WallScreen2_Orders')
    }, 400)
  }

  const launchQuadMonitorWall = () => {
    openStandaloneScreen('/fleet-os/screens/map', 'WallScreen1_Map')
    setTimeout(() => openStandaloneScreen('/fleet-os/screens/orders', 'WallScreen2_Orders'), 300)
    setTimeout(() => openStandaloneScreen('/fleet-os/screens/drivers', 'WallScreen3_Drivers'), 600)
    setTimeout(() => openStandaloneScreen('/fleet-os/screens/notifications', 'WallScreen4_Notifications'), 900)
  }

  return (
    <FleetOsPage
      title={t('fleetos.multiscreen.title')}
      subtitle={t('fleetos.multiscreen.subtitle')}
      icon={<Tv2 className="h-5 w-5 text-cyan-400" />}
      right={
        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click Multi-Monitor Physical Launcher */}
          <div className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/60 px-2 py-1 backdrop-blur-md">
            <Monitor className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold text-cyan-200">
              {lang === 'zh' ? '實體多螢幕聯播:' : 'Physical Multi-Screen:'}
            </span>
            <button
              onClick={launchDualMonitorWall}
              data-testid="launch-dual-wall-btn"
              className="rounded-lg bg-cyan-500/20 px-2 py-1 text-[10.5px] font-bold text-cyan-300 hover:bg-cyan-500/30 transition flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {lang === 'zh' ? '雙螢幕' : 'Dual'}
            </button>
            <button
              onClick={launchQuadMonitorWall}
              data-testid="launch-quad-wall-btn"
              className="rounded-lg bg-indigo-500/20 px-2 py-1 text-[10.5px] font-bold text-indigo-300 hover:bg-indigo-500/30 transition flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {lang === 'zh' ? '4螢幕戰情牆' : 'Quad Wall'}
            </button>
          </div>

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
                {popout === 'NOTIFICATIONS' && (lang === 'zh' ? '即時通報與救難戰情牆' : 'Notifications & SOS Wall')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {popout === 'MAP' && (
                <button
                  onClick={() => openStandaloneScreen('/fleet-os/screens/map', 'WallScreen_Map')}
                  className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {lang === 'zh' ? '獨立實體視窗' : 'Popout Window'}
                </button>
              )}
              {popout === 'QUEUE' && (
                <button
                  onClick={() => openStandaloneScreen('/fleet-os/screens/orders', 'WallScreen_Orders')}
                  className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {lang === 'zh' ? '獨立實體視窗' : 'Popout Window'}
                </button>
              )}
              <button
                onClick={() => setPopout('NONE')}
                data-testid="close-popout-btn"
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                {t('fleetos.multiscreen.restoreGrid')}
              </button>
            </div>
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
                  <OrderQueueCard key={o.id} order={o} focused={o.id === focusOrderId} onFocus={() => handleOrderSelect(o.id)} />
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
            {popout === 'NOTIFICATIONS' && (
              <div className="space-y-3">
                <NotificationsFeedWall notifications={notifications} emergencyOrders={emergencyOrders} lang={lang} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Multi-Screen Command Bar & Status Ticker */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" data-testid="multiscreen-kpis">
        <div className="glass-panel rounded-xl p-3 border-cyan-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiMapTracking')}</p>
          <p className="text-xl font-black text-cyan-300 mt-0.5">
            {onlineDrivers.length} <span className="text-xs font-normal text-slate-400">GPS Units</span>
          </p>
        </div>
        <div className="glass-panel rounded-xl p-3 border-purple-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiActiveQueue')}</p>
          <p className="text-xl font-black text-purple-300 mt-0.5">
            {activeOrders.length} <span className="text-xs font-normal text-slate-400">Rides</span>
          </p>
        </div>
        <div className="glass-panel rounded-xl p-3 border-amber-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiFlightRadar')}</p>
          <p className="text-xl font-black text-amber-300 mt-0.5">
            {flightsList.length} <span className="text-xs font-normal text-slate-400">Flights</span>
          </p>
        </div>
        <div className="glass-panel rounded-xl p-3 border-emerald-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiFatigueCompliance')}</p>
          <p className="text-xl font-black text-emerald-300 mt-0.5">
            99.4% <span className="text-xs font-normal text-slate-400">HoS Safe</span>
          </p>
        </div>
        <div className="glass-panel rounded-xl p-3 border-rose-500/20">
          <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">{t('fleetos.multiscreen.kpiEmergency')}</p>
          <p className="text-xl font-black text-rose-400 mt-0.5">
            {emergencyOrders.length} <span className="text-xs font-normal text-slate-400">Active SOS</span>
          </p>
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
                  onClick={() => openStandaloneScreen('/fleet-os/screens/map', 'WallScreen1_Map')}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 transition"
                  title={lang === 'zh' ? '以獨立實體視窗開啟' : 'Pop out physical window'}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {onlineDrivers.slice(0, 4).map((d) => (
                  <div key={d.id} className="rounded-xl bg-white/[0.03] p-2 border border-white/5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{lang === 'zh' ? d.nameZh : d.name}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">GPS OK</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{d.currentZone || 'Taipei Metro'}</p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>⭐ {d.rating.toFixed(1)}</span>
                      <span>{d.completedTrips} trips</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SCREEN 2: Live Dispatch Queue & Incident Wall */}
          <div className="glass-panel rounded-2xl p-4 border border-purple-500/30 flex flex-col min-h-[620px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  {t('fleetos.multiscreen.screen2Title')} · <span className="text-slate-400 font-medium">{t('fleetos.multiscreen.screen2Subtitle')}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openStandaloneScreen('/fleet-os/screens/orders', 'WallScreen2_Orders')}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 transition"
                  title={lang === 'zh' ? '以獨立實體視窗開啟' : 'Pop out physical window'}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
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

            {/* High Severity Incident Banner if Any */}
            {emergencyOrders.length > 0 && (
              <div className="mb-3 rounded-xl border border-rose-500/50 bg-rose-950/40 p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Siren className="h-4 w-4 text-rose-400 animate-pulse" />
                  <span className="text-xs font-bold text-rose-200">
                    {lang === 'zh'
                      ? `重大警報：${emergencyOrders.length} 件救援/異常事件即時監控中`
                      : `Critical Alert: ${emergencyOrders.length} SOS Incidents Active`}
                  </span>
                </div>
                <span className="rounded bg-rose-500 px-2 py-0.5 text-[10px] font-mono font-bold text-white">RESCUE DISPATCHED</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[520px]">
              {activeOrders.map((order) => (
                <OrderQueueCard
                  key={order.id}
                  order={order}
                  focused={order.id === focusOrderId}
                  onFocus={() => handleOrderSelect(order.id)}
                />
              ))}
              {activeOrders.length === 0 && (
                <p className="text-center py-12 text-xs text-slate-500">{t('control.noOrders')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preset 2: QUAD MONITOR (4 Wall Screens: A=Map, B=Flights Radar, C=Driver Telematics, D=Notifications/SOS) */}
      {preset === 'QUAD' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="quad-screen-layout">
          {/* QUAD A: Cyber Map */}
          <div className="glass-panel rounded-2xl p-4 border border-cyan-500/30 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-cyan-400" />
                <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">{t('fleetos.multiscreen.quadMap')}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openStandaloneScreen('/fleet-os/screens/map', 'WallScreen1_Map')} className="p-1 rounded-lg bg-white/5 text-cyan-300">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setPopout('MAP')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-white/10 min-h-[280px]">
              <FleetMapView />
            </div>
          </div>

          {/* QUAD B: Airport Flight Radar */}
          <div className="glass-panel rounded-2xl p-4 border border-amber-500/30 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">{t('fleetos.multiscreen.quadFlights')}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openStandaloneScreen('/fleet-os/screens/flights', 'WallScreen_Flights')} className="p-1 rounded-lg bg-white/5 text-amber-300">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setPopout('FLIGHTS')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px]">
              <FlightsWallTable flights={flightsList} lang={lang} />
            </div>
          </div>

          {/* QUAD C: Driver Availability & Fatigue Telematics Wall */}
          <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-emerald-400" />
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">{t('fleetos.multiscreen.quadTelematics')}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openStandaloneScreen('/fleet-os/screens/drivers', 'WallScreen3_Drivers')} className="p-1 rounded-lg bg-white/5 text-emerald-300">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setPopout('TELEMATICS')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px]">
              <DriverTelematicsGrid drivers={onlineDrivers} lang={lang} t={t} />
            </div>
          </div>

          {/* QUAD D: Notifications, Emergency & SOS Feed Wall */}
          <div className="glass-panel rounded-2xl p-4 border border-rose-500/30 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-rose-400 animate-pulse" />
                <p className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                  {lang === 'zh' ? '即時通報與 SOS 戰情' : 'Notifications & SOS Feed'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAudioChime(!audioChime)}
                  className="p-1 rounded-lg bg-white/5 text-slate-300 hover:text-white"
                  title={audioChime ? 'Mute Chime' : 'Enable Chime'}
                >
                  {audioChime ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
                </button>
                <button onClick={() => openStandaloneScreen('/fleet-os/screens/notifications', 'WallScreen4_Notifications')} className="p-1 rounded-lg bg-white/5 text-rose-300">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setPopout('NOTIFICATIONS')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px]">
              <NotificationsFeedWall notifications={notifications} emergencyOrders={emergencyOrders} lang={lang} />
            </div>
          </div>
        </div>
      )}

      {/* Preset 3: TRIPLE DISPLAY */}
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
              <p className="text-xs font-bold text-white">
                {flightInfo.flightNumber} · {flightInfo.airline} · Gate {flightInfo.gate}
              </p>
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

function NotificationsFeedWall({
  notifications,
  emergencyOrders,
  lang,
}: {
  notifications: any[]
  emergencyOrders: any[]
  lang: 'en' | 'zh'
}) {
  return (
    <div className="space-y-2" data-testid="notifications-wall">
      {emergencyOrders.length > 0 && (
        <div className="rounded-xl border border-rose-500 bg-rose-950/60 p-2.5">
          <p className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            {lang === 'zh' ? '緊急求援事件清單' : 'Active SOS Incidents'}
          </p>
          <div className="mt-1.5 space-y-1">
            {emergencyOrders.map((em) => (
              <div key={em.id} className="flex items-center justify-between text-xs bg-rose-900/40 p-1.5 rounded-lg">
                <span className="font-mono font-bold text-white">{em.orderNo}</span>
                <span className="text-rose-200">{em.customer.name}</span>
                <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded font-bold">
                  {em.emergencyStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {notifications.slice(0, 10).map((n) => (
          <div
            key={n.id}
            className={clsx(
              'rounded-xl p-2 border text-xs flex items-start justify-between gap-2',
              n.kind === 'CRITICAL' || n.kind === 'ERROR'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : n.kind === 'WARNING'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-white/[0.03] border-white/5 text-slate-200',
            )}
          >
            <div>
              <p className="font-bold">{n.titleKey}</p>
              <p className="text-[10.5px] text-slate-400 mt-0.5">{n.messageKey}</p>
            </div>
            <span className="text-[9.5px] text-slate-500 shrink-0">{new Date(n.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
