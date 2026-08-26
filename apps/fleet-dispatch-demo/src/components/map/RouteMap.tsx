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
    order.status === 'EN_ROUTE_TO_PICKUP' || order.status === 'ASSIGNED' || order.status === 'NEW'
      ? order.routeToPickup
      : order.routeToDropoff
  const path = activeLeg ?? order.routeToDropoff
  const points: [number, number][] = path ? path.points.map((p) => [p.lat, p.lng]) : []
  const current = path ? evaluateRoute(path, order.legProgress) : null
  const isMoving = order.status === 'EN_ROUTE_TO_PICKUP' || order.status === 'IN_TRANSIT'

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl">
      <MapContainer center={points[0] ?? [25.06, 121.46]} zoom={12} className="h-full w-full" zoomControl={false} attributionControl={false}>
        <TileLayer className="map-tiles-dark" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" subdomains={['a', 'b', 'c']} />
        {points.length > 1 && <FitToRoute points={points} />}
        {points.length > 1 && (
          <Polyline positions={points} pathOptions={{ color: '#22d3ee', weight: 4, opacity: 0.7 }} />
        )}
        <Marker position={[order.pickup.lat, order.pickup.lng]} icon={flagDivIcon('#22d3ee', 'pickup')} />
        <Marker position={[order.dropoff.lat, order.dropoff.lng]} icon={flagDivIcon('#f472b6', 'dropoff')} />
        {current && <Marker position={[current.lat, current.lng]} icon={vehicleDivIcon('#fbbf24', { pulse: isMoving })} />}
      </MapContainer>
    </div>
  )
}
