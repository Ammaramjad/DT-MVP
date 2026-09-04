import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users2,
  Search,
  Crown,
  Building2,
  Phone,
  Mail,
  Receipt,
  Star,
  Sparkles,
  Plane,
  FileText,
  Clock,
  Edit3,
  X,
  CheckCircle2,
  Gift,
  TrendingUp,
  Tag,
  DollarSign,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Button } from '../../components/ui/Button'
import { formatTWD } from '../../lib/format'
import type { CustomerProfile, PassengerTier } from '../../types'
import { useLang } from '../../i18n'
import clsx from 'clsx'

const TIER_STYLES: Record<PassengerTier, { labelZh: string; labelEn: string; badge: string; color: string; icon: typeof Crown }> = {
  VIP_PLATINUM: {
    labelZh: '白金尊榮 VIP (Platinum)',
    labelEn: 'VIP Platinum',
    badge: 'bg-gradient-to-r from-amber-400/20 to-orange-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.3)]',
    color: 'text-amber-400',
    icon: Crown,
  },
  CORP_EXECUTIVE: {
    labelZh: '企業合約商務 (Corporate)',
    labelEn: 'Corporate Executive',
    badge: 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]',
    color: 'text-purple-400',
    icon: Building2,
  },
  FREQUENT_FLYER: {
    labelZh: '高頻常客 (Frequent Flyer)',
    labelEn: 'Frequent Flyer',
    badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40',
    color: 'text-cyan-400',
    icon: Plane,
  },
  INTL_TOURIST: {
    labelZh: '外籍商務旅客 (Intl Tourist)',
    labelEn: 'International Tourist',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40',
    color: 'text-emerald-400',
    icon: Sparkles,
  },
  REGULAR: {
    labelZh: '一般乘客 (Regular)',
    labelEn: 'Regular Passenger',
    badge: 'bg-slate-800/60 text-slate-300 border border-slate-700',
    color: 'text-slate-400',
    icon: Users2,
  },
}

export default function CustomersPanel() {
  const { lang } = useLang()
  const customerProfiles = useFleetStore((s) => s.customerProfiles)
  const orders = useFleetStore((s) => s.orders)
  const toggleCustomerVip = useFleetStore((s) => s.toggleCustomerVip)
  const updateCustomerProfile = useFleetStore((s) => s.updateCustomerProfile)
  const issueCustomerVoucher = useFleetStore((s) => s.issueCustomerVoucher)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('ALL')
  const [spendingFilter, setSpendingFilter] = useState<string>('ALL') // ALL, HIGH (>50k), MEDIUM (10k-50k), LOW (<10k)

  // Drawer & Modals
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null)
  const [editingNotesCustomer, setEditingNotesCustomer] = useState<CustomerProfile | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [taxIdDraft, setTaxIdDraft] = useState('')
  const [carrierBarcodeDraft, setCarrierBarcodeDraft] = useState('')
  const [voucherModalCustomer, setVoucherModalCustomer] = useState<CustomerProfile | null>(null)
  const [voucherAmount, setVoucherAmount] = useState(500)
  const [voucherCode, setVoucherCode] = useState('VIP-AIRPORT-500')
  const [actionAlert, setActionAlert] = useState<string | null>(null)

  const showAlert = (msg: string) => {
    setActionAlert(msg)
    setTimeout(() => setActionAlert(null), 4000)
  }

  // Calculate customer enriched stats (combining store orders & history)
  const enrichedCustomers = useMemo(() => {
    return customerProfiles.map((customer) => {
      // Find all live and historical orders matching customer phone, email, or name
      const customerOrders = orders.filter(
        (o) =>
          (o.customer.phone && o.customer.phone === customer.phone) ||
          (o.customer.email && o.customer.email.toLowerCase() === customer.email.toLowerCase()) ||
          o.customer.name.toLowerCase() === customer.name.toLowerCase(),
      )

      const completedOrders = customerOrders.filter((o) => o.status === 'COMPLETED')
      const cancelledOrders = customerOrders.filter((o) => ['CANCELLED', 'REFUNDED'].includes(o.status))

      const liveSpent = completedOrders.reduce((sum, o) => sum + (o.priceEstimate || 0), 0)
      const historicalSpent = (customer.historicalOrders || [])
        .filter((h) => h.status === 'COMPLETED')
        .reduce((sum, h) => sum + (h.priceEstimate || 0), 0)

      const totalSpentTwd = (customer.lifetimeValueTwd && customer.lifetimeValueTwd > liveSpent + historicalSpent)
        ? customer.lifetimeValueTwd
        : liveSpent + historicalSpent

      const completedTripsCount = completedOrders.length + (customer.historicalOrders || []).filter((h) => h.status === 'COMPLETED').length
      const cancelledTripsCount = cancelledOrders.length + (customer.historicalOrders || []).filter((h) => h.status === 'CANCELLED').length

      // Rating calculation: customer rating given
      const ratedOrders = customerOrders.filter((o) => o.driverRatingByCustomer && o.driverRatingByCustomer > 0)
      const avgRating = ratedOrders.length
        ? (ratedOrders.reduce((sum, o) => sum + (o.driverRatingByCustomer || 5), 0) / ratedOrders.length).toFixed(1)
        : '5.0'

      const tier: PassengerTier = customer.passengerTier || (customer.isVip ? 'VIP_PLATINUM' : 'REGULAR')

      return {
        ...customer,
        tier,
        completedTripsCount,
        cancelledTripsCount,
        totalSpentTwd,
        avgRating,
        matchedOrders: customerOrders,
      }
    })
  }, [customerProfiles, orders])

  // Multi-Filter & Search
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter((c) => {
      if (tierFilter !== 'ALL' && c.tier !== tierFilter) return false

      if (spendingFilter === 'HIGH' && c.totalSpentTwd < 50000) return false
      if (spendingFilter === 'MEDIUM' && (c.totalSpentTwd < 10000 || c.totalSpentTwd >= 50000)) return false
      if (spendingFilter === 'LOW' && c.totalSpentTwd >= 10000) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = c.name.toLowerCase().includes(q) || (c.nameZh && c.nameZh.includes(searchQuery))
        const matchPhone = c.phone.includes(q)
        const matchEmail = c.email.toLowerCase().includes(q)
        const matchCorp = c.corporateName?.toLowerCase().includes(q) || c.taxIdUbn?.includes(q)
        if (!matchName && !matchPhone && !matchEmail && !matchCorp) return false
      }

      return true
    })
  }, [enrichedCustomers, tierFilter, spendingFilter, searchQuery])

  // Summary Metrics
  const totalCustomers = enrichedCustomers.length
  const totalVipCount = enrichedCustomers.filter((c) => c.isVip || c.tier === 'VIP_PLATINUM' || c.tier === 'CORP_EXECUTIVE').length
  const totalFleetRevenueLtv = enrichedCustomers.reduce((sum, c) => sum + c.totalSpentTwd, 0)
  const avgCustomerLtv = totalCustomers > 0 ? Math.round(totalFleetRevenueLtv / totalCustomers) : 0

  const handleOpenEditModal = (c: CustomerProfile) => {
    setEditingNotesCustomer(c)
    setNotesDraft(c.notesAndPreferences || '')
    setTaxIdDraft(c.taxIdUbn || '')
    setCarrierBarcodeDraft(c.carrierBarcode || '')
  }

  const handleSaveNotes = () => {
    if (!editingNotesCustomer) return
    updateCustomerProfile(editingNotesCustomer.id, {
      notesAndPreferences: notesDraft.trim(),
      taxIdUbn: taxIdDraft.trim() || null,
      carrierBarcode: carrierBarcodeDraft.trim() || null,
    })
    showAlert(
      lang === 'zh'
        ? `已更新客戶「${editingNotesCustomer.name}」之偏好備註與統一編號！`
        : `Updated preferences & Tax ID for ${editingNotesCustomer.name}!`,
    )
    if (selectedCustomer?.id === editingNotesCustomer.id) {
      setSelectedCustomer((prev) => prev ? {
        ...prev,
        notesAndPreferences: notesDraft.trim(),
        taxIdUbn: taxIdDraft.trim() || null,
        carrierBarcode: carrierBarcodeDraft.trim() || null,
      } : null)
    }
    setEditingNotesCustomer(null)
  }

  const handleIssueVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!voucherModalCustomer) return
    issueCustomerVoucher(voucherModalCustomer.id, voucherAmount, voucherCode)
    showAlert(
      lang === 'zh'
        ? `已成功發送 NT$${voucherAmount} 乘車優惠券 (${voucherCode}) 至「${voucherModalCustomer.name}」帳戶！`
        : `Issued NT$${voucherAmount} credit voucher (${voucherCode}) to ${voucherModalCustomer.name}!`,
    )
    if (selectedCustomer?.id === voucherModalCustomer.id) {
      setSelectedCustomer((prev) => prev ? {
        ...prev,
        promoVouchersCount: (prev.promoVouchersCount ?? 0) + 1,
      } : null)
    }
    setVoucherModalCustomer(null)
  }

  return (
    <FleetOsPage
      title={lang === 'zh' ? '客戶 CRM 與乘客總覽中心 (Customer Hub)' : 'Customer CRM & Passenger Management Hub'}
      subtitle={
        lang === 'zh'
          ? '集中管理全平台 VIP 尊榮會員、企業商務月結帳戶、乘客乘車歷史、終身價值 (LTV) 與客製化乘車偏好'
          : 'Centralized passenger intelligence: VIP loyalty tiers, corporate billing accounts, historical bookings, lifetime value & ride preferences'
      }
      icon={<Users2 className="h-5 w-5 text-cyan-400" />}
    >
      <div className="pb-10" data-testid="customer-crm-panel">
        {/* Action Alert Banner */}
        <AnimatePresence>
          {actionAlert && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/80 p-4 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-xl"
              data-testid="customer-crm-alert"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-100">{actionAlert}</span>
              </div>
              <button onClick={() => setActionAlert(null)} className="text-emerald-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top KPI Metrics Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5" data-testid="customer-crm-kpis">
          <StatCard
            icon={<Users2 className="h-4 w-4" />}
            label={lang === 'zh' ? '註冊乘客總數' : 'Total Passengers'}
            value={totalCustomers}
            tone="cyan"
          />
          <StatCard
            icon={<Crown className="h-4 w-4" />}
            label={lang === 'zh' ? 'VIP / 企業核心會員' : 'VIP & Corp Accounts'}
            value={totalVipCount}
            tone="amber"
          />
          <StatCard
            icon={<DollarSign className="h-4 w-4" />}
            label={lang === 'zh' ? '全客戶累積貢獻 LTV' : 'Total Customer LTV'}
            value={totalFleetRevenueLtv}
            prefix="NT$"
            tone="lime"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={lang === 'zh' ? '平均客戶終身產值' : 'Average Customer LTV'}
            value={avgCustomerLtv}
            prefix="NT$"
            tone="purple"
          />
        </div>

        {/* Search & Filter Controls */}
        <div className="glass-panel mb-5 rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'zh'
                    ? '搜尋乘客姓名、電話、Email、企業統編或公司名稱…'
                    : 'Search passenger name, phone, email, Tax ID, corporate…'
                }
                data-testid="customer-search-input"
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 py-2.5 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50 transition"
              />
            </div>

            {/* Tier Filter */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              data-testid="customer-tier-filter"
              className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-cyan-400/50"
            >
              <option value="ALL">{lang === 'zh' ? '全部乘客等級 (All Tiers)' : 'All Tiers'}</option>
              <option value="VIP_PLATINUM">{lang === 'zh' ? '白金尊榮 VIP (VIP Platinum)' : 'VIP Platinum'}</option>
              <option value="CORP_EXECUTIVE">{lang === 'zh' ? '企業合約商務 (Corporate)' : 'Corporate Executive'}</option>
              <option value="FREQUENT_FLYER">{lang === 'zh' ? '高頻常客 (Frequent Flyer)' : 'Frequent Flyer'}</option>
              <option value="INTL_TOURIST">{lang === 'zh' ? '外籍旅客 (International)' : 'International Tourist'}</option>
              <option value="REGULAR">{lang === 'zh' ? '一般乘客 (Regular)' : 'Regular'}</option>
            </select>

            {/* Spending Bracket Filter */}
            <select
              value={spendingFilter}
              onChange={(e) => setSpendingFilter(e.target.value)}
              data-testid="customer-spending-filter"
              className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-cyan-400/50"
            >
              <option value="ALL">{lang === 'zh' ? '全部消費貢獻 (All Spend)' : 'All Spend'}</option>
              <option value="HIGH">{lang === 'zh' ? '高價值客群 (> NT$50,000)' : 'High LTV (> NT$50k)'}</option>
              <option value="MEDIUM">{lang === 'zh' ? '中等產值 (NT$10,000 - $50,000)' : 'Medium LTV (NT$10k-$50k)'}</option>
              <option value="LOW">{lang === 'zh' ? '入門旅客 (< NT$10,000)' : 'Standard (< NT$10k)'}</option>
            </select>

            {/* Clear Filter Button */}
            {(searchQuery || tierFilter !== 'ALL' || spendingFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setTierFilter('ALL')
                  setSpendingFilter('ALL')
                }}
                data-testid="customer-reset-filters-btn"
                className="rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/15 transition"
              >
                {lang === 'zh' ? '重設篩選' : 'Reset Filters'}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
            <span>
              {lang === 'zh'
                ? `共符合 ${filteredCustomers.length} 位客戶資料`
                : `Showing ${filteredCustomers.length} customer profiles`}
            </span>
            <span className="text-slate-500 font-mono">
              CRM Engine v3.4 · Live Profile Data
            </span>
          </div>
        </div>

        {/* Customer Directory Table */}
        <div className="glass-panel overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="customer-directory-table">
              <thead className="bg-slate-950/80 text-[10.5px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">{lang === 'zh' ? '乘客資料 / 聯絡方式' : 'Passenger / Contact'}</th>
                  <th className="px-3 py-3">{lang === 'zh' ? '會員等級 / 企業關聯' : 'Loyalty Tier & Corp'}</th>
                  <th className="px-3 py-3">{lang === 'zh' ? '完成趟數 / 評價' : 'Rides & Rating'}</th>
                  <th className="px-3 py-3">{lang === 'zh' ? '總貢獻產值 (LTV)' : 'Lifetime Value (LTV)'}</th>
                  <th className="px-3 py-3">{lang === 'zh' ? '統編 / 發票載具' : 'Tax ID & Carrier'}</th>
                  <th className="px-3 py-3">{lang === 'zh' ? '專屬備註與乘車偏好' : 'Notes & Preferences'}</th>
                  <th className="px-4 py-3 text-right">{lang === 'zh' ? 'CRM 快速操作' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((customer) => {
                  const TierInfo = TIER_STYLES[customer.tier] || TIER_STYLES.REGULAR
                  const TierIcon = TierInfo.icon

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-white/[0.03] transition"
                      data-testid={`customer-row-${customer.id}`}
                    >
                      {/* Passenger Profile */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-xl border border-white/10 shadow-inner">
                            {customer.avatarEmoji || '👤'}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-sm">
                                {customer.name}
                              </span>
                              {customer.nameZh && customer.nameZh !== customer.name && (
                                <span className="text-xs text-slate-400 font-medium">
                                  ({customer.nameZh})
                                </span>
                              )}
                              {customer.isVip && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-300 border border-amber-400/40">
                                  <Crown className="h-2.5 w-2.5" /> VIP
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5 mt-0.5 text-[11px] text-slate-400 font-mono">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-500" /> {customer.phone}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Mail className="h-2.5 w-2.5" /> {customer.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Loyalty Tier & Corp Account */}
                      <td className="px-3 py-3.5">
                        <div className="space-y-1.5">
                          <span className={clsx('inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold', TierInfo.badge)}>
                            <TierIcon className="h-3 w-3 shrink-0" />
                            <span>{lang === 'zh' ? TierInfo.labelZh : TierInfo.labelEn}</span>
                          </span>

                          {customer.corporateName ? (
                            <div className="flex items-center gap-1 text-[10.5px] text-purple-300 font-medium">
                              <Building2 className="h-3 w-3 shrink-0 text-purple-400" />
                              <span className="truncate max-w-[150px]">{customer.corporateName}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {lang === 'zh' ? '個人自費帳號' : 'Personal Account'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rides & Rating */}
                      <td className="px-3 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">
                              {customer.completedTripsCount} {lang === 'zh' ? '趟完成' : 'trips'}
                            </span>
                            {customer.cancelledTripsCount > 0 && (
                              <span className="text-[10px] text-rose-400 font-mono">
                                ({customer.cancelledTripsCount} 取消)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-amber-300">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="font-bold font-mono">{customer.avgRating}</span>
                            <span className="text-[10px] text-slate-500">({customer.memberPoints} pts)</span>
                          </div>
                        </div>
                      </td>

                      {/* Lifetime Value (LTV) */}
                      <td className="px-3 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-emerald-300 font-mono text-sm">
                            {formatTWD(customer.totalSpentTwd)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {lang === 'zh' ? '會員自' : 'Member since'} {customer.memberSince.slice(0, 10)}
                          </p>
                        </div>
                      </td>

                      {/* Tax ID & Carrier */}
                      <td className="px-3 py-3.5">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          {customer.taxIdUbn ? (
                            <div className="flex items-center gap-1 text-cyan-300">
                              <FileText className="h-3 w-3 text-cyan-400" />
                              <span>統編: {customer.taxIdUbn}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[10px]">無統編</span>
                          )}
                          {customer.carrierBarcode ? (
                            <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                              <Tag className="h-2.5 w-2.5 text-slate-500" />
                              <span>{customer.carrierBarcode}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Notes & Preferences */}
                      <td className="px-3 py-3.5 max-w-[200px]">
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed" title={customer.notesAndPreferences || ''}>
                          {customer.notesAndPreferences || <span className="text-slate-600">無特殊備註</span>}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Order History Drawer Trigger */}
                          <button
                            onClick={() => setSelectedCustomer(customer)}
                            data-testid={`customer-history-btn-${customer.id}`}
                            className="flex items-center gap-1 rounded-xl bg-cyan-500/15 border border-cyan-400/30 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/25 transition"
                            title={lang === 'zh' ? '查看歷史與進行中訂單明細' : 'View Order History'}
                          >
                            <Clock className="h-3 w-3" />
                            <span>{lang === 'zh' ? '訂單紀錄' : 'History'}</span>
                          </button>

                          {/* Toggle VIP */}
                          <button
                            onClick={() => {
                              toggleCustomerVip(customer.id)
                              showAlert(
                                lang === 'zh'
                                  ? `已切換「${customer.name}」的 VIP 資格！`
                                  : `Toggled VIP status for ${customer.name}!`,
                              )
                            }}
                            data-testid={`customer-toggle-vip-${customer.id}`}
                            className={clsx(
                              'flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold border transition',
                              customer.isVip
                                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white',
                            )}
                            title={customer.isVip ? (lang === 'zh' ? '取消 VIP' : 'Revoke VIP') : (lang === 'zh' ? '升級為 VIP' : 'Make VIP')}
                          >
                            <Crown className="h-3 w-3" />
                          </button>

                          {/* Issue Voucher */}
                          <button
                            onClick={() => {
                              setVoucherModalCustomer(customer)
                              setVoucherCode(`VIP-${customer.name.slice(0, 3).toUpperCase()}-500`)
                              setVoucherAmount(500)
                            }}
                            data-testid={`customer-voucher-btn-${customer.id}`}
                            className="flex items-center gap-1 rounded-xl bg-purple-500/15 border border-purple-400/30 px-2 py-1.5 text-[11px] font-bold text-purple-300 hover:bg-purple-500/25 transition"
                            title={lang === 'zh' ? '發送專屬乘車抵用券' : 'Issue Credit Voucher'}
                          >
                            <Gift className="h-3 w-3" />
                          </button>

                          {/* Edit Notes & Tax ID */}
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            data-testid={`customer-edit-btn-${customer.id}`}
                            className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
                            title={lang === 'zh' ? '編輯備註偏好與發票統編' : 'Edit Customer Notes'}
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="py-16 text-center text-xs text-slate-500 space-y-2">
              <Users2 className="h-8 w-8 mx-auto text-slate-600 opacity-50" />
              <p>{lang === 'zh' ? '找不到相符的客戶資料或篩選條件無結果' : 'No customers match the current search filters.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* 1. Customer Order History Drawer / Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-end bg-slate-950/80 backdrop-blur-md" data-testid="customer-history-drawer">
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full max-w-2xl border-l border-white/15 bg-slate-950 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-5">
                {/* Drawer Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-2xl border border-cyan-400/40">
                      {selectedCustomer.avatarEmoji || '👤'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white tracking-wide">{selectedCustomer.name}</h2>
                        {selectedCustomer.isVip && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {selectedCustomer.phone} · {selectedCustomer.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    data-testid="close-customer-history-drawer"
                    className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Financial Summary & Stats Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                    <p className="text-[10.5px] uppercase font-bold text-slate-400">{lang === 'zh' ? '累計貢獻產值' : 'Lifetime Value'}</p>
                    <p className="text-base font-bold text-emerald-300 font-mono mt-1">
                      {formatTWD(selectedCustomer.lifetimeValueTwd || 86400)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                    <p className="text-[10.5px] uppercase font-bold text-slate-400">{lang === 'zh' ? '發行乘車券' : 'Promo Vouchers'}</p>
                    <p className="text-base font-bold text-purple-300 font-mono mt-1">
                      {selectedCustomer.promoVouchersCount ?? 2} 張
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                    <p className="text-[10.5px] uppercase font-bold text-slate-400">{lang === 'zh' ? '會員積點' : 'Reward Points'}</p>
                    <p className="text-base font-bold text-cyan-300 font-mono mt-1">
                      {selectedCustomer.memberPoints} pts
                    </p>
                  </div>
                </div>

                {/* Customer Preferences & Notes Card */}
                {selectedCustomer.notesAndPreferences && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                      <span>{lang === 'zh' ? '乘客專屬服務偏好 (Preferences)' : 'Service Preferences'}</span>
                      <Edit3
                        className="h-3.5 w-3.5 cursor-pointer hover:text-white"
                        onClick={() => {
                          handleOpenEditModal(selectedCustomer)
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedCustomer.notesAndPreferences}
                    </p>
                    {selectedCustomer.taxIdUbn && (
                      <p className="text-[11px] text-cyan-400 font-mono pt-1">
                        🏢 發票指定統一編號: {selectedCustomer.taxIdUbn}
                      </p>
                    )}
                  </div>
                )}

                {/* Booking History Timeline */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>{lang === 'zh' ? '歷史與進行中行程明細' : 'Booking History & Active Orders'}</span>
                    <span className="font-mono text-cyan-300">
                      {selectedCustomer.historicalOrders.length} TRIPS
                    </span>
                  </h3>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {selectedCustomer.historicalOrders.map((trip, idx) => (
                      <div
                        key={trip.id || idx}
                        className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 hover:bg-white/[0.05] transition space-y-2"
                        data-testid="customer-history-trip-card"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-white">
                              {trip.type === 'AIRPORT_PICKUP' ? '🛫 機場接機' : trip.type === 'AIRPORT_DROPOFF' ? '🛬 機場送機' : '🚘 包車行程'}
                            </span>
                            <span className={clsx(
                              'rounded-lg px-2 py-0.5 text-[10px] font-bold',
                              trip.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                            )}>
                              {trip.status}
                            </span>
                          </div>
                          <span className="font-bold text-emerald-300 font-mono text-xs">
                            {formatTWD(trip.priceEstimate)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <span className="text-slate-200 font-medium">{trip.pickupName}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-slate-200 font-medium">{trip.dropoffName}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono border-t border-white/5 pt-1.5">
                          <span>{trip.scheduledTime.slice(0, 16).replace('T', ' ')}</span>
                          <span className="text-cyan-400 flex items-center gap-1">
                            <Receipt className="h-3 w-3" /> 電子收據已開立
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-white/10 pt-4 mt-4 flex items-center justify-between">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setVoucherModalCustomer(selectedCustomer)
                    setVoucherCode(`VIP-${selectedCustomer.name.slice(0, 3).toUpperCase()}-500`)
                    setVoucherAmount(500)
                  }}
                  data-testid="drawer-issue-voucher-btn"
                >
                  <Gift className="h-3.5 w-3.5" />
                  <span>{lang === 'zh' ? '發行乘車抵用券' : 'Issue Voucher'}</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                >
                  {lang === 'zh' ? '關閉視窗' : 'Close Drawer'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Customer Notes & Tax ID Edit Modal */}
      <AnimatePresence>
        {editingNotesCustomer && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" data-testid="edit-customer-notes-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-white/20 bg-slate-950 p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                    <Edit3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {lang === 'zh' ? '編輯乘客偏好與發票統編' : 'Edit Preferences & Tax ID'}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{editingNotesCustomer.name} ({editingNotesCustomer.phone})</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingNotesCustomer(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {lang === 'zh' ? '客製化乘車偏好與備註 (Notes & Preferences)' : 'Notes & Preferences'}
                  </label>
                  <textarea
                    rows={3}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="例如：需要後座安靜、英文流利司機、需備兒童安全座椅、機場落地舉牌等…"
                    data-testid="customer-notes-textarea"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {lang === 'zh' ? '企業發票統一編號 (8碼)' : 'Corporate Tax ID (8 digits)'}
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={taxIdDraft}
                      onChange={(e) => setTaxIdDraft(e.target.value)}
                      placeholder="例如：23307688"
                      data-testid="customer-taxid-input"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {lang === 'zh' ? '財政部手機條碼載具' : 'Mobile Barcode Carrier'}
                    </label>
                    <input
                      type="text"
                      value={carrierBarcodeDraft}
                      onChange={(e) => setCarrierBarcodeDraft(e.target.value)}
                      placeholder="例如：/AB12+CD"
                      data-testid="customer-carrier-input"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                <Button variant="secondary" size="sm" onClick={() => setEditingNotesCustomer(null)}>
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveNotes} data-testid="save-customer-notes-btn">
                  {lang === 'zh' ? '儲存設定' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Issue Promotional Voucher Modal */}
      <AnimatePresence>
        {voucherModalCustomer && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" data-testid="issue-voucher-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-slate-950 p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {lang === 'zh' ? '發送專屬乘車抵用券' : 'Issue Credit Voucher'}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{voucherModalCustomer.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setVoucherModalCustomer(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleIssueVoucherSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {lang === 'zh' ? '抵用券代碼 (Promo Code)' : 'Promo Code'}
                  </label>
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    data-testid="voucher-code-input"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500 outline-none focus:border-purple-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {lang === 'zh' ? '折抵金額 (TWD)' : 'Credit Amount (NT$)'}
                  </label>
                  <div className="flex gap-2">
                    {[200, 500, 1000, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setVoucherAmount(amt)}
                        className={clsx(
                          'flex-1 rounded-xl py-2 text-xs font-bold border transition',
                          voucherAmount === amt
                            ? 'bg-purple-500/25 border-purple-400 text-purple-200'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white',
                        )}
                      >
                        NT${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-purple-950/30 border border-purple-500/20 p-3 text-[11px] text-purple-300">
                  💡 發送後優惠券將即時存入乘客 App 電子錢包，並推播通知提醒。
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                  <Button variant="secondary" size="sm" onClick={() => setVoucherModalCustomer(null)}>
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </Button>
                  <Button variant="primary" size="sm" type="submit" data-testid="submit-issue-voucher-btn">
                    {lang === 'zh' ? '確認發送' : 'Confirm & Send'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FleetOsPage>
  )
}
