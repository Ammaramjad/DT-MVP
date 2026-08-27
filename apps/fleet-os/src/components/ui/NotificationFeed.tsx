import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { formatRelative, notificationVars } from '../../lib/format'
import { useLang } from '../../i18n'
import { ChannelBadge } from './OrderBadges'

const ICONS = { INFO: Info, SUCCESS: CheckCircle2, WARNING: AlertTriangle, ERROR: XCircle }
const COLORS = { INFO: 'text-cyan-300', SUCCESS: 'text-emerald-300', WARNING: 'text-amber-300', ERROR: 'text-red-300' }

export function NotificationFeed({ limit = 12 }: { limit?: number }) {
  const { t, lang } = useLang()
  const notifications = useFleetStore((s) => s.notifications).slice(0, limit)

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {notifications.map((n) => {
          const Icon = ICONS[n.kind]
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.03] p-2.5"
            >
              <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${COLORS[n.kind]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-100">{t(n.titleKey)}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">{formatRelative(n.timestamp, lang)}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{t(n.messageKey, notificationVars(n, lang))}</p>
                {n.channels && n.channels.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {n.channels.map((c) => (
                      <ChannelBadge key={c} channel={c} compact />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
      {notifications.length === 0 && <p className="p-4 text-center text-xs text-slate-500">{t('control.noOrders')}</p>}
    </div>
  )
}
