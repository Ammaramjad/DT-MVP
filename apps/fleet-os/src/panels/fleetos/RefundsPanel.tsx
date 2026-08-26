import { CheckCircle2, ReceiptText, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatRelative, formatTWD } from '../../lib/format'
import type { RefundRequestStatus } from '../../types'
import { useLang } from '../../i18n'

const STATUS_TONE: Record<RefundRequestStatus, 'amber' | 'green' | 'red' | 'cyan'> = { PENDING: 'amber', APPROVED: 'cyan', REJECTED: 'red', PROCESSED: 'green' }

export default function RefundsPanel() {
  const { t, lang } = useLang()
  const refundRequests = useFleetStore((s) => s.refundRequests)
  const resolveRefund = useFleetStore((s) => s.resolveRefund)

  const pending = refundRequests.filter((r) => r.status === 'PENDING')
  const processed = refundRequests.filter((r) => r.status === 'PROCESSED')
  const totalRefunded = processed.reduce((sum, r) => sum + r.amount, 0)

  return (
    <FleetOsPage title={t('fleetos.refunds.title')} subtitle={t('fleetos.refunds.subtitle')} icon={<ReceiptText className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<ReceiptText className="h-4 w-4" />} label={t('fleetos.refunds.pending')} value={pending.length} tone="amber" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label={t('fleetos.refunds.processed')} value={processed.length} tone="lime" />
        <StatCard icon={<ReceiptText className="h-4 w-4" />} label={t('fleetos.refunds.totalRefunded')} value={totalRefunded} prefix="NT$" tone="purple" />
        <StatCard icon={<ReceiptText className="h-4 w-4" />} label={t('fleetos.refunds.total')} value={refundRequests.length} tone="cyan" />
      </div>

      <div className="mt-4 glass-panel overflow-hidden rounded-2xl">
        <table className="w-full text-left text-xs" data-testid="refunds-table">
          <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">{t('fleetos.refunds.colOrder')}</th>
              <th className="px-3 py-2.5">{t('fleetos.refunds.colCustomer')}</th>
              <th className="px-3 py-2.5">{t('fleetos.refunds.colAmount')}</th>
              <th className="px-3 py-2.5">{t('fleetos.refunds.colReason')}</th>
              <th className="px-3 py-2.5">{t('fleetos.refunds.colRequested')}</th>
              <th className="px-3 py-2.5">{t('fleetos.refunds.colStatus')}</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {refundRequests.map((r) => (
                <motion.tr layout key={r.id} data-testid="refund-row" className="border-t border-white/5">
                  <td className="px-3 py-2.5 font-mono font-medium text-slate-200">{r.orderNo}</td>
                  <td className="px-3 py-2.5 text-slate-300">{r.customerName}</td>
                  <td className="px-3 py-2.5 font-semibold text-emerald-300">{formatTWD(r.amount)}</td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 text-slate-400">{r.reason}</td>
                  <td className="px-3 py-2.5 text-slate-500">{formatRelative(r.requestedAt, lang)}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={STATUS_TONE[r.status]}>{t(`fleetos.refunds.status.${r.status}`)}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {r.status === 'PENDING' && (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="success" data-testid="refund-approve" onClick={() => resolveRefund(r.id, true)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="danger" data-testid="refund-reject" onClick={() => resolveRefund(r.id, false)}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {refundRequests.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  {t('fleetos.refunds.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </FleetOsPage>
  )
}
