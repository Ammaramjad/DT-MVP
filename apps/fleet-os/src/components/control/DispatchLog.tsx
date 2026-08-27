import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, History } from 'lucide-react'
import type { DispatchAttempt } from '../../types'
import { ChannelBadge } from '../ui/OrderBadges'
import { formatRelative } from '../../lib/format'
import { useLang } from '../../i18n'

const STATUS_KEY: Record<DispatchAttempt['status'], string> = {
  AWAITING_RESPONSE: 'dispatch.awaiting',
  ACCEPTED: 'dispatch.accepted',
  DECLINED: 'dispatch.declined',
  TIMED_OUT: 'dispatch.timedOut',
}

const STATUS_TONE: Record<DispatchAttempt['status'], string> = {
  AWAITING_RESPONSE: 'text-cyan-300',
  ACCEPTED: 'text-emerald-300',
  DECLINED: 'text-amber-300',
  TIMED_OUT: 'text-red-300',
}

export function DispatchLog({ attempts }: { attempts: DispatchAttempt[] }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  if (attempts.length === 0) return null

  return (
    <div className="mt-2 rounded-lg bg-white/[0.03]" data-testid="dispatch-log">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-200"
      >
        <span className="flex items-center gap-1.5">
          <History className="h-3 w-3" /> {t('control.notificationLog', { n: attempts.length })}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
              {attempts.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-1.5 rounded-md bg-black/20 px-2 py-1.5 text-[11px]">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{t('dispatch.stage', { n: a.stage })}</span>
                  {a.channels.map((c) => (
                    <ChannelBadge key={c} channel={c} compact />
                  ))}
                  <span className={`ml-auto font-medium ${STATUS_TONE[a.status]}`}>{t(STATUS_KEY[a.status])}</span>
                  <span className="text-slate-500">{formatRelative(a.sentAt, lang)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
