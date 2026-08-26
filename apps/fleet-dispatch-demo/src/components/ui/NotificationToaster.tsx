import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, MessageCircle, XCircle } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import type { AppNotification } from '../../types'

const ICONS: Record<AppNotification['kind'], typeof Info> = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR: XCircle,
}

const KIND_CLASSES: Record<AppNotification['kind'], string> = {
  INFO: 'border-cyan-400/30 text-cyan-300',
  SUCCESS: 'border-emerald-400/30 text-emerald-300',
  WARNING: 'border-amber-400/30 text-amber-300',
  ERROR: 'border-red-400/30 text-red-300',
}

export function NotificationToaster() {
  const { t } = useLang()
  const notifications = useFleetStore((s) => s.notifications)
  const [visible, setVisible] = useState<AppNotification[]>([])
  const seenIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    const fresh = notifications.filter((n) => !seenIds.current.has(n.id)).slice(0, 3)
    if (fresh.length === 0) return
    fresh.forEach((n) => seenIds.current.add(n.id))
    setVisible((prev) => [...fresh, ...prev.filter((p) => !fresh.some((f) => f.id === p.id))].slice(0, 4))

    fresh.forEach((n) => {
      window.setTimeout(() => {
        setVisible((prev) => prev.filter((v) => v.id !== n.id))
      }, 5200)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications])

  return (
    // Starts below the DemoModeSwitcher pill (also fixed top-right) so a
    // stream of toasts can never cover/intercept clicks on that pill.
    <div className="pointer-events-none fixed right-4 top-16 z-[1000] flex w-[min(360px,90vw)] flex-col gap-2">
      <AnimatePresence>
        {visible.map((n) => {
          const Icon = ICONS[n.kind]
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className={`glass-panel pointer-events-auto flex items-start gap-2.5 rounded-xl border-l-2 p-3 shadow-2xl ${KIND_CLASSES[n.kind]}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <MessageCircle className="h-3 w-3 opacity-60" /> {t(n.titleKey)}
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-300">{t(n.messageKey, n.params)}</p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
