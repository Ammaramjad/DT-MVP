import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Languages, ListChecks, Sparkles } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { SourceBadge } from '../../components/ui/OrderBadges'
import { formatClock, formatTWD } from '../../lib/format'
import { translationQueueOrders, SOURCE_LANGUAGE_LABEL } from '../../lib/translation'
import { useLang } from '../../i18n'

/** 翻譯校對 (Translation Proofreading) — a queue for orders that arrived
 * from a foreign-language OTA/LINE channel and need a human to proof the
 * AI-pretranslated Traditional Chinese working copy before it's treated as
 * final. Mirrors the reference site's dedicated 翻譯校對 sidebar module,
 * which this app previously had no equivalent for at all. */
export default function TranslationQaPanel() {
  const { t, lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const submitTranslationReview = useFleetStore((s) => s.submitTranslationReview)

  const pending = useMemo(() => translationQueueOrders(orders), [orders])
  const confirmedToday = useMemo(() => orders.filter((o) => o.translationStatus === 'CONFIRMED').length, [orders])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = orders.find((o) => o.id === selectedId) ?? pending[0] ?? null
  const [draft, setDraft] = useState<string | null>(null)
  const editedText = draft ?? selected?.notes ?? ''

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setDraft(null)
  }

  const handleConfirm = () => {
    if (!selected) return
    submitTranslationReview(selected.id, editedText.trim())
    setDraft(null)
    const remaining = pending.filter((o) => o.id !== selected.id)
    setSelectedId(remaining[0]?.id ?? null)
  }

  return (
    <FleetOsPage title={t('fleetos.translationQa.title')} subtitle={t('fleetos.translationQa.subtitle')} icon={<Languages className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={<ListChecks className="h-4 w-4" />} label={t('fleetos.translationQa.pendingCount')} value={pending.length} tone="amber" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label={t('fleetos.translationQa.confirmedCount')} value={confirmedToday} tone="lime" />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label={t('fleetos.translationQa.totalOrders')} value={orders.length} tone="cyan" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.4fr]">
        <div className="glass-panel max-h-[640px] overflow-y-auto rounded-2xl p-2" data-testid="translation-qa-queue">
          <p className="mb-1 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('fleetos.translationQa.queueTitle', { n: pending.length })}
          </p>
          {pending.length === 0 && <p className="p-6 text-center text-xs text-slate-500">{t('fleetos.translationQa.empty')}</p>}
          {pending.map((o) => (
            <button
              key={o.id}
              onClick={() => handleSelect(o.id)}
              data-testid="translation-qa-queue-item"
              data-order-no={o.orderNo}
              className={`mb-1 flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition ${
                selected?.id === o.id ? 'bg-cyan-400/[0.08] ring-1 ring-cyan-400/30' : 'hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">{formatClock(o.scheduledTime, lang)}</span>
                <SourceBadge channel={o.channel} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-slate-100">{o.customer.name}</span>
                {o.sourceLanguage && <Badge tone="purple">{SOURCE_LANGUAGE_LABEL[o.sourceLanguage][lang]}</Badge>}
                <Badge tone="amber">{t('fleetos.translationQa.aiDraft')}</Badge>
              </div>
              <span className="font-mono text-[10.5px] text-slate-500">{o.orderNo}</span>
            </button>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-4">
          {!selected ? (
            <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-slate-500">{t('fleetos.translationQa.selectPrompt')}</div>
          ) : (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">{selected.orderNo}</span>
                  <span className="text-xs text-slate-500">
                    {t('fleetos.translationQa.sourceLangLabel')}: {selected.sourceLanguage ? SOURCE_LANGUAGE_LABEL[selected.sourceLanguage][lang] : '—'}
                  </span>
                </div>
                <Badge tone={selected.translationStatus === 'CONFIRMED' ? 'green' : 'amber'}>
                  {selected.translationStatus === 'CONFIRMED' ? t('fleetos.translationQa.statusConfirmed') : t('fleetos.translationQa.statusPending')}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-400/[0.08] px-3 py-2 text-[11.5px] text-amber-200">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                {t('fleetos.translationQa.aiNotice')}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-white/[0.02] p-3 text-xs text-slate-400 sm:grid-cols-2">
                <p><span className="text-slate-500">{t('fleetos.translationQa.customer')}:</span> {selected.customer.name}</p>
                <p><span className="text-slate-500">{t('fleetos.translationQa.route')}:</span> {(lang === 'zh' ? selected.pickup.nameZh : selected.pickup.name)} → {(lang === 'zh' ? selected.dropoff.nameZh : selected.dropoff.name)}</p>
                <p><span className="text-slate-500">{t('fleetos.translationQa.amount')}:</span> {formatTWD(selected.priceEstimate)}</p>
                <p><span className="text-slate-500">{t('fleetos.translationQa.scheduled')}:</span> {formatClock(selected.scheduledTime, lang)}</p>
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {t('fleetos.translationQa.originalLabel')}
                </p>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-slate-300" data-testid="translation-qa-original">
                  {selected.originalNoteText}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {t('fleetos.translationQa.draftLabel')}
                </p>
                <textarea
                  value={editedText}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={selected.translationStatus === 'CONFIRMED'}
                  rows={4}
                  data-testid="translation-qa-editable-draft"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-100 outline-none focus:border-cyan-400/40 disabled:opacity-60"
                />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <p className="text-[11px] text-slate-500">{t('fleetos.translationQa.confirmHint')}</p>
                {selected.translationStatus === 'PENDING' ? (
                  <Button size="sm" onClick={handleConfirm} data-testid="translation-qa-confirm">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('fleetos.translationQa.confirmButton')}
                  </Button>
                ) : (
                  <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> {t('fleetos.translationQa.statusConfirmed')}</Badge>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </FleetOsPage>
  )
}
