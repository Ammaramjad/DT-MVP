import { useEffect, useState } from 'react'

export type MapMode = 'checking' | 'leaflet' | 'fallback'

let cachedMode: MapMode | null = null

// Detects whether OpenStreetMap tiles are reachable from this environment.
// Falls back to a fully offline stylized SVG map when they aren't, so the
// demo always looks intentional rather than broken.
export function useMapHealthCheck(): MapMode {
  const [mode, setMode] = useState<MapMode>(cachedMode ?? 'checking')

  useEffect(() => {
    if (cachedMode) {
      setMode(cachedMode)
      return
    }

    let settled = false
    const img = new Image()
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      cachedMode = 'fallback'
      setMode('fallback')
    }, 4000)

    img.onload = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      cachedMode = 'leaflet'
      setMode('leaflet')
    }
    img.onerror = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      cachedMode = 'fallback'
      setMode('fallback')
    }
    img.src = 'https://a.tile.openstreetmap.org/10/838/403.png'

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  return mode
}
