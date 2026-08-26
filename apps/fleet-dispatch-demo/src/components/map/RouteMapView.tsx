import type { Order } from '../../types'
import { useMapHealthCheck } from '../../hooks/useMapHealthCheck'
import { RouteMap } from './RouteMap'
import { RouteMapFallback } from './RouteMapFallback'

/** Small on-map badge that surfaces whether the currently displayed leg is a
 * real OSRM road-snapped route or the synthetic fallback curve — lets QA and
 * the client visually verify the dynamic-routing integration live. */
function RouteSourceBadge({ order }: { order: Order }) {
  const activeLeg =
    order.status === 'DRIVER_EN_ROUTE' || order.status === 'ASSIGNED' || order.status === 'CONFIRMED'
      ? order.routeToPickup
      : order.routeToDropoff
  const source = (activeLeg ?? order.routeToDropoff)?.source
  if (!source) return null
  const isOsrm = source === 'OSRM'
  return (
    <div
      data-testid="route-source-badge"
      data-source={source}
      className={`pointer-events-none absolute right-2 top-2 z-10 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-lg ${
        isOsrm ? 'bg-emerald-500/90 text-emerald-950' : 'bg-amber-400/90 text-amber-950'
      }`}
    >
      {isOsrm ? 'OSRM live route' : 'Synthetic fallback'}
    </div>
  )
}

export function RouteMapView({ order, height = '100%' }: { order: Order; height?: string | number }) {
  const mode = useMapHealthCheck()

  if (mode === 'checking') {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-2xl bg-white/[0.02]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
      </div>
    )
  }

  return (
    <div className="relative" style={{ height }}>
      {mode === 'leaflet' ? <RouteMap order={order} height={height} /> : <RouteMapFallback order={order} height={height} />}
      <RouteSourceBadge order={order} />
    </div>
  )
}
