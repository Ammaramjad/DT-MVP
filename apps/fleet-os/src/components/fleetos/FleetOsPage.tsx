import type { ReactNode } from 'react'
import { PanelHeader } from '../layout/PanelHeader'
import { FleetOsNav } from './FleetOsNav'

/** Shared page chrome for every /fleet-os/* module screen: same dark
 * command-center header + sticky module nav, so new modules feel native
 * to the existing Fleet OS rather than bolted on. */
export function FleetOsPage({
  title,
  subtitle,
  icon,
  right,
  children,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-mission-950 bg-noise pb-28 text-white">
      <PanelHeader title={title} subtitle={subtitle} icon={icon} right={right} />
      <div className="px-4 pt-3 sm:px-6">
        <FleetOsNav />
      </div>
      <div className="px-4 sm:px-6">{children}</div>
    </div>
  )
}
