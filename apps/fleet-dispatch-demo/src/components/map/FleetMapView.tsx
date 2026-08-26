import { useMapHealthCheck } from '../../hooks/useMapHealthCheck'
import { FleetMap } from './FleetMap'
import { FleetMapFallback } from './FleetMapFallback'

export function FleetMapView({ height = '100%' }: { height?: string | number }) {
  const mode = useMapHealthCheck()

  if (mode === 'checking') {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-2xl bg-white/[0.02]">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          <span className="text-xs">Loading live map…</span>
        </div>
      </div>
    )
  }

  return mode === 'leaflet' ? <FleetMap height={height} /> : <FleetMapFallback height={height} />
}
