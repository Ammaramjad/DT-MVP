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
  { tier: 'OWNED_FLEET', color: '#22d3ee' },
  { tier: 'PAID_MEMBER', color: '#a855f7' },
  { tier: 'OUTSIDE_CONTRACTOR', color: '#fbbf24' },
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
      {TIER_LEGEND.map(({ tier, color }) => (
        <button
          key={tier}
          onClick={() => toggleTier(tier)}
          data-testid={`fleetmap-legend-${tier}`}
          className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-medium transition ${
            tierFilters[tier] && !anomalyOnly ? 'bg-white/[0.06] text-slate-200' : 'bg-white/[0.02] text-slate-500'
          }`}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {t(`tier.${tier}`)}
        </button>
      ))}
      <button
        onClick={() => setAnomalyOnly((v) => !v)}
        data-testid="fleetmap-legend-unresponsive"
        className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-medium transition ${
          anomalyOnly ? 'bg-red-400/15 text-red-300' : 'bg-white/[0.02] text-slate-500 hover:text-slate-300'
        }`}
      >
        <AlertOctagon className="h-2.5 w-2.5" />
        {t('fleetos.map.legendUnresponsive', { n: anomalyCount })}
      </button>
      <button
        onClick={() => setBigScreen(true)}
        data-testid="fleetmap-bigscreen-open"
        className="ml-auto flex items-center gap-1 rounded-full bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-slate-400 hover:bg-white/[0.08] hover:text-slate-200"
      >
        <Maximize2 className="h-3 w-3" /> {t('fleetos.map.bigScreen')}
      </button>
    </div>
  )

  const mapEl =
    mode === 'checking' ? (
      <div style={{ height }} className="flex items-center justify-center rounded-2xl bg-white/[0.02]">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          <span className="text-xs">{lang === 'zh' ? '正在載入即時地圖…' : 'Loading live map…'}</span>
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
        <div className="min-h-0 flex-1">{mapEl}</div>
        {selectedDriverId && <DriverTaskPanel driverId={selectedDriverId} onClose={() => setSelectedDriverId(null)} />}
      </div>

      {bigScreen && (
        <div className="fixed inset-0 z-[900] flex flex-col bg-mission-950/98 p-4 backdrop-blur-xl" data-testid="fleetmap-bigscreen-overlay">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">{t('fleetos.map.bigScreen')}</p>
            <button
              onClick={() => setBigScreen(false)}
              data-testid="fleetmap-bigscreen-close"
              className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-white/15 hover:bg-white/14"
            >
              <Minimize2 className="h-3.5 w-3.5" /> {t('fleetos.map.exitBigScreen')}
            </button>
          </div>
          {legend}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2" style={selectedDriverId ? { gridTemplateColumns: '1fr 260px' } : undefined}>
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
