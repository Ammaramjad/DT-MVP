import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import { useFleetStore } from '../../store/useFleetStore'
import { LOCATIONS, MAP_CENTER } from '../../data/locations'
import { vehicleDivIcon, pinDivIcon } from './mapIcons'
import { TierBadge, StatusBadge } from '../ui/OrderBadges'
import { driverTierLabel } from '../../lib/format'
import { useLang } from '../../i18n'

const TIER_COLOR: Record<string, string> = {
  OWNED_FLEET: '#22d3ee',
  PAID_MEMBER: '#a855f7',
  OUTSIDE_CONTRACTOR: '#fbbf24',
}

export function FleetMap({ height = '100%' }: { height?: string | number }) {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const orders = useFleetStore((s) => s.orders)
  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED', 'CONFIRMED'].includes(o.status))

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl">
      <MapContainer center={MAP_CENTER} zoom={11} className="h-full w-full" zoomControl={false} attributionControl={false}>
        <TileLayer
          className="map-tiles-dark"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains={['a', 'b', 'c']}
        />

        {LOCATIONS.map((loc) => (
          <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={pinDivIcon(loc.isAirport ? '#f472b6' : '#475569')}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{lang === 'zh' ? loc.nameZh : loc.name}</p>
                <p className="text-slate-400">{lang === 'zh' ? loc.name : loc.nameZh}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {activeOrders.map((order) => {
          const path =
            order.status === 'DRIVER_EN_ROUTE' || order.status === 'ASSIGNED' ? order.routeToPickup : order.routeToDropoff
          if (!path) return null
          return (
            <Polyline
              key={`route-${order.id}`}
              positions={path.points.map((p) => [p.lat, p.lng])}
              pathOptions={{ color: '#22d3ee', weight: 3, opacity: 0.45, dashArray: '1 8' }}
            />
          )
        })}

        {drivers.map((driver) => {
          const order = orders.find((o) => o.driverId === driver.id && !['COMPLETED', 'CANCELLED'].includes(o.status))
          const isMoving = order?.status === 'DRIVER_EN_ROUTE' || order?.status === 'PASSENGER_ONBOARD'
          const isFlagged = !!driver.unresponsiveFlagUntil && driver.unresponsiveFlagUntil > Date.now()
          return (
            <Marker
              key={driver.id}
              position={[driver.lat, driver.lng]}
              icon={vehicleDivIcon(isFlagged ? '#ef4444' : TIER_COLOR[driver.tier], { pulse: isMoving || isFlagged })}
            >
              <Popup>
                <div className="min-w-[180px] text-xs">
                  <p className="font-semibold text-slate-900">
                    {driver.name} <span className="text-slate-500">· {driver.nameZh}</span>
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <TierBadge tier={driver.tier} />
                  </div>
                  <p className="mt-1 text-slate-500">{driverTierLabel(driver.tier, lang)} · ⭐ {driver.rating.toFixed(1)}</p>
                  {isFlagged && (
                    <p className="mt-2 rounded-md bg-red-50 px-2 py-1 font-medium text-red-600">
                      ⚠ {t('control.rosterUnresponsive', { name: '', orderNo: driver.unresponsiveOrderNo ?? '' })}
                    </p>
                  )}
                  {order ? (
                    <div className="mt-2 border-t border-slate-200 pt-2">
                      <p className="font-medium text-slate-800">{order.orderNo}</p>
                      <div className="mt-1"><StatusBadge status={order.status} /></div>
                    </div>
                  ) : (
                    <p className="mt-2 border-t border-slate-200 pt-2 text-emerald-600">{t('driverStatus.AVAILABLE')}</p>
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
