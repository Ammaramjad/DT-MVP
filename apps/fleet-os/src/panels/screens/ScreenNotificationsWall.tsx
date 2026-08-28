import { useEffect, useState, useMemo } from 'react'
import {
  Bell,
  Maximize2,
  Minimize2,
  Siren,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import { multiScreenBus } from '../../lib/multiScreenSync'
import clsx from 'clsx'

export default function ScreenNotificationsWall() {
  const { lang } = useLang()
  const notifications = useFleetStore((s) => s.notifications)
  const orders = useFleetStore((s) => s.orders)
  const [audioChime, setAudioChime] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    multiScreenBus.init()
    return () => multiScreenBus.close()
  }, [])

  const emergencyOrders = useMemo(
    () => orders.filter((o) => o.incidentReportedAt && o.emergencyStatus !== 'RESOLVED'),
    [orders],
  )

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
    <div className="flex h-screen w-screen flex-col bg-[#030712] text-white overflow-hidden select-none" data-testid="screen-notifications-wall">
      {/* HUD Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-rose-500/30 bg-slate-950/90 px-4 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            <Siren className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white flex items-center gap-2">
              <span>{lang === 'zh' ? '螢幕 4：即時警報、SOS 救援與推播戰情牆' : 'Screen 4: Real-Time Notifications & SOS Emergency Feed'}</span>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-300 border border-rose-400/30">
                CRITICAL DISPATCH
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              AUDIO CHIME {audioChime ? 'ENABLED' : 'MUTED'} · EMERGENCY PROTOCOL ACTIVE
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAudioChime(!audioChime)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            {audioChime ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            <span>{audioChime ? 'Audio Alert On' : 'Muted'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-xl bg-rose-500/20 border border-rose-400/30 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30 transition shadow-[0_0_10px_rgba(244,63,94,0.2)]"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* Feed Wall Canvas */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Active Emergencies Banner Section */}
        {emergencyOrders.length > 0 && (
          <div className="rounded-3xl border-2 border-rose-500 bg-rose-950/70 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Siren className="h-5 w-5 text-rose-400 animate-pulse" />
                <span className="font-bold text-sm text-rose-200 uppercase tracking-wider">
                  {lang === 'zh' ? '即時重大事故與救援指令 (ACTIVE SOS RESCUE)' : 'ACTIVE SOS RESCUE & ESCALATION'}
                </span>
              </div>
              <span className="rounded-full bg-rose-500 px-3 py-0.5 text-xs font-mono font-black text-white">
                {emergencyOrders.length} CASES
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {emergencyOrders.map((em) => (
                <div key={em.id} className="rounded-2xl border border-rose-500/60 bg-rose-900/40 p-3.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-white text-base">{em.orderNo}</span>
                    <span className="rounded bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                      {em.emergencyStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-rose-200">
                    {em.customer.name} ({em.customer.phone})
                  </p>
                  <p className="text-[11px] text-rose-300/80 mt-1">
                    {em.pickup.nameZh || em.pickup.name} → {em.dropoff.nameZh || em.dropoff.name}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-rose-500/30 flex items-center justify-between text-[10px] text-rose-300">
                    <span>Incident: {em.incidentType || 'ROAD_EMERGENCY'}</span>
                    <span className="font-mono">+{Math.floor((Date.now() - (em.incidentReportedAt || Date.now())) / 1000)}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chronological Stream of Push Notifications */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-xl backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-cyan-400" />
            <span>{lang === 'zh' ? '全系統推播廣播歷史隊列' : 'Global Dispatch Broadcast Log'}</span>
          </p>

          <div className="space-y-2">
            {notifications.map((n) => {
              const isDanger = n.kind === 'ERROR'
              const isWarn = n.kind === 'WARNING'
              return (
                <div
                  key={n.id}
                  className={clsx(
                    'rounded-2xl p-3 border transition flex items-start justify-between gap-4',
                    isDanger
                      ? 'border-rose-500/50 bg-rose-950/30 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                      : isWarn
                        ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                        : 'border-white/5 bg-white/[0.02] text-slate-200 hover:border-white/15',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={clsx(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
                        isDanger
                          ? 'bg-rose-500/20 text-rose-400'
                          : isWarn
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-cyan-500/15 text-cyan-400',
                      )}
                    >
                      {isDanger ? <Siren className="h-4 w-4 animate-pulse" /> : <Bell className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <p className="font-bold text-xs">{n.titleKey}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{n.messageKey}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0">
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
