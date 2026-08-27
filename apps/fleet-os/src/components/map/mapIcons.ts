import { divIcon } from 'leaflet'

export function vehicleDivIcon(color: string, opts?: { pulse?: boolean; label?: string }): ReturnType<typeof divIcon> {
  const pulse = opts?.pulse ?? true
  return divIcon({
    className: 'fleet-vehicle-marker',
    html: `
      <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
        ${pulse ? `<span style="position:absolute;inset:0;border-radius:999px;border:2px solid ${color};animation:marker-pulse 1.8s ease-out infinite;"></span>` : ''}
        <div style="width:16px;height:16px;border-radius:999px;background:${color};box-shadow:0 0 10px ${color},0 0 2px rgba(0,0,0,0.6);border:2px solid rgba(255,255,255,0.85);"></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

export function pinDivIcon(color: string): ReturnType<typeof divIcon> {
  return divIcon({
    className: 'fleet-pin-marker',
    html: `
      <div style="width:12px;height:12px;border-radius:999px;background:${color};opacity:0.85;border:2px solid rgba(255,255,255,0.6);box-shadow:0 0 6px ${color};"></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

export function flagDivIcon(color: string, kind: 'pickup' | 'dropoff'): ReturnType<typeof divIcon> {
  const label = kind === 'pickup' ? 'A' : 'B'
  return divIcon({
    className: 'fleet-flag-marker',
    html: `
      <div style="width:22px;height:22px;border-radius:999px;background:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#05060f;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5);">
        ${label}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}
