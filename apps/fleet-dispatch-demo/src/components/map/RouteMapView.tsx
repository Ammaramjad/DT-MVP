import type { Order } from '../../types'
import { useMapHealthCheck } from '../../hooks/useMapHealthCheck'
import { RouteMap } from './RouteMap'
import { RouteMapFallback } from './RouteMapFallback'

export function RouteMapView({ order, height = '100%' }: { order: Order; height?: string | number }) {
  const mode = useMapHealthCheck()

  if (mode === 'checking') {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-2xl bg-white/[0.02]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
      </div>
    )
  }

  return mode === 'leaflet' ? <RouteMap order={order} height={height} /> : <RouteMapFallback order={order} height={height} />
}
