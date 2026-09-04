import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Search,
  Download,
  CheckCircle2,
  Sparkles,
  Building2,
  User,
  ShieldCheck,
  Eye,
} from 'lucide-react'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatTWD } from '../../lib/format'
import { TaiwanInvoiceModal } from '../../components/invoices/TaiwanInvoiceModal'
import type { EGuiInvoice, EGuiStatus, EGuiType } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import clsx from 'clsx'

export default function InvoicesPanel() {
  const { t, lang } = useLang()
  const invoices = useFleetStore((s) => s.invoices)
  const voidInvoice = useFleetStore((s) => s.voidInvoice)
  const allowanceInvoice = useFleetStore((s) => s.allowanceInvoice)

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<EGuiType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<EGuiStatus | 'ALL'>('ALL')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) || null
  const [actionAlert, setActionAlert] = useState<string | null>(null)

  const filteredInvoices = invoices.filter((inv) => {
    if (typeFilter !== 'ALL' && inv.type !== typeFilter) return false
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false
    if (query.trim()) {
      const q = query.toLowerCase()
      const matchNo = inv.invoiceNo.toLowerCase().includes(q)
      const matchOrder = inv.orderNo.toLowerCase().includes(q)
      const matchCustomer = inv.customerName.toLowerCase().includes(q)
      const matchBuyer = inv.buyerTitle?.toLowerCase().includes(q) || inv.buyerUbn?.includes(q)
      if (!matchNo && !matchOrder && !matchCustomer && !matchBuyer) return false
    }
    return true
  })

  const handleVoidInvoice = (inv: EGuiInvoice) => {
    voidInvoice(inv.id)
    setActionAlert(
      lang === 'zh'
        ? `發票 ${inv.invoiceNo} 已成功作廢！財政部電子發票整合服務平台已同步完成。`
        : `Invoice ${inv.invoiceNo} has been VOIDED. Ministry of Finance E-Invoice platform synced.`,
    )
    setTimeout(() => setActionAlert(null), 4000)
  }

  const handleAllowanceInvoice = (inv: EGuiInvoice) => {
    allowanceInvoice(inv.id)
    setActionAlert(
      lang === 'zh'
        ? `發票 ${inv.invoiceNo} 折讓單已開立！折讓金額 NT$${Math.round(inv.amountTotal * 0.2)}。`
        : `Tax Allowance (折讓) issued for ${inv.invoiceNo} (Amount: NT$${Math.round(inv.amountTotal * 0.2)}).`,
    )
    setTimeout(() => setActionAlert(null), 4000)
  }

  const handleBatchExport = () => {
    setActionAlert(
      lang === 'zh'
        ? '已匯出符合財政部媒體申報檔 (TXT/CSV) 格式之營業稅申報清冊！'
        : 'Exported Taiwan MOF VAT Media Declaration batch file (TXT/CSV)!',
    )
    setTimeout(() => setActionAlert(null), 4000)
  }

  const totalAmount = filteredInvoices.reduce((sum, i) => (i.status === 'VOIDED' ? sum : sum + i.amountTotal), 0)
  const totalTax = filteredInvoices.reduce((sum, i) => (i.status === 'VOIDED' ? sum : sum + i.taxAmount), 0)

  return (
    <FleetOsPage
      title={t('fleetos.invoices.title')}
      subtitle={t('fleetos.invoices.subtitle')}
      icon={<FileText className="h-5 w-5" />}
    >
      <div className="pb-8" data-testid="invoices-panel">
        {/* Action Alert Banner */}
        <AnimatePresence>
          {actionAlert && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-950/80 p-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-xl"
              data-testid="invoice-action-alert"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0" />
                <p className="text-sm font-bold text-cyan-200">{actionAlert}</p>
              </div>
              <button
                type="button"
                onClick={() => setActionAlert(null)}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-200"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Summary Cards */}
        <div className="glass-panel-glow mb-6 grid grid-cols-1 gap-4 rounded-3xl p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '發票開立總張數' : 'Total Invoices Issued'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-cyan-300">{invoices.length} 件</p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? '當期 115年07-08月' : 'Current Period July-Aug'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-white/5 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '開立總金額 (含稅)' : 'Total Invoiced Gross'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-emerald-300">{formatTWD(totalAmount)}</p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? `營業稅額 5%: ${formatTWD(totalTax)}` : `5% VAT: ${formatTWD(totalTax)}`}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-white/5 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-400/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? 'B2B 企業統編發票' : 'B2B Corporate Invoices'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-purple-300">
                {invoices.filter((i) => i.type === 'B2B').length} 件
              </p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? '台積電/聯發科等企業' : 'TSMC / MediaTek Enterprise'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '財政部平台連線' : 'MOF Platform Sync'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-amber-300">100% ONLINE</p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? '即時雙向傳輸加密' : 'TLS 1.3 Direct E-GUI API'}</p>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="glass-panel mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2.5 shadow-inner">
            <Search className="h-4 w-4 text-cyan-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'zh' ? '搜尋發票號碼、訂單編號、客戶姓名或統一編號 / 公司抬頭...' : 'Search invoice no, order no, customer, UBN...'}
              data-testid="invoice-search-input"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              data-testid="invoice-type-filter"
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-cyan-300 outline-none"
            >
              <option value="ALL">{lang === 'zh' ? '全類型發票 (All Types)' : 'All Types'}</option>
              <option value="B2B">{lang === 'zh' ? 'B2B 企業三聯式 (統編抬頭)' : 'B2B Corporate UBN'}</option>
              <option value="B2C">{lang === 'zh' ? 'B2C 個人二聯式 (載具/捐贈)' : 'B2C Personal'}</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              data-testid="invoice-status-filter"
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-cyan-300 outline-none"
            >
              <option value="ALL">{lang === 'zh' ? '所有狀態 (All Statuses)' : 'All Statuses'}</option>
              <option value="ISSUED">{lang === 'zh' ? '已開立 (ISSUED)' : 'ISSUED'}</option>
              <option value="ALLOWANCE">{lang === 'zh' ? '已開立折讓 (ALLOWANCE)' : 'ALLOWANCE'}</option>
              <option value="VOIDED">{lang === 'zh' ? '已作廢 (VOIDED)' : 'VOIDED'}</option>
            </select>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleBatchExport}
              data-testid="invoice-batch-export-btn"
              className="flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              <span>{lang === 'zh' ? '批次匯出申報檔' : 'Batch Export CSV'}</span>
            </Button>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="glass-panel overflow-hidden rounded-3xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="invoices-table">
              <thead className="border-b border-white/10 bg-slate-950/60 font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">{lang === 'zh' ? '發票號碼 / 期別' : 'Invoice No / Period'}</th>
                  <th className="px-5 py-3.5">{lang === 'zh' ? '開立時間 / 訂單' : 'Issue Date / Order'}</th>
                  <th className="px-5 py-3.5">{lang === 'zh' ? '買受人資訊 / 載具' : 'Buyer / Carrier'}</th>
                  <th className="px-5 py-3.5">{lang === 'zh' ? '發票金額 (含稅)' : 'Total Amount'}</th>
                  <th className="px-5 py-3.5">{lang === 'zh' ? '狀態' : 'Status'}</th>
                  <th className="px-5 py-3.5 text-right">{lang === 'zh' ? '操作' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInvoices.map((inv) => {
                  const isVoided = inv.status === 'VOIDED'
                  const isAllowance = inv.status === 'ALLOWANCE'

                  return (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition" data-testid={`invoice-row-${inv.id}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-cyan-300">{inv.invoiceNo}</span>
                          <Badge tone={inv.type === 'B2B' ? 'purple' : 'cyan'}>{inv.type}</Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{inv.period} · 隨機碼 {inv.randomCode}</p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-mono text-slate-200">{inv.issueDate}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">Order: {inv.orderNo}</p>
                      </td>

                      <td className="px-5 py-4">
                        {inv.type === 'B2B' ? (
                          <div>
                            <p className="font-bold text-white flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-purple-400" />
                              {inv.buyerTitle}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-purple-300">統編: {inv.buyerUbn}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-white flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-cyan-400" />
                              {inv.customerName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">載具: {inv.carrierCode}</p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className={clsx('text-sm font-black', isVoided ? 'line-through text-slate-500' : 'text-white')}>
                          {formatTWD(inv.amountTotal)}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-slate-400">
                          未稅 {formatTWD(inv.amountUntaxed)} · 稅額 {formatTWD(inv.taxAmount)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {isVoided ? (
                          <Badge tone="red">{lang === 'zh' ? '已作廢' : 'VOIDED'}</Badge>
                        ) : isAllowance ? (
                          <Badge tone="amber">{lang === 'zh' ? '已開折讓' : 'ALLOWANCE'}</Badge>
                        ) : (
                          <Badge tone="green">{lang === 'zh' ? '正常開立' : 'ISSUED'}</Badge>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceId(inv.id)}
                            data-testid={`view-invoice-modal-btn-${inv.id}`}
                            className="flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                            title={lang === 'zh' ? '檢視電子發票證明聯' : 'View e-GUI Invoice'}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{lang === 'zh' ? '證明聯' : 'Proof'}</span>
                          </button>

                          {!isVoided && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAllowanceInvoice(inv)}
                                data-testid={`allowance-invoice-btn-${inv.id}`}
                                className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                                title={lang === 'zh' ? '折讓' : 'Allowance'}
                              >
                                {lang === 'zh' ? '折讓' : 'Allowance'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleVoidInvoice(inv)}
                                data-testid={`void-invoice-btn-${inv.id}`}
                                className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                                title={lang === 'zh' ? '作廢' : 'Void'}
                              >
                                {lang === 'zh' ? '作廢' : 'Void'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Authentic Taiwan Electronic Invoice Modal */}
      {selectedInvoice && (
        <TaiwanInvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoiceId(null)} />
      )}
    </FleetOsPage>
  )
}
