import { useEffect, useState, useMemo } from 'react'
import {
  Maximize2,
  Minimize2,
  Plane,
  Search,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FlightBadge } from '../../components/ui/OrderBadges'
import { formatClock } from '../../lib/format'
import { useLang } from '../../i18n'
import { multiScreenBus } from '../../lib/multiScreenSync'
import clsx from 'clsx'

export default function ScreenFlightsWall() {
  const { lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const [selectedAirport, setSelectedAirport] = useState<'ALL' | 'TPE' | 'TSA' | 'RMQ' | 'KHH'>('ALL')
  const [query, setQuery] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    multiScreenBus.init()
    return () => multiScreenBus.close()
  }, [])

  const flightsList = useMemo(() => {
    const flightOrders = orders.filter((o) => o.flightNumber && o.flightInfo)
    const map = new Map<string, typeof flightOrders>()
    for (const fo of flightOrders) {
      const list = map.get(fo.flightNumber!) || []
      list.push(fo)
      map.set(fo.flightNumber!, list)
    }
    let list = Array.from(map.values()).map((group) => ({
      flightInfo: group[0].flightInfo!,
      orders: group,
    }))

    if (selectedAirport !== 'ALL') {
      list = list.filter((f) => {
        const order = f.orders[0]
        const loc = order?.pickup?.isAirport ? order.pickup : order?.dropoff
        return loc?.id?.toUpperCase().includes(selectedAirport)
      })
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (f) =>
          f.flightInfo.flightNumber.toLowerCase().includes(q) ||
          f.flightInfo.airline.toLowerCase().includes(q),
      )
    }
    return list
  }, [orders, selectedAirport, query])

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
    <div className="flex h-screen w-screen flex-col bg-[#030712] text-white overflow-hidden select-none" data-testid="screen-flights-wall">
      {/* HUD Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-amber-500/30 bg-slate-950/90 px-4 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Plane className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white flex items-center gap-2">
              <span>{lang === 'zh' ? '全台四大機場即時航班雷達戰情牆' : 'Taiwan Airport Flight Radar Command Wall'}</span>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-400/30">
                TPE / TSA / RMQ / KHH
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              FLIGHT RADAR ADS-B TELEMETRY · AUTOMATIC AIRPORT TRANSFER SYNC
            </p>
          </div>
        </div>

        {/* Airport filter */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search flight..."
              className="bg-transparent text-xs text-white outline-none placeholder:text-slate-500 w-36"
            />
          </div>

          <div className="flex rounded-xl border border-white/10 bg-white/5 p-0.5 text-xs">
            {(['ALL', 'TPE', 'TSA', 'RMQ', 'KHH'] as const).map((code) => (
              <button
                key={code}
                onClick={() => setSelectedAirport(code)}
                className={clsx(
                  'rounded-lg px-2.5 py-1 font-semibold transition text-[11px]',
                  selectedAirport === code
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                {code}
              </button>
            ))}
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/30 transition shadow-[0_0_10px_rgba(245,158,11,0.2)]"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* Main Flights Board Wall */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {flightsList.map(({ flightInfo, orders: linkedOrders }) => (
            <div
              key={flightInfo.flightNumber}
              className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-xl backdrop-blur-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xl font-black text-amber-300 tracking-wider">
                      {flightInfo.flightNumber}
                    </span>
                    <p className="text-xs text-slate-300 font-semibold">{flightInfo.airline}</p>
                  </div>
                  <FlightBadge status={flightInfo.status} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs rounded-xl bg-white/5 p-2.5 border border-white/5">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Airport Terminal & Gate</p>
                    <p className="font-bold text-amber-300">
                      Gate {flightInfo.gate}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Flight Status</p>
                    <p className="font-bold text-white truncate">{flightInfo.status}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Scheduled</p>
                    <p className="font-mono text-slate-300">{formatClock(flightInfo.scheduledTime, lang)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Estimated</p>
                    <p className="font-mono text-cyan-300">{formatClock(flightInfo.estimatedTime, lang)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">連動接送訂單:</span>
                <span className="font-bold text-cyan-300 font-mono">{linkedOrders.length} 件</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
