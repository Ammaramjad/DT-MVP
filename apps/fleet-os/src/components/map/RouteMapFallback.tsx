import type { Order } from '../../types'
import { evaluateRoute } from '../../lib/geo'

export function RouteMapFallback({ order, height = '100%' }: { order: Order; height?: string | number }) {
  const activeLeg =
    order.status === 'DRIVER_EN_ROUTE' || order.status === 'ASSIGNED' || order.status === 'CONFIRMED'
      ? order.routeToPickup
      : order.routeToDropoff
  const path = activeLeg ?? order.routeToDropoff
  const current = path ? evaluateRoute(path, order.legProgress) : null
  const isMoving = order.status === 'DRIVER_EN_ROUTE' || order.status === 'PASSENGER_ONBOARD'
  const d = path ? path.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : ''

  const xs = path ? path.points.map((p) => p.x) : [0]
  const ys = path ? path.points.map((p) => p.y) : [0]
  const minX = Math.min(...xs) - 60
  const maxX = Math.max(...xs) + 60
  const minY = Math.min(...ys) - 60
  const maxY = Math.max(...ys) + 60
  const vbWidth = Math.max(120, maxX - minX)
  const vbHeight = Math.max(120, maxY - minY)

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-2xl bg-[#070b18]">
      <svg viewBox={`${minX} ${minY} ${vbWidth} ${vbHeight}`} className="h-full w-full">
        <defs>
          <pattern id="route-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 L0 0 0 40" fill="none" stroke="#1b2440" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={minX} y={minY} width={vbWidth} height={vbHeight} fill="#0a0e1e" />
        <rect x={minX} y={minY} width={vbWidth} height={vbHeight} fill="url(#route-grid)" opacity={0.5} />

        {d && <path d={d} fill="none" stroke="#22d3ee" strokeWidth={4} strokeLinecap="round" opacity={0.75} />}

        <g transform={`translate(${path ? path.points[0].x : 0}, ${path ? path.points[0].y : 0})`}>
          <circle r={9} fill="#22d3ee" stroke="white" strokeWidth={2} />
          <text x={14} y={5} fontSize={13} fill="#e2e8f0">A</text>
        </g>
        <g transform={`translate(${path ? path.points[path.points.length - 1].x : 0}, ${path ? path.points[path.points.length - 1].y : 0})`}>
          <circle r={9} fill="#f472b6" stroke="white" strokeWidth={2} />
          <text x={14} y={5} fontSize={13} fill="#e2e8f0">B</text>
        </g>

        {current && (
          <g style={{ transition: 'transform 1.3s linear' }} transform={`translate(${current.x}, ${current.y})`}>
            {isMoving && (
              <circle r={12} fill="none" stroke="#fbbf24" strokeWidth={2}>
                <animate attributeName="r" values="6;18;6" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r={8} fill="#fbbf24" stroke="white" strokeWidth={2} />
          </g>
        )}
      </svg>
    </div>
  )
}
