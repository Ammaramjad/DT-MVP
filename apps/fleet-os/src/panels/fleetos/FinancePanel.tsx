import { BadgeDollarSign, CheckCircle2, Download } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

export default function FinancePanel() {
  const { t } = useLang()
  const payouts = useFleetStore((s) => s.payouts)
  const markPayoutPaid = useFleetStore((s) => s.markPayoutPaid)

  const pendingTotal = payouts.filter((p) => p.status !== 'PAID').reduce((sum, p) => sum + p.netAmount, 0)
  const paidTotal = payouts.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.netAmount, 0)
  const totalCommission = payouts.reduce((sum, p) => sum + p.commission, 0)

  return (
    <FleetOsPage title={t('fleetos.finance.title')} subtitle={t('fleetos.finance.subtitle')} icon={<BadgeDollarSign className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<BadgeDollarSign className="h-4 w-4" />} label={t('fleetos.finance.pendingPayouts')} value={pendingTotal} prefix="NT$" tone="amber" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label={t('fleetos.finance.paidOut')} value={paidTotal} prefix="NT$" tone="lime" />
        <StatCard icon={<BadgeDollarSign className="h-4 w-4" />} label={t('fleetos.finance.commission')} value={totalCommission} prefix="NT$" tone="purple" />
        <StatCard icon={<BadgeDollarSign className="h-4 w-4" />} label={t('fleetos.finance.records')} value={payouts.length} tone="cyan" />
      </div>

      <div className="mt-4 glass-panel overflow-hidden rounded-2xl">
        <table className="w-full text-left text-xs" data-testid="finance-table">
          <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">{t('fleetos.finance.colDriver')}</th>
              <th className="px-3 py-2.5">{t('fleetos.finance.colPeriod')}</th>
              <th className="px-3 py-2.5">{t('fleetos.finance.colGross')}</th>
              <th className="px-3 py-2.5">{t('fleetos.finance.colCommission')}</th>
              <th className="px-3 py-2.5">{t('fleetos.finance.colNet')}</th>
              <th className="px-3 py-2.5">{t('fleetos.finance.colMethod')}</th>
              <th className="px-3 py-2.5">{t('fleetos.finance.colStatus')}</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-white/5" data-testid="finance-payout-row">
                <td className="px-3 py-2.5 font-medium text-slate-200">{p.driverName}</td>
                <td className="px-3 py-2.5 text-slate-400">{p.period}</td>
                <td className="px-3 py-2.5 text-slate-300">{formatTWD(p.grossAmount)}</td>
                <td className="px-3 py-2.5 text-slate-500">-{formatTWD(p.commission)}</td>
                <td className="px-3 py-2.5 font-semibold text-emerald-300">{formatTWD(p.netAmount)}</td>
                <td className="px-3 py-2.5 text-slate-400">{p.method}</td>
                <td className="px-3 py-2.5">
                  <Badge tone={p.status === 'PAID' ? 'green' : p.status === 'PROCESSING' ? 'cyan' : 'amber'}>{t(`fleetos.finance.status.${p.status}`)}</Badge>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    {p.status !== 'PAID' && (
                      <Button size="sm" variant="success" data-testid="finance-mark-paid" onClick={() => markPayoutPaid(p.id)}>
                        {t('fleetos.finance.markPaid')}
                      </Button>
                    )}
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white" title={t('fleetos.finance.downloadStatement')}>
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FleetOsPage>
  )
}
