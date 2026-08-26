import type { FlightInfo, FlightStatusKind } from '../types'
import { hashSeed } from './geo'
import { translate, type Lang } from '../i18n/translations'

const AIRLINES: { code: string; name: string }[] = [
  { code: 'CI', name: 'China Airlines' },
  { code: 'BR', name: 'EVA Air' },
  { code: 'CX', name: 'Cathay Pacific' },
  { code: 'SQ', name: 'Singapore Airlines' },
  { code: 'NH', name: 'ANA' },
  { code: 'JL', name: 'Japan Airlines' },
  { code: 'TG', name: 'Thai Airways' },
  { code: 'TR', name: 'Scoot' },
  { code: 'JX', name: 'Starlux Airlines' },
]

function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function randomFlightNumber(): string {
  const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)]
  const num = 100 + Math.floor(Math.random() * 800)
  return `${airline.code}${num}`
}

export function lookupFlight(flightNumber: string, scheduledIso: string): FlightInfo {
  const code = flightNumber.slice(0, 2).toUpperCase()
  const airline = AIRLINES.find((a) => a.code === code) ?? AIRLINES[0]
  const seed = hashSeed(flightNumber + scheduledIso)
  const r = seededRand(seed)

  let status: FlightStatusKind = 'ON_TIME'
  let delayMinutes = 0
  if (r > 0.82) {
    status = 'DELAYED'
    delayMinutes = 15 + Math.floor(seededRand(seed + 1) * 60)
  } else if (r > 0.68) {
    status = 'BOARDING'
  } else if (r > 0.6) {
    status = 'LANDED'
  }

  const gateLetter = 'ABCDEF'[Math.floor(seededRand(seed + 2) * 6)]
  const gateNumber = 1 + Math.floor(seededRand(seed + 3) * 28)
  const scheduled = new Date(scheduledIso)
  const estimated = new Date(scheduled.getTime() + delayMinutes * 60_000)

  return {
    flightNumber: flightNumber.toUpperCase(),
    airline: airline.name,
    status,
    gate: `${gateLetter}${gateNumber}`,
    scheduledTime: scheduled.toISOString(),
    estimatedTime: estimated.toISOString(),
    delayMinutes,
  }
}

export function driftFlightStatus(info: FlightInfo): FlightInfo {
  const roll = Math.random()
  if (roll < 0.5) return info

  if (info.status === 'ON_TIME' && roll > 0.9) {
    const delayMinutes = 10 + Math.floor(Math.random() * 35)
    return {
      ...info,
      status: 'DELAYED',
      delayMinutes,
      estimatedTime: new Date(new Date(info.scheduledTime).getTime() + delayMinutes * 60_000).toISOString(),
    }
  }
  if (info.status === 'DELAYED' && roll > 0.85) {
    return { ...info, status: 'BOARDING' }
  }
  if (info.status === 'BOARDING' && roll > 0.8) {
    return { ...info, status: 'LANDED' }
  }
  return info
}

export function flightStatusLabel(status: FlightStatusKind, lang: Lang = 'en'): string {
  return translate(lang, `flight.${status}`)
}
