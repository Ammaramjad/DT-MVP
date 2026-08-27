import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export function GlassCard({
  children,
  className,
  light = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; light?: boolean }) {
  return (
    <div
      className={clsx(
        'rounded-2xl',
        light ? 'glass-panel-light shadow-xl shadow-slate-200/60' : 'glass-panel',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
