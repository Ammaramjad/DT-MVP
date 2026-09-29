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
  { id: 'hsinchu-hsr', name: 'Hsinchu HSR Station', area: 'Hsinchu', lat: 24.8082, lng: 121.0403 },
  { id: 'taichung-hsr', name: 'Taichung HSR Station', area: 'Taichung', lat: 24.112, lng: 120.616 },
  { id: 'tainan-hsr', name: 'Tainan HSR Station', area: 'Tainan', lat: 22.9248, lng: 120.2857 },
  { id: 'kaohsiung-hsr', name: 'Zuoying HSR Station', area: 'Kaohsiung', lat: 22.6877, lng: 120.309 },
]

export type VehicleId = 'economy' | 'comfort' | 'business' | 'premium' | 'seven' | 'van'
export type ServiceId = 'airport-to-location' | 'location-to-airport' | 'location-to-location' | 'self-drive' | 'chauffeur'

export const SERVICES: { id: ServiceId; name: string; note: string }[] = [
  { id: 'airport-to-location', name: 'Airport → Location', note: 'Terminal pickup with flight details added at checkout.' },
  { id: 'location-to-airport', name: 'Location → Airport', note: 'Scheduled departure with a recommended arrival buffer.' },
  { id: 'location-to-location', name: 'Location → Location', note: 'A private point-to-point journey.' },
  { id: 'self-drive', name: 'Self-drive rental', note: 'Prototype estimate only; licence verification is required.' },
  { id: 'chauffeur', name: 'Chauffeur', note: 'Vehicle with a professional driver.' },
]

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
  model: string
  assetStatus: 'licensed-glb' | 'original-prototype'
}

export const VEHICLES: VehicleSpec[] = [
  { id: 'economy', name: 'Sedan', model: 'Reference Sedan', assetStatus: 'licensed-glb', tagline: 'Efficient, everyday', seats: 3, luggage: 2, base: 85, perKm: 22, color: '#c6c2ba', accent: '#8d877e', etaMin: 3 },
  { id: 'comfort', name: 'Premium Sedan', model: 'Reference Grand Sedan', assetStatus: 'licensed-glb', tagline: 'Quiet, spacious', seats: 4, luggage: 3, base: 120, perKm: 28, color: '#4e504e', accent: '#bca77d', etaMin: 4 },
  { id: 'business', name: 'SUV', model: 'SUV Digital Prototype', assetStatus: 'original-prototype', tagline: 'Confident all-road space', seats: 5, luggage: 4, base: 220, perKm: 42, color: '#242624', accent: '#c8b387', etaMin: 6 },
  { id: 'premium', name: 'Luxury / Chauffeur', model: 'Reference Executive Sedan', assetStatus: 'licensed-glb', tagline: 'First class, chauffeured', seats: 3, luggage: 3, base: 380, perKm: 64, color: '#111211', accent: '#dbcba7', etaMin: 8 },
  { id: 'seven', name: '7-Seater', model: 'Three-row Digital Prototype', assetStatus: 'original-prototype', tagline: 'Three-row SUV versatility', seats: 7, luggage: 4, base: 285, perKm: 51, color: '#38413b', accent: '#afbea9', etaMin: 8 },
  { id: 'van', name: 'Van / Group', model: 'Group Van Digital Prototype', assetStatus: 'original-prototype', tagline: 'Group travel with cargo room', seats: 8, luggage: 8, base: 330, perKm: 56, color: '#333532', accent: '#c1b392', etaMin: 9 },
]

export const vehicleFits = (vehicle: VehicleSpec, passengers: number, luggage: number) =>
  vehicle.seats >= passengers && vehicle.luggage >= luggage

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
