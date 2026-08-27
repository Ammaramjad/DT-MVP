import { LOCATIONS, SVG_VIEWBOX } from '../../data/locations'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'

const TIER_COLOR: Record<string, string> = {
  OWNED_FLEET: '#06b6d4',
  PAID_MEMBER: '#8b5cf6',
  OUTSIDE_CONTRACTOR: '#f59e0b',
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

export function FleetMapFallback({
  height = '100%',
  visibleDriverIds = null,
  onDriverClick,
}: {
  height?: string | number
  visibleDriverIds?: Set<string> | null
  onDriverClick?: (driverId: string) => void
}) {
  const { lang } = useLang()
  const allDrivers = useFleetStore((s) => s.drivers)
  const orders = useFleetStore((s) => s.orders)
  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED', 'CONFIRMED'].includes(o.status))
  const drivers = visibleDriverIds ? allDrivers.filter((d) => visibleDriverIds.has(d.id)) : allDrivers

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#030712] shadow-2xl">
      <svg viewBox={`0 0 ${SVG_VIEWBOX.width} ${SVG_VIEWBOX.height}`} className="h-full w-full">
        <defs>
          <radialGradient id="fallback-glow" cx="40%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#0c1633" />
            <stop offset="60%" stopColor="#050914" />
            <stop offset="100%" stopColor="#030712" />
          </radialGradient>
          <pattern id="cyber-grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M30 0 L0 0 0 30" fill="none" stroke="#131e3d" strokeWidth="0.75" />
            <circle cx="0" cy="0" r="1" fill="#22d3ee" opacity="0.3" />
          </pattern>
          <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={SVG_VIEWBOX.width} height={SVG_VIEWBOX.height} fill="url(#fallback-glow)" />
        <rect width={SVG_VIEWBOX.width} height={SVG_VIEWBOX.height} fill="url(#cyber-grid-pattern)" opacity={0.65} />

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
              stroke="#1e294b"
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.6}
            />
          )
        })}

        {activeOrders.map((order) => {
          const path =
            order.status === 'DRIVER_EN_ROUTE' || order.status === 'ASSIGNED' ? order.routeToPickup : order.routeToDropoff
          if (!path) return null
          const d = path.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
          const isEmergency = order.emergencyStatus && order.emergencyStatus !== 'RESOLVED'
          return (
            <path
              key={order.id}
              d={d}
              fill="none"
              stroke={isEmergency ? '#f43f5e' : '#06b6d4'}
              strokeWidth={2.5}
              strokeDasharray="3 6"
              opacity={0.85}
              filter="url(#neon-glow-cyan)"
            />
          )
        })}

        {LOCATIONS.map((loc) => (
          <g key={loc.id}>
            {loc.isAirport && (
              <circle cx={loc.svgX} cy={loc.svgY} r={12} fill="none" stroke="#f43f5e" strokeWidth={1} opacity={0.4}>
                <animate attributeName="r" values="8;16;8" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={loc.svgX}
              cy={loc.svgY}
              r={loc.isAirport ? 7 : 4.5}
              fill={loc.isAirport ? '#f43f5e' : '#64748b'}
              stroke="#ffffff"
              strokeWidth={1.5}
              opacity={0.95}
            />
            <text x={loc.svgX + 11} y={loc.svgY + 4} fontSize={11} fontWeight={600} fill="#94a3b8" fontFamily="inherit">
              {loc.isAirport ? `✈ ${(lang === 'zh' ? loc.nameZh : loc.name).split(' ')[0]}` : (lang === 'zh' ? loc.nameZh : loc.name).split(' ')[0]}
            </text>
          </g>
        ))}

        {drivers.map((driver) => {
          const order = orders.find((o) => o.driverId === driver.id && !['COMPLETED', 'CANCELLED'].includes(o.status))
          const isMoving = order?.status === 'DRIVER_EN_ROUTE' || order?.status === 'PASSENGER_ONBOARD'
          const isFlagged = !!driver.unresponsiveFlagUntil && driver.unresponsiveFlagUntil > Date.now()
          const isEmergency = order?.emergencyStatus && order.emergencyStatus !== 'RESOLVED'
          const color = isEmergency ? '#f43f5e' : isFlagged ? '#ef4444' : TIER_COLOR[driver.tier]

          return (
            <g
              key={driver.id}
              data-testid="fleetmap-driver-marker"
              data-driver-id={driver.id}
              style={{ transition: 'transform 1.3s linear', cursor: onDriverClick ? 'pointer' : undefined }}
              transform={`translate(${driver.svgX}, ${driver.svgY})`}
              onClick={() => onDriverClick?.(driver.id)}
            >
              {(isMoving || isFlagged || isEmergency) && (
                <circle r={15} fill="none" stroke={color} strokeWidth={2}>
                  <animate attributeName="r" values="6;18;6" dur={isFlagged || isEmergency ? '1s' : '1.8s'} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0;0.9" dur={isFlagged || isEmergency ? '1s' : '1.8s'} repeatCount="indefinite" />
                </circle>
              )}
              <circle r={11} fill="transparent" />
              <circle r={7.5} fill={color} stroke="#ffffff" strokeWidth={2} filter="drop-shadow(0 0 6px rgba(0,0,0,0.8))" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
