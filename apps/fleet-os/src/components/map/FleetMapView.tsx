import { useMemo, useState } from 'react'
import { AlertOctagon, Maximize2, Minimize2 } from 'lucide-react'
import { useMapHealthCheck } from '../../hooks/useMapHealthCheck'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import { FleetMap } from './FleetMap'
import { FleetMapFallback } from './FleetMapFallback'
import { DriverTaskPanel } from './DriverTaskPanel'
import type { DriverTier } from '../../types'

const TIER_LEGEND: { tier: DriverTier; color: string }[] = [
  { tier: 'OWNED_FLEET', color: '#06b6d4' },
  { tier: 'PAID_MEMBER', color: '#8b5cf6' },
  { tier: 'OUTSIDE_CONTRACTOR', color: '#f59e0b' },
]

/**
 * Fleet Map wrapper: adds the reference site's legend/tier filters, an
 * anomaly-only ("unresponsive drivers") isolate toggle, click-through to a
 * driver's current task chain, and a "big screen" full-viewport mode — on
 * top of whichever underlying renderer (`FleetMap` Leaflet, or the
 * `FleetMapFallback` SVG when tiles are unreachable) is active, so every
 * enhancement works identically in both render paths.
 */
export function FleetMapView({ height = '100%' }: { height?: string | number }) {
  const mode = useMapHealthCheck()
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)

  const [tierFilters, setTierFilters] = useState<Record<DriverTier, boolean>>({
    OWNED_FLEET: true,
    PAID_MEMBER: true,
    OUTSIDE_CONTRACTOR: true,
  })
  const [anomalyOnly, setAnomalyOnly] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [bigScreen, setBigScreen] = useState(false)

  const anomalyCount = useMemo(() => drivers.filter((d) => d.unresponsiveFlagUntil && d.unresponsiveFlagUntil > Date.now()).length, [drivers])

  const visibleDriverIds = useMemo(() => {
    const now = Date.now()
    if (anomalyOnly) return new Set(drivers.filter((d) => d.unresponsiveFlagUntil && d.unresponsiveFlagUntil > now).map((d) => d.id))
    return new Set(drivers.filter((d) => tierFilters[d.tier]).map((d) => d.id))
  }, [drivers, tierFilters, anomalyOnly])

  const toggleTier = (tier: DriverTier) => setTierFilters((prev) => ({ ...prev, [tier]: !prev[tier] }))

  const legend = (
    <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2" data-testid="fleetmap-legend">
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/70 p-0.5 backdrop-blur-md">
        {TIER_LEGEND.map(({ tier, color }) => (
          <button
            key={tier}
            onClick={() => toggleTier(tier)}
            data-testid={`fleetmap-legend-${tier}`}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition ${
              tierFilters[tier] && !anomalyOnly ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: color, color }} />
            {t(`tier.${tier}`)}
          </button>
        ))}
      </div>

      <button
        onClick={() => setAnomalyOnly((v) => !v)}
        data-testid="fleetmap-legend-unresponsive"
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition border ${
          anomalyOnly ? 'border-rose-500/50 bg-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]' : 'border-white/10 bg-slate-950/70 text-slate-400 hover:text-slate-200'
        }`}
      >
        <AlertOctagon className="h-3 w-3 text-rose-400" />
        {t('fleetos.map.legendUnresponsive', { n: anomalyCount })}
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => setBigScreen(true)}
          data-testid="fleetmap-bigscreen-open"
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-[10.5px] font-semibold text-cyan-300 shadow-md backdrop-blur-md transition hover:border-cyan-400/40 hover:bg-slate-900"
        >
          <Maximize2 className="h-3 w-3" /> {t('fleetos.map.bigScreen')}
        </button>
      </div>
    </div>
  )

  const mapEl =
    mode === 'checking' ? (
      <div style={{ height }} className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#030712]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
          <span className="text-xs font-medium tracking-wide">{lang === 'zh' ? '正在載入即時賽博地圖…' : 'Loading Cyber Cartography…'}</span>
        </div>
      </div>
    ) : mode === 'leaflet' ? (
      <FleetMap height={height} visibleDriverIds={visibleDriverIds} onDriverClick={setSelectedDriverId} />
    ) : (
      <FleetMapFallback height={height} visibleDriverIds={visibleDriverIds} onDriverClick={setSelectedDriverId} />
    )

  return (
    <div className="flex h-full flex-col">
      {legend}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2" style={selectedDriverId ? { gridTemplateColumns: '1fr 220px' } : undefined}>
        <div className="min-h-0 flex-1 relative">{mapEl}</div>
        {selectedDriverId && <DriverTaskPanel driverId={selectedDriverId} onClose={() => setSelectedDriverId(null)} />}
      </div>

      {bigScreen && (
        <div className="fixed inset-0 z-[900] flex flex-col bg-[#030712]/98 p-4 backdrop-blur-2xl" data-testid="fleetmap-bigscreen-overlay">
          {/* pr reserves room so "Exit Big Screen" never sits under the fixed
           * DemoModeSwitcher pill (z-[950], also top-right) */}
          <div className="mb-3 flex items-center justify-between pr-24 sm:pr-28 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
              <p className="text-sm font-bold text-white tracking-wide">{t('fleetos.map.bigScreen')} · HUD Command Grid</p>
            </div>
            <button
              onClick={() => setBigScreen(false)}
              data-testid="fleetmap-bigscreen-close"
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/15"
            >
              <Minimize2 className="h-3.5 w-3.5" /> {t('fleetos.map.exitBigScreen')}
            </button>
          </div>
          {legend}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3" style={selectedDriverId ? { gridTemplateColumns: '1fr 280px' } : undefined}>
            <div className="min-h-0 flex-1">
              {mode === 'leaflet' ? (
                <FleetMap height="100%" visibleDriverIds={visibleDriverIds} onDriverClick={setSelectedDriverId} />
              ) : (
                <FleetMapFallback height="100%" visibleDriverIds={visibleDriverIds} onDriverClick={setSelectedDriverId} />
              )}
            </div>
            {selectedDriverId && <DriverTaskPanel driverId={selectedDriverId} onClose={() => setSelectedDriverId(null)} />}
          </div>
        </div>
      )}
    </div>
  )
}
