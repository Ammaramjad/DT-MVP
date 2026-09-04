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
  active = false,
  onClick,
  activeFilterTag,
  testId,
}: {
  icon: ReactNode
  label: string
  value: number
  suffix?: string
  prefix?: string
  decimals?: number
  tone?: 'cyan' | 'purple' | 'amber' | 'lime' | 'red' | 'pink'
  active?: boolean
  onClick?: () => void
  activeFilterTag?: string
  testId?: string
}) {
  const toneClasses: Record<string, string> = {
    cyan: 'text-cyan-300 bg-cyan-400/15 border border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.2)]',
    purple: 'text-purple-300 bg-purple-400/15 border border-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]',
    amber: 'text-amber-300 bg-amber-400/15 border border-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.2)]',
    lime: 'text-lime-300 bg-lime-400/15 border border-lime-400/30 shadow-[0_0_12px_rgba(163,230,53,0.2)]',
    red: 'text-rose-300 bg-rose-400/15 border border-rose-400/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]',
    pink: 'text-pink-300 bg-pink-400/15 border border-pink-400/30 shadow-[0_0_12px_rgba(244,114,182,0.2)]',
  }
  const glowColor: Record<string, string> = {
    cyan: 'rgba(34,211,238,0.45)',
    purple: 'rgba(168,85,247,0.45)',
    amber: 'rgba(251,191,36,0.45)',
    lime: 'rgba(163,230,53,0.45)',
    red: 'rgba(244,63,94,0.5)',
    pink: 'rgba(244,114,182,0.45)',
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
      onClick={onClick}
      data-testid={testId}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`glass-panel-glow relative rounded-3xl p-4.5 transition ${
        onClick ? 'cursor-pointer select-none' : ''
      } ${
        active
          ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_24px_rgba(34,211,238,0.35)] ring-2 ring-cyan-400/80'
          : 'hover:border-white/20'
      }`}
      animate={{
        boxShadow: active
          ? `0 0 0 2px ${glowColor[tone]}, 0 0 24px ${glowColor[tone]}`
          : flash
          ? `0 0 0 1.5px ${glowColor[tone]}, 0 0 28px ${glowColor[tone]}`
          : '0 20px 40px -15px rgba(0,0,0,0.6)',
      }}
      transition={{ duration: 0.3 }}
    >
      {active && (
        <span className="absolute -top-2.5 right-4 rounded-full bg-cyan-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-950 shadow-md">
          {activeFilterTag || 'FILTER ACTIVE'}
        </span>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneClasses[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2.5 text-2xl font-black text-white tracking-tight">
        <StatCounter value={value} suffix={suffix} prefix={prefix} decimals={decimals} />
      </div>
    </motion.div>
  )
}
