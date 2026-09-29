export type City = 'Taipei' | 'New Taipei' | 'Taoyuan' | 'Hsinchu' | 'Taichung' | 'Tainan' | 'Kaohsiung'
export type PlaceType = 'airport' | 'station' | 'landmark' | 'district' | 'hotel'
/** Normalized demo location. Coordinates identify real public places; scene architecture is representative. */
export type Place = { id: string; name: string; address: string; area: string; city: City; lat: number; lng: number; type: PlaceType; poi?: string }

export const PLACES: Place[] = [
  { id: 'tpe', name: 'Taoyuan International Airport (TPE)', address: 'Airport South Road', area: 'Terminal district', city: 'Taoyuan', lat: 25.0797, lng: 121.2342, type: 'airport', poi: 'International airport' },
  { id: 'tsa', name: 'Songshan Airport (TSA)', address: 'Dunhua North Road', area: 'Songshan', city: 'Taipei', lat: 25.0694, lng: 121.5521, type: 'airport' },
  { id: 'main', name: 'Taipei Main Station', address: 'Beiping West Road', area: 'Zhongzheng', city: 'Taipei', lat: 25.0478, lng: 121.5171, type: 'station' },
  { id: '101', name: 'Taipei 101', address: 'Xinyi Road', area: 'Xinyi', city: 'Taipei', lat: 25.0339, lng: 121.5645, type: 'landmark' },
  { id: 'grand', name: 'Grand Hotel district', address: 'Zhongshan North Road', area: 'Zhongshan', city: 'Taipei', lat: 25.0794, lng: 121.5262, type: 'hotel' },
  { id: 'ximen', name: 'Ximending', address: 'Chengdu Road', area: 'Wanhua', city: 'Taipei', lat: 25.0421, lng: 121.5081, type: 'district' },
  { id: 'beitou', name: 'Beitou Hot Springs district', address: 'Guangming Road', area: 'Beitou', city: 'Taipei', lat: 25.1367, lng: 121.5063, type: 'district' },
  { id: 'nangang', name: 'Nangang Exhibition Center', address: 'Jingmao 2nd Road', area: 'Nangang', city: 'Taipei', lat: 25.0556, lng: 121.6176, type: 'landmark' },
  { id: 'banqiao', name: 'Banqiao HSR Station', address: 'Xianmin Boulevard', area: 'Banqiao', city: 'New Taipei', lat: 25.0143, lng: 121.4634, type: 'station' },
  { id: 'tamsui', name: 'Tamsui waterfront', address: 'Guangzhou Road', area: 'Tamsui', city: 'New Taipei', lat: 25.1826, lng: 121.4116, type: 'district' },
  { id: 'hsinchu-hsr', name: 'Hsinchu HSR Station', address: 'Gaotie 7th Road', area: 'Zhubei', city: 'Hsinchu', lat: 24.8082, lng: 121.0403, type: 'station' },
  { id: 'hsinchu-city', name: 'Hsinchu city center', address: 'Zhongzheng Road', area: 'East District', city: 'Hsinchu', lat: 24.8066, lng: 120.9686, type: 'district' },
  { id: 'taichung-hsr', name: 'Taichung HSR Station', address: 'Zhanqu 2nd Road', area: 'Wuri', city: 'Taichung', lat: 24.112, lng: 120.616, type: 'station' },
  { id: 'taichung-city', name: 'Taichung civic district', address: 'Taiwan Boulevard', area: 'Xitun', city: 'Taichung', lat: 24.1632, lng: 120.6466, type: 'district' },
  { id: 'tainan-hsr', name: 'Tainan HSR Station', address: 'Guiren Boulevard', area: 'Guiren', city: 'Tainan', lat: 22.9248, lng: 120.2857, type: 'station' },
  { id: 'tainan-center', name: 'Tainan city center', address: 'Minsheng Road', area: 'West Central', city: 'Tainan', lat: 22.9948, lng: 120.1965, type: 'district' },
  { id: 'kaohsiung-hsr', name: 'Zuoying HSR Station', address: 'Gaotie Road', area: 'Zuoying', city: 'Kaohsiung', lat: 22.6877, lng: 120.309, type: 'station' },
  { id: 'kaohsiung-harbor', name: 'Kaohsiung harbor district', address: 'Dayong Road', area: 'Yancheng', city: 'Kaohsiung', lat: 22.6201, lng: 120.2815, type: 'district' },
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
