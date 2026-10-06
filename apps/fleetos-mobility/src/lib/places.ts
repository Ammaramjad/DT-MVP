export interface Place {
  zh: string;
  en: string;
  lat: number;
  lng: number;
  aliases?: string[];
}

export const PLACES: Place[] = [
  { zh: "桃園國際機場", en: "Taoyuan Airport (TPE)", lat: 25.0797, lng: 121.2342, aliases: ["桃園機場", "TPE", "taoyuan"] },
  { zh: "松山機場", en: "Songshan Airport (TSA)", lat: 25.0694, lng: 121.5525, aliases: ["TSA", "songshan"] },
  { zh: "台中清泉崗機場", en: "Taichung Airport (RMQ)", lat: 24.2647, lng: 120.6208, aliases: ["清泉崗", "RMQ"] },
  { zh: "高雄國際機場", en: "Kaohsiung Airport (KHH)", lat: 22.5771, lng: 120.3500, aliases: ["高雄機場", "小港機場", "KHH"] },
  { zh: "台北101", en: "Taipei 101", lat: 25.0339, lng: 121.5645, aliases: ["101"] },
  { zh: "台北車站", en: "Taipei Main Station", lat: 25.0478, lng: 121.5170, aliases: ["北車", "taipei station"] },
  { zh: "台北", en: "Taipei", lat: 25.0375, lng: 121.5637, aliases: ["臺北", "taipei"] },
  { zh: "新北", en: "New Taipei", lat: 25.012, lng: 121.4657, aliases: ["板橋", "new taipei"] },
  { zh: "基隆", en: "Keelung", lat: 25.1276, lng: 121.7392 },
  { zh: "九份", en: "Jiufen", lat: 25.1092, lng: 121.8445, aliases: ["jiufen"] },
  { zh: "淡水", en: "Tamsui", lat: 25.1700, lng: 121.4400 },
  { zh: "宜蘭", en: "Yilan", lat: 24.7570, lng: 121.7530 },
  { zh: "桃園", en: "Taoyuan", lat: 24.9937, lng: 121.3010 },
  { zh: "新竹", en: "Hsinchu", lat: 24.8138, lng: 120.9675 },
  { zh: "台中", en: "Taichung", lat: 24.1477, lng: 120.6736, aliases: ["臺中", "taichung"] },
  { zh: "日月潭", en: "Sun Moon Lake", lat: 23.8570, lng: 120.9150, aliases: ["sun moon lake"] },
  { zh: "阿里山", en: "Alishan", lat: 23.5100, lng: 120.8020 },
  { zh: "嘉義", en: "Chiayi", lat: 23.4801, lng: 120.4491 },
  { zh: "台南", en: "Tainan", lat: 22.9999, lng: 120.2270, aliases: ["臺南"] },
  { zh: "高雄", en: "Kaohsiung", lat: 22.6273, lng: 120.3014, aliases: ["kaohsiung"] },
  { zh: "墾丁", en: "Kenting", lat: 21.9480, lng: 120.7798, aliases: ["kenting"] },
  { zh: "花蓮", en: "Hualien", lat: 23.9872, lng: 121.6015 },
  { zh: "太魯閣", en: "Taroko", lat: 24.1590, lng: 121.6210, aliases: ["太魯閣國家公園", "taroko"] },
  { zh: "清水斷崖", en: "Qingshui Cliff", lat: 24.2120, lng: 121.6600 },
  { zh: "台東", en: "Taitung", lat: 22.7583, lng: 121.1444 },
];

export function findPlace(text: string): Place | undefined {
  const q = text.trim().toLowerCase();
  if (!q) return undefined;
  const scored = PLACES.map((p) => {
    const names = [p.zh, p.en, ...(p.aliases ?? [])].map((n) => n.toLowerCase());
    const hit = names.find((n) => q.includes(n) || n.includes(q));
    return hit ? { p, len: hit.length } : null;
  }).filter(Boolean) as { p: Place; len: number }[];
  scored.sort((a, b) => b.len - a.len);
  return scored[0]?.p;
}

export function roadDistanceKm(a: Place, b: Place): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const straight = 2 * R * Math.asin(Math.sqrt(h));
  return Math.max(3, Math.round(straight * 1.35));
}
