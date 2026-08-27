import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ListTree } from 'lucide-react'
import type { StatusHistoryEntry } from '../../types'
import { orderStatusLabel, formatRelative } from '../../lib/format'
import { useLang } from '../../i18n'

/** Full amendment/status audit trail per order — who/what changed it and
 * when (Phase 1 depth item: "full order amendment/cancellation audit
 * trail visible in the Control Center"). */
export function StatusHistoryTimeline({ history }: { history: StatusHistoryEntry[] }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  if (history.length === 0) return null

  return (
    <div className="mt-2 rounded-lg bg-white/[0.03]" data-testid="status-history">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-200"
      >
        <span className="flex items-center gap-1.5">
          <ListTree className="h-3 w-3" /> {t('control.statusTimeline', { n: history.length })}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <ol className="flex flex-col gap-1.5 px-2.5 pb-2.5" data-testid="status-history-list">
              {history.map((h, i) => (
                <li key={h.id} className="flex items-center gap-2 text-[11px]">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${i === history.length - 1 ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                  <span className="font-medium text-slate-200">{orderStatusLabel(h.status, lang)}</span>
                  <span className="text-slate-500">· {t(`actor.${h.actor}`)}</span>
                  <span className="ml-auto shrink-0 text-slate-500">{formatRelative(h.at, lang)}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
