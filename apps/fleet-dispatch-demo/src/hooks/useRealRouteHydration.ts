import { useEffect } from 'react'
import { useFleetStore } from '../store/useFleetStore'

/** Kicks off, once on app mount, a background attempt to resolve real
 * OSRM road-snapped routes for every seeded order that currently only has
 * the synthetic fallback route — so the demo shows genuine dynamic routing
 * for pre-existing orders too, not just freshly booked ones. */
export function useRealRouteHydration() {
  const hydrateSeedRoutes = useFleetStore((s) => s.hydrateSeedRoutes)

  useEffect(() => {
    hydrateSeedRoutes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
