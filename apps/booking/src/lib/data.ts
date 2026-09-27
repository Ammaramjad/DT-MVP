export type Place = { id: string; name: string; area: string; lat: number; lng: number }

export const PLACES: Place[] = [
  { id: 'tpe', name: 'Taoyuan International Airport (TPE)', area: 'Terminal 1 & 2', lat: 25.0797, lng: 121.2342 },
  { id: 'tsa', name: 'Songshan Airport (TSA)', area: 'Taipei City', lat: 25.0694, lng: 121.5521 },
  { id: 'main', name: 'Taipei Main Station', area: 'Zhongzheng', lat: 25.0478, lng: 121.5171 },
  { id: '101', name: 'Taipei 101', area: 'Xinyi', lat: 25.0339, lng: 121.5645 },
  { id: 'grand', name: 'The Grand Hotel', area: 'Zhongshan', lat: 25.0794, lng: 121.5262 },
  { id: 'ximen', name: 'Ximending', area: 'Wanhua', lat: 25.0421, lng: 121.5081 },
  { id: 'beitou', name: 'Beitou Hot Springs', area: 'Beitou', lat: 25.1367, lng: 121.5063 },
  { id: 'nangang', name: 'Nangang Exhibition Center', area: 'Nangang', lat: 25.0556, lng: 121.6176 },
  { id: 'banqiao', name: 'Banqiao HSR Station', area: 'New Taipei', lat: 25.0143, lng: 121.4634 },
  { id: 'tamsui', name: 'Tamsui Fisherman’s Wharf', area: 'New Taipei', lat: 25.1826, lng: 121.4116 },
  { id: 'jiufen', name: 'Jiufen Old Street', area: 'Ruifang', lat: 25.1097, lng: 121.8443 },
  { id: 'keelung', name: 'Keelung Harbor', area: 'Keelung', lat: 25.1319, lng: 121.7412 },
  { id: 'yms', name: 'Yangmingshan National Park', area: 'Beitou', lat: 25.1559, lng: 121.5459 },
  { id: 'shilin', name: 'Shilin Night Market', area: 'Shilin', lat: 25.0879, lng: 121.5241 },
]

export type VehicleId = 'economy' | 'comfort' | 'business' | 'premium' | 'van'

export type VehicleSpec = {
  id: VehicleId
  name: string
  tagline: string
  seats: number
  luggage: number
  base: number
  perKm: number
  color: string
  accent: string
  etaMin: number
}

export const VEHICLES: VehicleSpec[] = [
  { id: 'economy', name: 'Economy', tagline: 'Efficient, everyday', seats: 3, luggage: 2, base: 85, perKm: 22, color: '#c9ced8', accent: '#9aa5b8', etaMin: 3 },
  { id: 'comfort', name: 'Comfort', tagline: 'Quiet, spacious', seats: 4, luggage: 3, base: 120, perKm: 28, color: '#5b6b8c', accent: '#a7b6ff', etaMin: 4 },
  { id: 'business', name: 'Business', tagline: 'Executive class', seats: 4, luggage: 3, base: 220, perKm: 42, color: '#1b1f2a', accent: '#d8dcff', etaMin: 6 },
  { id: 'premium', name: 'Premium', tagline: 'First class, chauffeured', seats: 3, luggage: 3, base: 380, perKm: 64, color: '#0b0c10', accent: '#f4e9c8', etaMin: 8 },
  { id: 'van', name: 'Van / Group', tagline: 'Up to seven, together', seats: 7, luggage: 6, base: 260, perKm: 48, color: '#2c3140', accent: '#b7c4ff', etaMin: 9 },
]

export function haversineKm(a: Place, b: Place) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.28 // road factor
}

export function estimateFare(v: VehicleSpec, km: number) {
  return Math.round((v.base + v.perKm * km) / 5) * 5
}

export function estimateDurationMin(km: number) {
  return Math.max(8, Math.round((km / 38) * 60))
}

export const fmtTWD = (n: number) => `NT$${n.toLocaleString('en-US')}`
