import { useEffect } from 'react'
import { useFleetStore } from '../store/useFleetStore'
import { TICK_MS } from '../lib/format'

export function useSimulationTicker() {
  const tick = useFleetStore((s) => s.tick)

  useEffect(() => {
    const interval = window.setInterval(() => {
      tick()
    }, TICK_MS)
    return () => window.clearInterval(interval)
  }, [tick])
}
