import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import { useFleetStore } from '../../store/useFleetStore'
import { LOCATIONS, MAP_CENTER } from '../../data/locations'
import { vehicleDivIcon, pinDivIcon } from './mapIcons'
import { TierBadge, StatusBadge } from '../ui/OrderBadges'
import { driverTierLabel } from '../../lib/format'
import { useLang } from '../../i18n'

const TIER_COLOR: Record<string, string> = {
  OWNED_FLEET: '#06b6d4',
  PAID_MEMBER: '#8b5cf6',
  OUTSIDE_CONTRACTOR: '#f59e0b',
}

export function FleetMap({
  height = '100%',
  visibleDriverIds = null,
  onDriverClick,
}: {
  height?: string | number
  /** When set, only these driver ids render as markers — drives the legend
   * tier/anomaly filters in `FleetMapView`. `null` shows every driver. */
  visibleDriverIds?: Set<string> | null
  onDriverClick?: (driverId: string) => void
}) {
  const { t, lang } = useLang()
  const allDrivers = useFleetStore((s) => s.drivers)
  const orders = useFleetStore((s) => s.orders)
  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED', 'CONFIRMED'].includes(o.status))
  const drivers = visibleDriverIds ? allDrivers.filter((d) => visibleDriverIds.has(d.id)) : allDrivers

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border border-white/10 bg-[#030712] shadow-2xl">
      <MapContainer center={MAP_CENTER} zoom={11} className="h-full w-full" zoomControl={false} attributionControl={false}>
        <TileLayer
          className="map-tiles-dark"
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />

        {LOCATIONS.map((loc) => (
          <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={pinDivIcon(loc.isAirport ? '#f43f5e' : '#64748b', loc.isAirport)}>
            <Popup>
              <div className="text-xs p-1">
                <div className="flex items-center gap-1.5">
                  {loc.isAirport && <span className="rounded bg-rose-500/20 px-1 py-0.5 text-[9px] font-bold text-rose-300">AIRPORT</span>}
                  <p className="font-bold text-white">{lang === 'zh' ? loc.nameZh : loc.name}</p>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{lang === 'zh' ? loc.name : loc.nameZh}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {activeOrders.map((order) => {
          const path =
            order.status === 'DRIVER_EN_ROUTE' || order.status === 'ASSIGNED' ? order.routeToPickup : order.routeToDropoff
          if (!path) return null
          const isEmergency = order.emergencyStatus && order.emergencyStatus !== 'RESOLVED'
          return (
            <Polyline
              key={`route-${order.id}`}
              positions={path.points.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: isEmergency ? '#f43f5e' : '#06b6d4',
                weight: 4,
                opacity: 0.8,
                dashArray: '2 8',
                className: isEmergency ? 'neon-route-emergency' : 'neon-route-path',
              }}
            />
          )
        })}

        {drivers.map((driver) => {
          const order = orders.find((o) => o.driverId === driver.id && !['COMPLETED', 'CANCELLED'].includes(o.status))
          const isMoving = order?.status === 'DRIVER_EN_ROUTE' || order?.status === 'PASSENGER_ONBOARD'
          const isFlagged = !!driver.unresponsiveFlagUntil && driver.unresponsiveFlagUntil > Date.now()
          const isEmergency = order?.emergencyStatus && order.emergencyStatus !== 'RESOLVED'
          const markerColor = isEmergency ? '#f43f5e' : isFlagged ? '#ef4444' : TIER_COLOR[driver.tier]

          return (
            <Marker
              key={driver.id}
              position={[driver.lat, driver.lng]}
              icon={vehicleDivIcon(markerColor, { pulse: isMoving || isFlagged || !!isEmergency })}
              eventHandlers={onDriverClick ? { click: () => onDriverClick(driver.id) } : undefined}
            >
              <Popup>
                <div className="min-w-[190px] text-xs p-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white">
                      {driver.name} <span className="text-slate-400 font-normal">· {driver.nameZh}</span>
                    </p>
                    <span className="text-[10.5px] text-amber-300 font-semibold">⭐ {driver.rating.toFixed(1)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <TierBadge tier={driver.tier} />
                    <span className="text-[10px] text-slate-400">{driverTierLabel(driver.tier, lang)}</span>
                  </div>
                  {isFlagged && (
                    <p className="mt-2 rounded-lg bg-rose-500/15 p-2 font-medium text-rose-300 ring-1 ring-rose-500/30">
                      ⚠ {t('control.rosterUnresponsive', { name: '', orderNo: driver.unresponsiveOrderNo ?? '' })}
                    </p>
                  )}
                  {order ? (
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-bold text-cyan-300">{order.orderNo}</p>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 border-t border-white/10 pt-2 text-emerald-400 font-semibold">● {t('driverStatus.AVAILABLE')}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
