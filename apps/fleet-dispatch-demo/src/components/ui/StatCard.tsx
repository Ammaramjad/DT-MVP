import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { StatCounter } from './StatCounter'

export function StatCard({
  icon,
  label,
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  tone = 'cyan',
}: {
  icon: ReactNode
  label: string
  value: number
  suffix?: string
  prefix?: string
  decimals?: number
  tone?: 'cyan' | 'purple' | 'amber' | 'lime'
}) {
  const toneClasses: Record<string, string> = {
    cyan: 'text-cyan-300 bg-cyan-400/10',
    purple: 'text-purple-300 bg-purple-400/10',
    amber: 'text-amber-300 bg-amber-400/10',
    lime: 'text-lime-300 bg-lime-400/10',
  }

  return (
    <motion.div layout className="glass-panel rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-white">
        <StatCounter value={value} suffix={suffix} prefix={prefix} decimals={decimals} />
      </div>
    </motion.div>
  )
}
