import { LOCATIONS, SVG_VIEWBOX } from '../../data/locations'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'

const TIER_COLOR: Record<string, string> = {
  OWNED_FLEET: '#22d3ee',
  PAID_MEMBER: '#a855f7',
  OUTSIDE_CONTRACTOR: '#fbbf24',
}

const ROAD_PAIRS: [string, string][] = [
  ['tpe-airport', 'taipei-main-station'],
  ['taipei-main-station', 'ximending'],
  ['taipei-main-station', 'taipei-101'],
  ['taipei-101', 'grand-hyatt'],
  ['taipei-101', 'w-hotel'],
  ['taipei-101', 'neihu-business'],
  ['taipei-main-station', 'beitou'],
  ['beitou', 'danshui'],
  ['neihu-business', 'tsa-airport'],
  ['neihu-business', 'yehliu'],
  ['yehliu', 'jiufen'],
]

function locById(id: string) {
  return LOCATIONS.find((l) => l.id === id)!
}

export function FleetMapFallback({ height = '100%' }: { height?: string | number }) {
  const { lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const orders = useFleetStore((s) => s.orders)
  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED', 'CONFIRMED'].includes(o.status))

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-2xl bg-[#070b18]">
      <svg viewBox={`0 0 ${SVG_VIEWBOX.width} ${SVG_VIEWBOX.height}`} className="h-full w-full">
        <defs>
          <radialGradient id="fallback-glow" cx="30%" cy="20%" r="70%">
            <stop offset="0%" stopColor="#132048" />
            <stop offset="60%" stopColor="#0a0e1e" />
            <stop offset="100%" stopColor="#05060f" />
          </radialGradient>
          <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 L0 0 0 40" fill="none" stroke="#1b2440" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={SVG_VIEWBOX.width} height={SVG_VIEWBOX.height} fill="url(#fallback-glow)" />
        <rect width={SVG_VIEWBOX.width} height={SVG_VIEWBOX.height} fill="url(#grid-pattern)" opacity={0.5} />

        {ROAD_PAIRS.map(([a, b], i) => {
          const la = locById(a)
          const lb = locById(b)
          return (
            <line
              key={i}
              x1={la.svgX}
              y1={la.svgY}
              x2={lb.svgX}
              y2={lb.svgY}
              stroke="#28345c"
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.55}
            />
          )
        })}

        {activeOrders.map((order) => {
          const path =
            order.status === 'DRIVER_EN_ROUTE' || order.status === 'ASSIGNED' ? order.routeToPickup : order.routeToDropoff
          if (!path) return null
          const d = path.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
          return <path key={order.id} d={d} fill="none" stroke="#22d3ee" strokeWidth={2} strokeDasharray="2 8" opacity={0.6} />
        })}

        {LOCATIONS.map((loc) => (
          <g key={loc.id}>
            <circle
              cx={loc.svgX}
              cy={loc.svgY}
              r={loc.isAirport ? 7 : 4}
              fill={loc.isAirport ? '#f472b6' : '#64748b'}
              opacity={0.9}
            />
            <text x={loc.svgX + 10} y={loc.svgY + 4} fontSize={11} fill="#8fa0c9" fontFamily="inherit">
              {loc.isAirport ? `✈ ${(lang === 'zh' ? loc.nameZh : loc.name).split(' ')[0]}` : (lang === 'zh' ? loc.nameZh : loc.name).split(' ')[0]}
            </text>
          </g>
        ))}

        {drivers.map((driver) => {
          const order = orders.find((o) => o.driverId === driver.id && !['COMPLETED', 'CANCELLED'].includes(o.status))
          const isMoving = order?.status === 'DRIVER_EN_ROUTE' || order?.status === 'PASSENGER_ONBOARD'
          const isFlagged = !!driver.unresponsiveFlagUntil && driver.unresponsiveFlagUntil > Date.now()
          const color = isFlagged ? '#ef4444' : TIER_COLOR[driver.tier]
          return (
            <g key={driver.id} style={{ transition: 'transform 1.3s linear' }} transform={`translate(${driver.svgX}, ${driver.svgY})`}>
              {(isMoving || isFlagged) && (
                <circle r={14} fill="none" stroke={color} strokeWidth={2}>
                  <animate attributeName="r" values="6;16;6" dur={isFlagged ? '1s' : '1.8s'} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur={isFlagged ? '1s' : '1.8s'} repeatCount="indefinite" />
                </circle>
              )}
              <circle r={7} fill={color} stroke="white" strokeWidth={1.5} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
