export type TimeOfDay = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'sunset' | 'evening' | 'night'
export type WeatherState = 'clear' | 'cloudy' | 'rain'

export type LightProfile = {
  state: TimeOfDay
  sky: string
  fog: string
  key: string
  ambient: number
  exposure: number
  practicalLights: boolean
}

export function resolveTimeOfDay(time: string): TimeOfDay {
  const hour = Number(time.split(':')[0]) + Number(time.split(':')[1] ?? 0) / 60
  if (hour < 6) return 'night'
  if (hour < 8) return 'dawn'
  if (hour < 11) return 'morning'
  if (hour < 15) return 'midday'
  if (hour < 17.5) return 'afternoon'
  if (hour < 19) return 'sunset'
  if (hour < 21) return 'evening'
  return 'night'
}

export const LIGHT_PROFILES: Record<TimeOfDay, LightProfile> = {
  dawn: { state: 'dawn', sky: '#a8cce6', fog: '#b9d2e3', key: '#ffd7ae', ambient: .7, exposure: .95, practicalLights: true },
  morning: { state: 'morning', sky: '#b9ddf5', fog: '#cde3ef', key: '#fff0d1', ambient: .9, exposure: 1.05, practicalLights: false },
  midday: { state: 'midday', sky: '#86c8f0', fog: '#c8e3f1', key: '#fffaf0', ambient: 1.1, exposure: 1.12, practicalLights: false },
  afternoon: { state: 'afternoon', sky: '#9ed2ee', fog: '#c5deeb', key: '#ffe4bd', ambient: .92, exposure: 1.02, practicalLights: false },
  sunset: { state: 'sunset', sky: '#e8a886', fog: '#d6b2a5', key: '#ffb982', ambient: .55, exposure: .9, practicalLights: true },
  evening: { state: 'evening', sky: '#315578', fog: '#26435f', key: '#79b9ef', ambient: .35, exposure: .78, practicalLights: true },
  night: { state: 'night', sky: '#071a2d', fog: '#0b2237', key: '#75bfff', ambient: .22, exposure: .68, practicalLights: true },
}
