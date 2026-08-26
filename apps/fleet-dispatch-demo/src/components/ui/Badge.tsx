import type { ReactNode } from 'react'
import clsx from 'clsx'

type Tone = 'cyan' | 'purple' | 'pink' | 'amber' | 'lime' | 'slate' | 'red' | 'green'

const TONE_CLASSES: Record<Tone, string> = {
  cyan: 'bg-cyan-400/15 text-cyan-300 ring-cyan-400/30',
  purple: 'bg-purple-400/15 text-purple-300 ring-purple-400/30',
  pink: 'bg-pink-400/15 text-pink-300 ring-pink-400/30',
  amber: 'bg-amber-400/15 text-amber-300 ring-amber-400/30',
  lime: 'bg-lime-400/15 text-lime-300 ring-lime-400/30',
  slate: 'bg-slate-400/15 text-slate-300 ring-slate-400/30',
  red: 'bg-red-400/15 text-red-300 ring-red-400/30',
  green: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30',
}

export function Badge({
  children,
  tone = 'slate',
  pulse = false,
  className,
}: {
  children: ReactNode
  tone?: Tone
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {pulse && <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>}
      {children}
    </span>
  )
}
