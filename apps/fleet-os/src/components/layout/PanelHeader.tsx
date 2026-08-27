import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useLang } from '../../i18n'

export function PanelHeader({
  title,
  subtitle,
  icon,
  light = false,
  right,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  light?: boolean
  right?: ReactNode
}) {
  const { t } = useLang()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-6 pl-4 pr-24 sm:pl-6 sm:pr-28">
      <div className="flex items-center gap-3.5">
        {icon && (
          <div
            className={clsx(
              'flex h-11 w-11 items-center justify-center rounded-2xl shadow-xl transition',
              light
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20'
                : 'glass-panel-glow border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]',
            )}
          >
            {icon}
          </div>
        )}
        <div>
          <h1 className={clsx('text-xl font-black tracking-tight sm:text-2xl', light ? 'text-slate-900' : 'text-white')}>{title}</h1>
          {subtitle && <p className={clsx('text-xs sm:text-sm mt-0.5', light ? 'text-slate-500' : 'text-slate-400')}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={clsx(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ring-1 shadow-sm',
            light ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
          )}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          {t('common.liveSynced')}
        </motion.div>
        {right}
      </div>
    </div>
  )
}
