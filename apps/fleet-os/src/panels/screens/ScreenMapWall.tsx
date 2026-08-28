import { useEffect, useState } from 'react'
import { Activity, Car, Maximize2, Minimize2, Radio, ShieldAlert } from 'lucide-react'
import { FleetMapView } from '../../components/map/FleetMapView'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import { multiScreenBus } from '../../lib/multiScreenSync'

export default function ScreenMapWall() {
  const { lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const orders = useFleetStore((s) => s.orders)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    multiScreenBus.init()
    return () => multiScreenBus.close()
  }, [])

  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status))
  const emergencyOrders = orders.filter((o) => o.incidentReportedAt && o.emergencyStatus !== 'RESOLVED')

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
    <div className="flex h-screen w-screen flex-col bg-[#030712] text-white overflow-hidden select-none" data-testid="screen-map-wall">
      {/* HUD Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-cyan-500/30 bg-slate-950/90 px-4 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white flex items-center gap-2">
              <span>{lang === 'zh' ? '螢幕 1：即時全台車隊地圖戰情牆' : 'Screen 1: Live Taiwan Fleet Cartography Wall'}</span>
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-400/30">
                100Hz LIVE HUD
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              GPS LATENCY &lt;12ms · RESOLUTION 4K · BROADCAST CHANNEL ACTIVE
            </p>
          </div>
        </div>

        {/* Telemetry Stat Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1 border border-white/10 text-xs">
            <Car className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">Online Fleet:</span>
            <span className="font-mono font-bold text-cyan-300">{drivers.length} Units</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1 border border-white/10 text-xs">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400">Active Rides:</span>
            <span className="font-mono font-bold text-emerald-300">{activeOrders.length}</span>
          </div>

          {emergencyOrders.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-rose-500/20 px-3 py-1 border border-rose-500/50 text-xs font-bold text-rose-300 animate-pulse">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              <span>{emergencyOrders.length} SOS ACTIVE</span>
            </div>
          )}

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/30 transition shadow-[0_0_10px_rgba(34,211,238,0.2)]"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* Main Fullscreen Map Canvas with Telemetry HUD Overlay */}
      <main className="relative flex-1 w-full h-full p-2">
        <FleetMapView height="100%" />

        {/* Floating Cyber Telemetry Widget */}
        <div className="absolute bottom-4 left-4 z-[400] flex flex-col gap-2 pointer-events-none">
          <div className="pointer-events-auto rounded-2xl border border-white/15 bg-slate-950/85 p-3.5 backdrop-blur-xl shadow-2xl max-w-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between">
              <span>{lang === 'zh' ? '即時地圖遙測總覽' : 'Fleet Telemetry HUD'}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </p>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">直營車隊 (Owned):</span>
                <span className="font-mono font-bold text-cyan-300">
                  {drivers.filter((d) => d.tier === 'OWNED_FLEET').length} 輛
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">加盟司機 (Member):</span>
                <span className="font-mono font-bold text-purple-300">
                  {drivers.filter((d) => d.tier === 'PAID_MEMBER').length} 輛
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">同業合作 (Contractor):</span>
                <span className="font-mono font-bold text-amber-300">
                  {drivers.filter((d) => d.tier === 'OUTSIDE_CONTRACTOR').length} 輛
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
