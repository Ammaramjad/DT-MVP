import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  CreditCard,
  Search,
  Plus,
  CheckCircle2,
  Briefcase,
  FileSpreadsheet,
} from 'lucide-react'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatTWD } from '../../lib/format'
import type { CorporateAccount } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import clsx from 'clsx'

export default function CorporatePanel() {
  const { t, lang } = useLang()
  const accounts = useFleetStore((s) => s.corporateAccounts)
  const createCorporateAccount = useFleetStore((s) => s.createCorporateAccount)
  const updateCorporatePolicy = useFleetStore((s) => s.updateCorporatePolicy)

  const [query, setQuery] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(accounts[0]?.id || null)
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null
  const [showAddModal, setShowAddModal] = useState(false)
  const [actionAlert, setActionAlert] = useState<string | null>(null)

  // New Account Form State
  const [newName, setNewName] = useState('')
  const [newUbn, setNewUbn] = useState('')
  const [newContact, setNewContact] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newCreditLimit, setNewCreditLimit] = useState(1000000)

  const filteredAccounts = accounts.filter((acc) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      acc.name.toLowerCase().includes(q) ||
      acc.nameZh.includes(query) ||
      acc.ubn.includes(q) ||
      acc.contactPerson.toLowerCase().includes(q)
    )
  })

  const handleCreateAccount = () => {
    if (!newName.trim() || !newUbn.trim()) return
    const newAcc = createCorporateAccount({
      name: newName.trim(),
      nameZh: newName.trim(),
      ubn: newUbn.trim(),
      contactPerson: newContact || 'Corporate Admin',
      contactEmail: newEmail || 'admin@corp.com',
      monthlyCreditLimit: Number(newCreditLimit) || 1000000,
    })

    setSelectedAccountId(newAcc.id)
    setShowAddModal(false)
    setNewName('')
    setNewUbn('')
    setNewContact('')
    setNewEmail('')
    setActionAlert(
      lang === 'zh'
        ? `企業客戶「${newAcc.nameZh}」已成功建檔並核發 NT$${newAcc.monthlyCreditLimit.toLocaleString()} 企業額度！`
        : `Corporate Account "${newAcc.name}" created with NT$${newAcc.monthlyCreditLimit.toLocaleString()} credit limit!`,
    )
    setTimeout(() => setActionAlert(null), 4000)
  }

  const handleUpdatePolicy = (field: 'requireApprovalForLuxury' | 'airportOnly') => {
    if (!selectedAccount) return
    updateCorporatePolicy(selectedAccount.id, field)
    setActionAlert(
      lang === 'zh'
        ? `已更新「${selectedAccount.nameZh}」之企業差旅審批政策設定。`
        : `Updated corporate travel approval policy for ${selectedAccount.name}.`,
    )
    setTimeout(() => setActionAlert(null), 3500)
  }

  const handleGenerateConsolidatedBilling = (acc: CorporateAccount) => {
    setActionAlert(
      lang === 'zh'
        ? `已為「${acc.nameZh}」產出 115年8月份企業月結統一對帳單與彙總電子發票 (共 ${acc.activeRidesThisMonth} 趟，金額 ${formatTWD(acc.creditUsed)})！`
        : `Generated consolidated monthly invoice & trip ledger for ${acc.name} (${acc.activeRidesThisMonth} trips, ${formatTWD(acc.creditUsed)})!`,
    )
    setTimeout(() => setActionAlert(null), 4500)
  }

  const totalCreditLimit = accounts.reduce((sum, a) => sum + a.monthlyCreditLimit, 0)
  const totalCreditUsed = accounts.reduce((sum, a) => sum + a.creditUsed, 0)
  const totalRidesMonth = accounts.reduce((sum, a) => sum + a.activeRidesThisMonth, 0)

  return (
    <FleetOsPage
      title={t('fleetos.corporate.title')}
      subtitle={t('fleetos.corporate.subtitle')}
      icon={<Building2 className="h-5 w-5" />}
    >
      <div className="pb-8" data-testid="corporate-panel">
        {/* Action Alert Banner */}
        <AnimatePresence>
          {actionAlert && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-purple-500/40 bg-purple-950/80 p-4 shadow-[0_0_20px_rgba(168,85,247,0.3)] backdrop-blur-xl"
              data-testid="corporate-action-alert"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-purple-400 shrink-0" />
                <p className="text-sm font-bold text-purple-200">{actionAlert}</p>
              </div>
              <button
                type="button"
                onClick={() => setActionAlert(null)}
                className="text-xs font-semibold text-purple-400 hover:text-purple-200"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top KPI Banner */}
        <div className="glass-panel-glow mb-6 grid grid-cols-1 gap-4 rounded-3xl p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-400/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '簽約企業帳戶數' : 'Active Corporate Accounts'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-purple-300">{accounts.length} 家企業</p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? '台積電/聯發科/長榮航空等' : 'Fortune 500 & Tech Leaders'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-white/5 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '本月已授信額度' : 'Credit Line Used (MTD)'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-cyan-300">{formatTWD(totalCreditUsed)}</p>
              <p className="text-[11px] text-slate-400">
                {lang === 'zh' ? `總額度: ${formatTWD(totalCreditLimit)}` : `Total Limit: ${formatTWD(totalCreditLimit)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-white/5 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '本月企業差旅總趟次' : 'Corporate Trips (MTD)'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-emerald-300">{totalRidesMonth} 趟</p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? '自動審批率 98.2%' : '98.2% Auto-Approved'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '結算與月結模式' : 'Billing & Payment Terms'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-amber-300">NET 30 / 60</p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? '整合電子發票自動對帳' : 'Consolidated e-GUI Billing'}</p>
            </div>
          </div>
        </div>

        {/* Search & Add Account Action Header */}
        <div className="glass-panel mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2.5 shadow-inner">
            <Search className="h-4 w-4 text-purple-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'zh' ? '搜尋企業名稱、統一編號 (UBN) 或聯絡人窗口...' : 'Search corporate client, UBN, contact person...'}
              data-testid="corporate-search-input"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowAddModal(true)}
            data-testid="add-corporate-account-btn"
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === 'zh' ? '新增簽約企業 (Add Client)' : 'Add Corporate Client'}</span>
          </Button>
        </div>

        {/* Main Content: Left Account List / Right Account Detail & Controls */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Account List */}
          <div className="space-y-3" data-testid="corporate-accounts-list">
            {filteredAccounts.map((acc) => {
              const isSelected = selectedAccount?.id === acc.id
              const usagePct = (acc.creditUsed / acc.monthlyCreditLimit) * 100

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccountId(acc.id)}
                  data-testid={`corporate-account-card-${acc.id}`}
                  className={clsx(
                    'flex w-full flex-col rounded-3xl p-5 text-left transition',
                    isSelected
                      ? 'glass-panel-glow border-purple-400/50 bg-purple-950/25 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                      : 'glass-panel hover:border-purple-400/30 hover:bg-white/[0.04]',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{lang === 'zh' ? acc.nameZh : acc.name}</h4>
                      <p className="mt-0.5 font-mono text-xs text-purple-300">UBN: {acc.ubn}</p>
                    </div>
                    <Badge tone="purple">{acc.paymentTerms}</Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{lang === 'zh' ? '月額度使用率' : 'Credit Line Utilized'}:</span>
                      <span className="font-bold text-white">
                        {formatTWD(acc.creditUsed)} / {formatTWD(acc.monthlyCreditLimit)} ({usagePct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        style={{ width: `${Math.min(100, usagePct)}%` }}
                        className={clsx(
                          'h-full rounded-full transition-all',
                          usagePct > 80 ? 'bg-amber-400' : 'bg-purple-500',
                        )}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[11px] text-slate-400">
                    <span>{lang === 'zh' ? `員工數: ${acc.employeeCount}人` : `${acc.employeeCount} Employees`}</span>
                    <span className="font-bold text-cyan-300">
                      {lang === 'zh' ? `本月已搭乘 ${acc.activeRidesThisMonth} 趟` : `${acc.activeRidesThisMonth} Trips this month`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Account Detail & Governance Settings */}
          {selectedAccount && (
            <div className="glass-panel col-span-1 lg:col-span-2 rounded-3xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-300 border border-purple-400/30">
                      {selectedAccount.status}
                    </span>
                    <h3 className="text-xl font-black text-white">
                      {lang === 'zh' ? selectedAccount.nameZh : selectedAccount.name}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {lang === 'zh' ? `專屬客戶經理: ${selectedAccount.accountManager}` : `Account Manager: ${selectedAccount.accountManager}`} · 統編: {selectedAccount.ubn}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleGenerateConsolidatedBilling(selectedAccount)}
                  data-testid="generate-monthly-billing-btn"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>{lang === 'zh' ? '產出本月統一對帳單' : 'Generate Monthly Ledger'}</span>
                </Button>
              </div>

              {/* Account Profile Grid */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {lang === 'zh' ? '窗口聯絡人與公務信箱' : 'Primary Contact & Corporate Email'}
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-white">{selectedAccount.contactPerson}</p>
                  <p className="text-xs text-cyan-300 font-mono">{selectedAccount.contactEmail}</p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {lang === 'zh' ? '年度累積商務差旅總消費' : 'Annual Travel Spend'}
                  </p>
                  <p className="mt-1.5 text-xl font-black text-emerald-300">{formatTWD(selectedAccount.totalSpendThisYear)}</p>
                  <p className="text-xs text-slate-400">{lang === 'zh' ? '享企業 VIP 大宗折扣優惠' : 'Corporate VIP Tier'}</p>
                </div>
              </div>

              {/* Cost Centers */}
              <div className="mt-5 rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {lang === 'zh' ? '授權歸屬成本中心 (Cost Center Tags)' : 'Authorized Cost Centers'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedAccount.costCenters.map((cc) => (
                    <span
                      key={cc}
                      className="rounded-xl border border-purple-400/30 bg-purple-950/40 px-3 py-1 font-mono text-xs font-bold text-purple-200"
                    >
                      {cc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ride Approval Policies */}
              <div className="mt-5 rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {lang === 'zh' ? '員工差旅用車審批政策 (Travel Governance Policy)' : 'Travel Governance & Auto-Approval Policy'}
                  </p>
                  <Badge tone="cyan">{lang === 'zh' ? '即時生效' : 'Active'}</Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/5">
                    <div>
                      <p className="font-bold text-white">
                        {lang === 'zh' ? '小額自動核准上限 (Auto-Approve Threshold)' : 'Auto-Approval Limit'}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        {lang === 'zh' ? `單趟低於 ${formatTWD(selectedAccount.policies.autoApproveUnder)} 自動核銷放行` : `Trips under ${formatTWD(selectedAccount.policies.autoApproveUnder)} approved automatically`}
                      </p>
                    </div>
                    <span className="font-bold text-cyan-300">{formatTWD(selectedAccount.policies.autoApproveUnder)}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/5">
                    <div>
                      <p className="font-bold text-white">
                        {lang === 'zh' ? '豪華車款與大座數限制 (Luxury & VIP Restrictions)' : 'Require Approval for Luxury/VIP'}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        {selectedAccount.policies.requireApprovalForLuxury
                          ? lang === 'zh'
                            ? '預訂 Alphard / 賓士等豪華車型須經主管二階段簽核'
                            : 'Requires managerial approval for Luxury Sedan/Van'
                          : lang === 'zh'
                            ? '開放全員依差旅需求彈性選用豪華車款'
                            : 'All vehicle categories permitted'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdatePolicy('requireApprovalForLuxury')}
                      data-testid="toggle-luxury-approval-btn"
                      className={clsx(
                        'rounded-xl px-3 py-1 font-bold text-xs transition border',
                        selectedAccount.policies.requireApprovalForLuxury
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                          : 'bg-slate-800 text-slate-400 border-white/10',
                      )}
                    >
                      {selectedAccount.policies.requireApprovalForLuxury ? (lang === 'zh' ? '已啟用審批' : 'ENABLED') : (lang === 'zh' ? '不限' : 'DISABLED')}
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/5">
                    <div>
                      <p className="font-bold text-white">
                        {lang === 'zh' ? '限定機場/高鐵差旅接送 (Airport/HSR Only Policy)' : 'Airport & HSR Transfers Only'}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        {selectedAccount.policies.airportOnly
                          ? lang === 'zh'
                            ? '僅限機場或高鐵站之出入境差旅用車'
                            : 'Restricted strictly to airport and HSR itineraries'
                          : lang === 'zh'
                            ? '允許市區拜訪與跨縣市商務拜訪'
                            : 'All intercity and local business routes permitted'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdatePolicy('airportOnly')}
                      data-testid="toggle-airport-only-btn"
                      className={clsx(
                        'rounded-xl px-3 py-1 font-bold text-xs transition border',
                        selectedAccount.policies.airportOnly
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                          : 'bg-slate-800 text-slate-400 border-white/10',
                      )}
                    >
                      {selectedAccount.policies.airportOnly ? (lang === 'zh' ? '僅限機場' : 'AIRPORT ONLY') : (lang === 'zh' ? '全行程開放' : 'ALL ROUTES')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Corporate Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
            onClick={() => setShowAddModal(false)}
            data-testid="add-corporate-modal"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-glow w-full max-w-lg rounded-3xl p-6 text-white shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-400" />
                {lang === 'zh' ? '新增簽約企業客戶建檔' : 'New Corporate Client Registration'}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {lang === 'zh' ? '開立專屬企業統編月結帳戶、設定信用額度與差旅用車審批條件。' : 'Set up corporate billing, monthly credit lines, and travel rules.'}
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">{lang === 'zh' ? '公司名稱 (Company Title)' : 'Company Name'}</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. 華碩電腦股份有限公司 (ASUS)"
                    data-testid="new-corp-name-input"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none focus:border-purple-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">{lang === 'zh' ? '統一編號 (8-digit UBN)' : 'Tax ID (UBN)'}</label>
                    <input
                      value={newUbn}
                      onChange={(e) => setNewUbn(e.target.value)}
                      placeholder="e.g. 23867072"
                      data-testid="new-corp-ubn-input"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 font-mono text-white outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">{lang === 'zh' ? '月度授信額度 (TWD)' : 'Monthly Limit (TWD)'}</label>
                    <input
                      type="number"
                      value={newCreditLimit}
                      onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                      placeholder="1000000"
                      data-testid="new-corp-credit-input"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 font-mono text-white outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">{lang === 'zh' ? '窗口聯絡人' : 'Contact Person'}</label>
                    <input
                      value={newContact}
                      onChange={(e) => setNewContact(e.target.value)}
                      placeholder="e.g. Jason Wu (HR Director)"
                      data-testid="new-corp-contact-input"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">{lang === 'zh' ? '企業聯絡信箱' : 'Corporate Email'}</label>
                    <input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="travel@asus.com"
                      data-testid="new-corp-email-input"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateAccount}
                  data-testid="confirm-add-corp-btn"
                  className="bg-gradient-to-r from-purple-500 to-indigo-600"
                >
                  {lang === 'zh' ? '確認建檔' : 'Create Client'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FleetOsPage>
  )
}
