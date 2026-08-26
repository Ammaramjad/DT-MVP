import { useState } from 'react'
import { Headset, MessageSquare, Send } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatRelative } from '../../lib/format'
import type { SupportTicketStatus } from '../../types'
import { useLang } from '../../i18n'

const STATUS_TONE: Record<SupportTicketStatus, 'amber' | 'cyan' | 'green' | 'slate'> = { OPEN: 'amber', IN_PROGRESS: 'cyan', RESOLVED: 'green', CLOSED: 'slate' }
const PRIORITY_TONE = { LOW: 'slate', MEDIUM: 'amber', HIGH: 'red' } as const

export default function SupportPanel() {
  const { t, lang } = useLang()
  const tickets = useFleetStore((s) => s.supportTickets)
  const setTicketStatus = useFleetStore((s) => s.setTicketStatus)
  const addTicketMessage = useFleetStore((s) => s.addTicketMessage)
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null)
  const [reply, setReply] = useState('')

  const selected = tickets.find((t2) => t2.id === selectedId) ?? null
  const open = tickets.filter((t2) => t2.status === 'OPEN').length
  const inProgress = tickets.filter((t2) => t2.status === 'IN_PROGRESS').length
  const highPriority = tickets.filter((t2) => t2.priority === 'HIGH' && t2.status !== 'CLOSED' && t2.status !== 'RESOLVED').length

  return (
    <FleetOsPage title={t('fleetos.support.title')} subtitle={t('fleetos.support.subtitle')} icon={<Headset className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Headset className="h-4 w-4" />} label={t('fleetos.support.open')} value={open} tone="amber" />
        <StatCard icon={<MessageSquare className="h-4 w-4" />} label={t('fleetos.support.inProgress')} value={inProgress} tone="cyan" />
        <StatCard icon={<Headset className="h-4 w-4" />} label={t('fleetos.support.highPriority')} value={highPriority} tone="red" />
        <StatCard icon={<Headset className="h-4 w-4" />} label={t('fleetos.support.total')} value={tickets.length} tone="purple" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="glass-panel max-h-[560px] overflow-y-auto rounded-2xl p-2" data-testid="support-ticket-list">
          {tickets.map((tk) => (
            <button
              key={tk.id}
              onClick={() => setSelectedId(tk.id)}
              data-testid="support-ticket-row"
              className={`mb-1 flex w-full flex-col gap-1 rounded-xl p-3 text-left transition ${selectedId === tk.id ? 'bg-cyan-400/10' : 'hover:bg-white/[0.03]'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-300">{tk.ticketNo}</span>
                <Badge tone={STATUS_TONE[tk.status]}>{t(`fleetos.support.status.${tk.status}`)}</Badge>
              </div>
              <p className="truncate text-xs font-medium text-slate-200">{tk.subject}</p>
              <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                <span>{tk.customerName}{tk.orderNo ? ` · ${tk.orderNo}` : ''}</span>
                <Badge tone={PRIORITY_TONE[tk.priority]}>{tk.priority}</Badge>
              </div>
            </button>
          ))}
        </div>

        <div className="glass-panel flex flex-col rounded-2xl p-4" data-testid="support-ticket-detail">
          {selected ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-bold text-white">{selected.ticketNo}</p>
                  <p className="text-xs text-slate-400">{selected.subject}</p>
                </div>
                <Badge tone={STATUS_TONE[selected.status]}>{t(`fleetos.support.status.${selected.status}`)}</Badge>
              </div>
              <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-xl bg-white/[0.02] p-3" style={{ maxHeight: 280 }}>
                {selected.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === 'AGENT' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${m.from === 'AGENT' ? 'bg-cyan-400/15 text-cyan-100' : 'bg-white/5 text-slate-200'}`}>
                      <p>{m.text}</p>
                      <p className="mt-1 text-[9.5px] text-slate-500">{formatRelative(m.at, lang)}</p>
                    </div>
                  </div>
                ))}
                {selected.messages.length === 0 && <p className="py-6 text-center text-[11px] text-slate-500">{t('fleetos.support.noMessages')}</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t('fleetos.support.replyPlaceholder')}
                  data-testid="support-reply-input"
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40"
                />
                <Button
                  size="sm"
                  data-testid="support-reply-send"
                  onClick={() => {
                    if (!reply.trim()) return
                    addTicketMessage(selected.id, reply.trim())
                    setReply('')
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-3 flex gap-1.5">
                {(['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setTicketStatus(selected.id, st)}
                    data-testid={`support-set-${st}`}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                      selected.status === st ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {t(`fleetos.support.status.${st}`)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-xs text-slate-500">{t('fleetos.support.selectHint')}</p>
          )}
        </div>
      </div>
    </FleetOsPage>
  )
}
