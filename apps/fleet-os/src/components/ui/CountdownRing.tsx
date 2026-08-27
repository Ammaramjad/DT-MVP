import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

/**
 * A glowing radial countdown used for the driver-response escalation ladder —
 * inspired by the glowing dial/slider motion pattern from the animation
 * research (a value-driven glow following a ring, big numeric readout).
 */
export function CountdownRing({
  sentAt,
  respondBy,
  size = 44,
  tone = 'cyan',
}: {
  sentAt: number
  respondBy: number
  size?: number
  tone?: 'cyan' | 'amber' | 'red'
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [])

  const total = Math.max(1, respondBy - sentAt)
  const remaining = Math.max(0, respondBy - now)
  const progress = Math.min(1, Math.max(0, remaining / total))
  const seconds = Math.ceil(remaining / 1000)

  const radius = size / 2 - 4
  const circumference = 2 * Math.PI * radius
  const toneColors: Record<string, string> = { cyan: '#22d3ee', amber: '#fbbf24', red: '#f87171' }
  const color = toneColors[tone]

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.25, ease: 'linear' }}
        />
      </svg>
      <div className={clsx('absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums', tone === 'red' ? 'text-red-300' : 'text-slate-100')}>
        {seconds}s
      </div>
    </div>
  )
}
