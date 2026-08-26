import type { LocationRef } from '../types'

// Real-world approximate coordinates around Taipei / Taoyuan (Taiwan) so the
// live Leaflet map looks geographically authentic. svgX/svgY place the same
// locations on an abstract 1000x600 "stylized city" canvas used by the
// offline SVG map fallback, so both renderers share one source of truth.
export const LOCATIONS: LocationRef[] = [
  {
    id: 'tpe-airport',
    name: 'Taoyuan Intl. Airport (TPE) T2',
    nameZh: '桃園國際機場 第二航廈',
    address: 'No. 9, Hangzhan S. Rd, Dayuan, Taoyuan City',
    lat: 25.0797,
    lng: 121.2342,
    svgX: 110,
    svgY: 470,
    isAirport: true,
  },
  {
    id: 'tsa-airport',
    name: 'Taipei Songshan Airport (TSA)',
    nameZh: '臺北松山機場',
    address: 'No. 340-9, Sec. 5, Dunhua N. Rd, Songshan Dist., Taipei',
    lat: 25.0694,
    lng: 121.5522,
    svgX: 660,
    svgY: 150,
    isAirport: true,
  },
  {
    id: 'taipei-main-station',
    name: 'Taipei Main Station',
    nameZh: '臺北車站',
    address: 'No. 3, Sec. 1, Beiping W. Rd, Zhongzheng Dist., Taipei',
    lat: 25.0478,
    lng: 121.517,
    svgX: 560,
    svgY: 300,
    isAirport: false,
  },
  {
    id: 'taipei-101',
    name: 'Taipei 101 / Xinyi District',
    nameZh: '台北101 / 信義區',
    address: 'No. 7, Sec. 5, Xinyi Rd, Xinyi Dist., Taipei',
    lat: 25.033,
    lng: 121.5654,
    svgX: 720,
    svgY: 370,
    isAirport: false,
  },
  {
    id: 'ximending',
    name: 'Ximending',
    nameZh: '西門町',
    address: 'Ximending Pedestrian Area, Wanhua Dist., Taipei',
    lat: 25.0421,
    lng: 121.5081,
    svgX: 520,
    svgY: 340,
    isAirport: false,
  },
  {
    id: 'grand-hyatt',
    name: 'Grand Hyatt Taipei',
    nameZh: '台北君悅酒店',
    address: 'No. 2, Songshou Rd, Xinyi Dist., Taipei',
    lat: 25.0356,
    lng: 121.5645,
    svgX: 705,
    svgY: 350,
    isAirport: false,
  },
  {
    id: 'beitou',
    name: 'Beitou Hot Spring Resort',
    nameZh: '北投溫泉區',
    address: 'Zhongshan Rd, Beitou Dist., Taipei',
    lat: 25.1367,
    lng: 121.5084,
    svgX: 540,
    svgY: 90,
    isAirport: false,
  },
  {
    id: 'yehliu',
    name: 'Yehliu Geopark',
    nameZh: '野柳地質公園',
    address: 'No. 167-1, Kantung Rd, Wanli Dist., New Taipei City',
    lat: 25.2036,
    lng: 121.69,
    svgX: 880,
    svgY: 40,
    isAirport: false,
  },
  {
    id: 'jiufen',
    name: 'Jiufen Old Street',
    nameZh: '九份老街',
    address: 'Jishan St, Ruifang Dist., New Taipei City',
    lat: 25.1097,
    lng: 121.8443,
    svgX: 980,
    svgY: 140,
    isAirport: false,
  },
  {
    id: 'danshui',
    name: 'Danshui Riverside',
    nameZh: '淡水河岸',
    address: 'Zhongzheng Rd, Tamsui Dist., New Taipei City',
    lat: 25.17,
    lng: 121.4498,
    svgX: 400,
    svgY: 60,
    isAirport: false,
  },
  {
    id: 'neihu-business',
    name: 'Neihu Business District',
    nameZh: '內湖科技園區',
    address: 'Sec. 1, Ruiguang Rd, Neihu Dist., Taipei',
    lat: 25.07,
    lng: 121.575,
    svgX: 750,
    svgY: 230,
    isAirport: false,
  },
  {
    id: 'w-hotel',
    name: 'W Taipei',
    nameZh: '台北W飯店',
    address: 'No. 10, Zhongxiao E. Rd Sec. 5, Xinyi Dist., Taipei',
    lat: 25.0402,
    lng: 121.5654,
    svgX: 715,
    svgY: 330,
    isAirport: false,
  },
]

export const getLocation = (id: string): LocationRef => {
  const found = LOCATIONS.find((l) => l.id === id)
  if (!found) throw new Error(`Unknown location id: ${id}`)
  return found
}

export const AIRPORTS = LOCATIONS.filter((l) => l.isAirport)
export const NON_AIRPORTS = LOCATIONS.filter((l) => !l.isAirport)

export const MAP_CENTER: [number, number] = [25.06, 121.46]
export const SVG_VIEWBOX = { width: 1000, height: 600 }
