import { divIcon } from 'leaflet'

export function vehicleDivIcon(color: string, opts?: { pulse?: boolean; label?: string; heading?: number }): ReturnType<typeof divIcon> {
  const pulse = opts?.pulse ?? true
  const heading = opts?.heading ?? 0
  return divIcon({
    className: 'fleet-vehicle-marker',
    html: `
      <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
        ${pulse ? `<span style="position:absolute;inset:0;border-radius:999px;border:2px solid ${color};animation:marker-pulse 1.8s cubic-bezier(0,0,0.2,1) infinite;box-shadow:0 0 14px ${color};"></span>` : ''}
        <div style="position:relative;width:18px;height:18px;border-radius:999px;background:${color};box-shadow:0 0 16px ${color}, inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 6px rgba(0,0,0,0.8);border:2px solid rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg);">
          <div style="width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-bottom:5px solid rgba(3,7,18,0.9);margin-top:-1px;"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

export function pinDivIcon(color: string, isAirport: boolean = false): ReturnType<typeof divIcon> {
  return divIcon({
    className: 'fleet-pin-marker',
    html: `
      <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
        ${isAirport ? `<span style="position:absolute;inset:0;border-radius:999px;border:1.5px solid ${color};animation:marker-pulse 2.2s ease-out infinite;"></span>` : ''}
        <div style="width:${isAirport ? '14px' : '10px'};height:${isAirport ? '14px' : '10px'};border-radius:999px;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 0 10px ${color}, 0 2px 4px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;">
          ${isAirport ? `<span style="color:#ffffff;font-size:8px;line-height:1;">✈</span>` : ''}
        </div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

export function flagDivIcon(color: string, kind: 'pickup' | 'dropoff'): ReturnType<typeof divIcon> {
  const label = kind === 'pickup' ? 'A' : 'B'
  return divIcon({
    className: 'fleet-flag-marker',
    html: `
      <div style="width:24px;height:24px;border-radius:999px;background:linear-gradient(135deg, ${color}, #080d1a);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#ffffff;border:2px solid rgba(255,255,255,0.95);box-shadow:0 0 12px ${color}, 0 4px 12px rgba(0,0,0,0.7);">
        ${label}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}
