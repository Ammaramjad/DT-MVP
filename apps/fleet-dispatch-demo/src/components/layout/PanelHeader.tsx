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
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 sm:px-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              light ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white' : 'glass-panel text-cyan-300',
            )}
          >
            {icon}
          </div>
        )}
        <div>
          <h1 className={clsx('text-lg font-bold sm:text-xl', light ? 'text-slate-900' : 'text-white')}>{title}</h1>
          {subtitle && <p className={clsx('text-xs sm:text-sm', light ? 'text-slate-500' : 'text-slate-400')}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={clsx(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1',
            light ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30',
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          {t('common.liveSynced')}
        </motion.div>
        {right}
      </div>
    </div>
  )
}
