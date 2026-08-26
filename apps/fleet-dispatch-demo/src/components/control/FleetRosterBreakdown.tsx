import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertOctagon, Users2 } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { driverTierLabel } from '../../lib/format'
import type { DriverTier } from '../../types'

const TIER_ORDER: DriverTier[] = ['OWNED_FLEET', 'PAID_MEMBER', 'OUTSIDE_CONTRACTOR']
const TIER_COLOR: Record<DriverTier, string> = { OWNED_FLEET: 'text-cyan-300', PAID_MEMBER: 'text-purple-300', OUTSIDE_CONTRACTOR: 'text-amber-300' }
const TIER_BAR: Record<DriverTier, string> = { OWNED_FLEET: 'bg-cyan-400', PAID_MEMBER: 'bg-purple-400', OUTSIDE_CONTRACTOR: 'bg-amber-400' }

// Mirrors the reference site's "司機管理" tier breakdown cards (自家車 / 付費會員 / 野司機).
export function FleetRosterBreakdown() {
  const drivers = useFleetStore((s) => s.drivers)
  const now = Date.now()

  const counts = useMemo(() => {
    const total = drivers.length
    return TIER_ORDER.map((tier) => {
      const count = drivers.filter((d) => d.tier === tier).length
      return { tier, count, pct: total === 0 ? 0 : Math.round((count / total) * 100) }
    })
  }, [drivers])

  const flagged = drivers.filter((d) => d.unresponsiveFlagUntil && d.unresponsiveFlagUntil > now)
  const offline = drivers.filter((d) => d.status === 'OFFLINE').length

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Users2 className="h-3.5 w-3.5" /> Fleet Roster
        </p>
        <span className="text-[10px] text-slate-500">{drivers.length} drivers · {offline} offline</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {counts.map(({ tier, count, pct }) => (
          <div key={tier} className="rounded-lg bg-white/[0.03] p-2 text-center">
            <p className={`text-lg font-bold ${TIER_COLOR[tier]}`}>{count}</p>
            <p className="text-[9.5px] leading-tight text-slate-500">{driverTierLabel(tier)}</p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className={`h-full ${TIER_BAR[tier]}`} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
            </div>
          </div>
        ))}
      </div>

      {flagged.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex flex-col gap-1.5">
          {flagged.map((d) => (
            <motion.div
              key={d.id}
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className="flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-400/[0.1] px-2.5 py-1.5 text-[11px] text-red-300"
              data-testid="unresponsive-driver-alert"
            >
              <AlertOctagon className="h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-semibold">{d.name}</span> unresponsive on order {d.unresponsiveOrderNo}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
