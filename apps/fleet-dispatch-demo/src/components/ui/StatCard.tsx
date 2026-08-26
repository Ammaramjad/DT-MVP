import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  tone?: 'cyan' | 'purple' | 'amber' | 'lime' | 'red' | 'pink'
}) {
  const toneClasses: Record<string, string> = {
    cyan: 'text-cyan-300 bg-cyan-400/10',
    purple: 'text-purple-300 bg-purple-400/10',
    amber: 'text-amber-300 bg-amber-400/10',
    lime: 'text-lime-300 bg-lime-400/10',
    red: 'text-red-300 bg-red-400/10',
    pink: 'text-pink-300 bg-pink-400/10',
  }
  const glowColor: Record<string, string> = {
    cyan: 'rgba(34,211,238,0.35)',
    purple: 'rgba(168,85,247,0.35)',
    amber: 'rgba(251,191,36,0.35)',
    lime: 'rgba(163,230,53,0.35)',
    red: 'rgba(248,113,113,0.4)',
    pink: 'rgba(244,114,182,0.35)',
  }

  const prevValue = useRef(value)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value
      setFlash(true)
      const t = window.setTimeout(() => setFlash(false), 650)
      return () => window.clearTimeout(t)
    }
  }, [value])

  return (
    <motion.div
      layout
      className="glass-panel rounded-2xl p-4"
      animate={{ boxShadow: flash ? `0 0 0 1px ${glowColor[tone]}, 0 0 24px ${glowColor[tone]}` : '0 0 0 0 rgba(0,0,0,0)' }}
      transition={{ duration: 0.5 }}
    >
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
