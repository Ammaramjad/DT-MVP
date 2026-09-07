import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Info, MessageCircle, X, XCircle } from 'lucide-react'
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
  const location = useLocation()
  const notifications = useFleetStore((s) => s.notifications)
  const [visible, setVisible] = useState<AppNotification[]>([])
  const isFirstMount = useRef(true)
  const seenIds = useRef<Set<string>>(new Set())

  const isStandaloneApp = location.pathname.startsWith('/driver') || location.pathname.startsWith('/customer')

  // Max 2 toasts shown at once, automatically dismissed after 3.2 seconds
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      notifications.forEach((n) => seenIds.current.add(n.id))
      return
    }

    const fresh = notifications.filter((n) => !seenIds.current.has(n.id))
    if (fresh.length === 0) return
    fresh.forEach((n) => seenIds.current.add(n.id))
    setVisible((prev) => [...fresh, ...prev].slice(0, 2))

    fresh.forEach((n) => {
      window.setTimeout(() => {
        setVisible((prev) => prev.filter((v) => v.id !== n.id))
      }, 3200)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications])

  const dismissToast = (id: string) => {
    setVisible((prev) => prev.filter((v) => v.id !== id))
  }

  if (isStandaloneApp) return null

  return (
    // Placed at bottom-right with bottom-3 right-3, max 2 toasts, pointer-events-none container
    // so toasts NEVER block table content, pagination or action buttons.
    <div
      className="pointer-events-none fixed bottom-3 right-3 z-[800] flex w-[min(280px,80vw)] flex-col gap-1.5 max-h-[160px] overflow-hidden"
      data-testid="notification-toaster"
    >
      <AnimatePresence mode="popLayout">
        {visible.map((n) => {
          const Icon = ICONS[n.kind]
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className={`glass-panel pointer-events-auto relative flex items-start gap-2 rounded-xl border-l-2 p-2 shadow-2xl backdrop-blur-xl bg-slate-950/95 ${KIND_CLASSES[n.kind]}`}
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-1 text-[10.5px] font-semibold text-white">
                  <MessageCircle className="h-2.5 w-2.5 opacity-60" /> {t(n.titleKey)}
                </div>
                <p className="mt-0.5 text-[9.5px] leading-snug text-slate-300 line-clamp-2">{t(n.messageKey, n.params)}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(n.id)}
                aria-label="Dismiss notification"
                className="absolute right-1 top-1 rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
