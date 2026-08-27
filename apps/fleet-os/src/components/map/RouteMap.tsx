import { useEffect, useRef } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { Order } from '../../types'
import { evaluateRoute } from '../../lib/geo'
import { vehicleDivIcon, flagDivIcon } from './mapIcons'

function FitToRoute({ points }: { points: [number, number][] }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || points.length === 0) return
    done.current = true
    map.fitBounds(points, { padding: [36, 36] })
  }, [map, points])
  return null
}

export function RouteMap({ order, height = '100%' }: { order: Order; height?: string | number }) {
  const activeLeg =
    order.status === 'DRIVER_EN_ROUTE' || order.status === 'ASSIGNED' || order.status === 'CONFIRMED'
      ? order.routeToPickup
      : order.routeToDropoff
  const path = activeLeg ?? order.routeToDropoff
  const points: [number, number][] = path ? path.points.map((p) => [p.lat, p.lng]) : []
  const current = path ? evaluateRoute(path, order.legProgress) : null
  const isMoving = order.status === 'DRIVER_EN_ROUTE' || order.status === 'PASSENGER_ONBOARD'
  const isEmergency = order.emergencyStatus && order.emergencyStatus !== 'RESOLVED'

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border border-white/10 bg-[#030712] shadow-2xl">
      <MapContainer center={points[0] ?? [25.06, 121.46]} zoom={12} className="h-full w-full" zoomControl={false} attributionControl={false}>
        <TileLayer
          className="map-tiles-dark"
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />
        {points.length > 1 && <FitToRoute points={points} />}
        {points.length > 1 && (
          <Polyline
            positions={points}
            pathOptions={{
              color: isEmergency ? '#f43f5e' : '#06b6d4',
              weight: 4,
              opacity: 0.85,
              className: isEmergency ? 'neon-route-emergency' : 'neon-route-path',
            }}
          />
        )}
        <Marker position={[order.pickup.lat, order.pickup.lng]} icon={flagDivIcon('#06b6d4', 'pickup')} />
        <Marker position={[order.dropoff.lat, order.dropoff.lng]} icon={flagDivIcon('#f43f5e', 'dropoff')} />
        {current && (
          <Marker
            position={[current.lat, current.lng]}
            icon={vehicleDivIcon(isEmergency ? '#f43f5e' : '#f59e0b', { pulse: isMoving || !!isEmergency })}
          />
        )}
      </MapContainer>
    </div>
  )
}
