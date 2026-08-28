import { useEffect, useState, useMemo } from 'react'
import {
  Gauge,
  Maximize2,
  Minimize2,
  Search,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { Badge } from '../../components/ui/Badge'
import { useLang } from '../../i18n'
import { multiScreenBus } from '../../lib/multiScreenSync'
import clsx from 'clsx'

export default function ScreenDriversWall() {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const orders = useFleetStore((s) => s.orders)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'BUSY' | 'BREAK' | 'FATIGUE'>('ALL')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const vehicleByDriverId = useMemo(() => {
    const map = new Map<string, (typeof vehicles)[0]>()
    for (const v of vehicles) {
      if (v.driverId) map.set(v.driverId, v)
    }
    return map
  }, [vehicles])

  useEffect(() => {
    multiScreenBus.init()
    return () => multiScreenBus.close()
  }, [])

  const filteredDrivers = useMemo(() => {
    let list = drivers
    if (statusFilter === 'AVAILABLE') {
      list = list.filter((d) => d.status === 'AVAILABLE')
    } else if (statusFilter === 'BUSY') {
      list = list.filter((d) => d.status === 'BUSY')
    } else if (statusFilter === 'BREAK') {
      list = list.filter((d) => d.status === 'BREAK')
    } else if (statusFilter === 'FATIGUE') {
      list = list.filter((d) => (d.serviceMinutesToday || 0) >= 360)
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((d) => {
        const v = vehicleByDriverId.get(d.id)
        return (
          d.name.toLowerCase().includes(q) ||
          d.nameZh.includes(q) ||
          (v && v.plate.toLowerCase().includes(q)) ||
          (v && v.category.toLowerCase().includes(q))
        )
      })
    }
    return list
  }, [drivers, statusFilter, query, vehicleByDriverId])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#030712] text-white overflow-hidden select-none" data-testid="screen-drivers-wall">
      {/* HUD Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-emerald-500/30 bg-slate-950/90 px-4 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Gauge className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white flex items-center gap-2">
              <span>{lang === 'zh' ? '螢幕 3：司機遙測、班表與工時疲勞牆' : 'Screen 3: Driver Telematics, Roster & HoS Fatigue Wall'}</span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-400/30">
                TELEMATICS HUD
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              OBD-II LIVE TELEMETRY · TAIWAN MOTC HOS COMPLIANCE MONITOR
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'zh' ? '搜尋司機/車牌/車型…' : 'Search driver…'}
              className="bg-transparent text-xs text-white outline-none placeholder:text-slate-500 w-44"
            />
          </div>

          <div className="flex rounded-xl border border-white/10 bg-white/5 p-0.5 text-xs">
            {(['ALL', 'AVAILABLE', 'BUSY', 'BREAK', 'FATIGUE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'rounded-lg px-2.5 py-1 font-semibold transition text-[11px]',
                  statusFilter === s
                    ? s === 'FATIGUE'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 transition shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* Driver Telemetry Cards Grid */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredDrivers.map((driver) => {
            const currentOrder = orders.find(
              (o) => o.driverId === driver.id && !['COMPLETED', 'CANCELLED'].includes(o.status),
            )
            const vehicle = vehicleByDriverId.get(driver.id)
            const serviceMin = driver.serviceMinutesToday || 140
            const maxMin = 480 // 8 hours legal max continuous driving
            const progressPct = Math.min(100, Math.round((serviceMin / maxMin) * 100))
            const isWarning = progressPct >= 75
            const isDanger = progressPct >= 90

            return (
              <div
                key={driver.id}
                className={clsx(
                  'rounded-2xl border p-3.5 transition backdrop-blur-xl relative flex flex-col justify-between',
                  isDanger
                    ? 'border-rose-500/60 bg-rose-950/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                    : isWarning
                      ? 'border-amber-500/50 bg-amber-950/20'
                      : 'border-white/10 bg-slate-950/70 hover:border-white/20',
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{driver.avatarEmoji}</span>
                      <div>
                        <p className="font-bold text-white text-sm">
                          {lang === 'zh' ? driver.nameZh : driver.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {vehicle ? `${vehicle.plate} · ${vehicle.category}` : driver.phone}
                        </p>
                      </div>
                    </div>
                    <Badge
                      tone={
                        driver.status === 'AVAILABLE'
                          ? 'green'
                          : driver.status === 'BUSY'
                            ? 'amber'
                            : driver.status === 'BREAK'
                              ? 'purple'
                              : 'slate'
                      }
                    >
                      {t(`driverStatus.${driver.status}`)}
                    </Badge>
                  </div>

                  {/* HoS Hours of Service Bar */}
                  <div className="mt-3 rounded-xl bg-white/5 p-2.5 border border-white/5">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-400 font-medium">勞基法工時 HoS (8hr Max)</span>
                      <span
                        className={clsx(
                          'font-mono font-bold',
                          isDanger ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400',
                        )}
                      >
                        {(serviceMin / 60).toFixed(1)}h / 8.0h ({progressPct}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={clsx(
                          'h-full transition-all duration-500 rounded-full',
                          isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400',
                        )}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Active Ride Info if Busy */}
                  {currentOrder ? (
                    <div className="mt-2.5 rounded-xl bg-cyan-950/40 p-2 border border-cyan-500/20 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-cyan-300">{currentOrder.orderNo}</span>
                        <span className="text-cyan-400 font-semibold">{currentOrder.status}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {currentOrder.pickup.nameZh || currentOrder.pickup.name} → {currentOrder.dropoff.nameZh || currentOrder.dropoff.name}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2.5 text-[11px] text-slate-500 flex items-center justify-between px-1">
                      <span>區域: {driver.currentZone || 'Taipei Metro'}</span>
                      <span>評分: ⭐ {driver.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>完趟數: {driver.completedTrips}</span>
                  <span className="font-mono text-emerald-400">NT${(driver.walletBalance || 0).toLocaleString()}</span>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
