import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Repeat,
  Plus,
  Search,
  CheckCircle2,
  Building2,
  Clock,
  Car,
  Zap,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { StatCard } from '../../components/ui/StatCard'
import { formatTWD } from '../../lib/format'
import { SEED_ROUTE_SUBSCRIPTIONS } from '../../data/newModulesSeed'
import type { RouteSubscription, SubscriptionStatus, SubscriptionTier } from '../../types'
import { useLang } from '../../i18n'
import clsx from 'clsx'

const STATUS_TONE: Record<SubscriptionStatus, 'green' | 'amber' | 'slate' | 'red'> = {
  ACTIVE: 'green',
  PAUSED: 'amber',
  EXPIRED: 'slate',
  CANCELLED: 'red',
}

const TIER_LABELS: Record<SubscriptionTier, { en: string; zh: string }> = {
  COMMUTER_BASIC: { en: 'Commuter Basic (12 Rides/Mo)', zh: '通勤月票 (每月12趟)' },
  EXECUTIVE_PRO: { en: 'Executive Pro (16 Rides/Mo)', zh: '商務菁英通行證 (每月16趟)' },
  VIP_ENTERPRISE_UNLIMITED: { en: 'VIP Enterprise Infinite', zh: '企業無限尊榮專案' },
}

const DAY_NAMES_ZH = ['日', '一', '二', '三', '四', '五', '六']
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function SubscriptionsPanel() {
  const { lang } = useLang()
  const [subscriptions, setSubscriptions] = useState<RouteSubscription[]>(SEED_ROUTE_SUBSCRIPTIONS)
  const [selectedSub, setSelectedSub] = useState<RouteSubscription | null>(subscriptions[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | SubscriptionStatus>('ALL')
  const [actionAlert, setActionAlert] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // New Subscription Form State
  const [newSubscriberName, setNewSubscriberName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCorpName, setNewCorpName] = useState('')
  const [newTier, setNewTier] = useState<SubscriptionTier>('EXECUTIVE_PRO')
  const [newOrigin, setNewOrigin] = useState('')
  const [newDestination, setNewDestination] = useState('')
  const [newPrice, setNewPrice] = useState(19800)

  const filteredSubs = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (statusFilter !== 'ALL' && sub.status !== statusFilter) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        sub.subscriberName.toLowerCase().includes(q) ||
        (sub.corporateName && sub.corporateName.toLowerCase().includes(q)) ||
        sub.routeOriginZh.includes(searchQuery) ||
        sub.routeOrigin.toLowerCase().includes(q) ||
        sub.routeDestinationZh.includes(searchQuery) ||
        sub.routeDestination.toLowerCase().includes(q) ||
        sub.subscriberPhone.includes(q)
      )
    })
  }, [subscriptions, statusFilter, searchQuery])

  const showAlert = (msg: string) => {
    setActionAlert(msg)
    setTimeout(() => setActionAlert(null), 4000)
  }

  const handleToggleStatus = (subId: string, currentStatus: SubscriptionStatus) => {
    const nextStatus: SubscriptionStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: nextStatus } : s)),
    )
    if (selectedSub && selectedSub.id === subId) {
      setSelectedSub((prev) => (prev ? { ...prev, status: nextStatus } : null))
    }
    showAlert(
      lang === 'zh'
        ? `訂閱通行證 ${subId} 狀態已切換為【${nextStatus}】`
        : `Subscription ${subId} status updated to [${nextStatus}]`,
    )
  }

  const handleCreateSubscription = () => {
    if (!newSubscriberName.trim() || !newOrigin.trim() || !newDestination.trim()) return
    const newSub: RouteSubscription = {
      id: `sub-${Date.now()}`,
      subscriberName: newSubscriberName.trim(),
      subscriberPhone: newPhone.trim() || '+886 900-123-456',
      corporateName: newCorpName.trim() || undefined,
      tier: newTier,
      billingCycle: 'MONTHLY',
      routeOrigin: newOrigin.trim(),
      routeOriginZh: newOrigin.trim(),
      routeDestination: newDestination.trim(),
      routeDestinationZh: newDestination.trim(),
      vehicleCategory: 'PREMIUM_SEDAN',
      ridesIncludedPerMonth: newTier === 'VIP_ENTERPRISE_UNLIMITED' ? 30 : newTier === 'EXECUTIVE_PRO' ? 16 : 12,
      ridesUsedThisPeriod: 0,
      pricePerPeriod: Number(newPrice) || 19800,
      status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10),
      renewDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      autoRenew: true,
      scheduledDays: [1, 2, 3, 4, 5],
      preferredPickupTime: '07:30',
      discountRatePct: 15,
    }

    setSubscriptions([newSub, ...subscriptions])
    setSelectedSub(newSub)
    setShowCreateModal(false)
    setNewSubscriberName('')
    setNewPhone('')
    setNewCorpName('')
    setNewOrigin('')
    setNewDestination('')
    showAlert(
      lang === 'zh'
        ? `定期專車通行證【${newSub.subscriberName}】已成功開通啟用！`
        : `New route pass created for ${newSub.subscriberName}!`,
    )
  }

  // KPIs
  const totalSubs = subscriptions.length
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE').length
  const totalMrr = subscriptions
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.pricePerPeriod, 0)
  const totalRidesDelivered = subscriptions.reduce((sum, s) => sum + s.ridesUsedThisPeriod, 0)

  return (
    <FleetOsPage
      title={lang === 'zh' ? '機場通勤與固定路線定期票 (Route Subscriptions)' : 'Airport Commuter & Route Subscriptions'}
      subtitle={
        lang === 'zh'
          ? '企業商務月票、新竹竹科 ↔ 桃機每週固定專車、高頻通勤定額訂閱方案管理'
          : 'Corporate monthly passes, recurring executive route schedules, and high-frequency airport commuter plans'
      }
      icon={<Repeat className="h-5 w-5 text-cyan-400" />}
      right={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          data-testid="create-subscription-btn"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>{lang === 'zh' ? '開通新定期通行證' : 'New Subscription'}</span>
        </button>
      }
    >
      <div className="pb-8" data-testid="subscriptions-panel">
        {/* Action Alert Banner */}
        <AnimatePresence>
          {actionAlert && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-950/80 p-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-xl"
              data-testid="subscription-alert"
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

        {/* Top KPI Cards */}
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Repeat className="h-4 w-4 text-cyan-400" />}
            label={lang === 'zh' ? '有效訂閱通行證' : 'Active Pass Holders'}
            value={activeSubs}
            tone="cyan"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={lang === 'zh' ? '定期合約月經常收入 (MRR)' : 'Subscription MRR'}
            value={totalMrr}
            prefix="NT$"
            tone="lime"
          />
          <StatCard
            icon={<Car className="h-4 w-4" />}
            label={lang === 'zh' ? '本期已履約趟次' : 'Rides Fulfilled (MTD)'}
            value={totalRidesDelivered}
            tone="purple"
          />
          <StatCard
            icon={<Building2 className="h-4 w-4" />}
            label={lang === 'zh' ? '企業簽約戶' : 'Contracted VIPs'}
            value={totalSubs}
            tone="amber"
          />
        </div>

        {/* 2-Column Split: Pass Directory & Pass Management Detail */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1.3fr]">
          {/* Left Column: Filterable Subscriptions List */}
          <div className="glass-panel rounded-3xl p-4 flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'zh' ? '搜尋企業、路線、聯絡電話…' : 'Search company, route, phone…'}
                  data-testid="subscriptions-search-input"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/40"
                />
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-1.5 py-3 border-b border-white/5">
              {(['ALL', 'ACTIVE', 'PAUSED', 'EXPIRED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={clsx(
                    'rounded-lg px-2.5 py-1 text-[11px] font-bold transition',
                    statusFilter === st
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                      : 'text-slate-400 bg-white/5 hover:bg-white/10',
                  )}
                >
                  {st === 'ALL'
                    ? lang === 'zh'
                      ? '全部通行證'
                      : 'All'
                    : st}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[580px]">
              {filteredSubs.map((sub) => {
                const isSelected = selectedSub?.id === sub.id
                const usagePct = Math.round((sub.ridesUsedThisPeriod / sub.ridesIncludedPerMonth) * 100)
                return (
                  <motion.div
                    key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    data-testid="subscription-card"
                    className={clsx(
                      'cursor-pointer rounded-2xl p-4 border transition relative overflow-hidden',
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-white">{sub.subscriberName}</p>
                        {sub.corporateName && (
                          <p className="text-[10px] text-cyan-300 font-semibold">{sub.corporateName}</p>
                        )}
                        <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                          <span className="font-semibold">{lang === 'zh' ? sub.routeOriginZh : sub.routeOrigin}</span>
                          <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
                          <span className="font-semibold">{lang === 'zh' ? sub.routeDestinationZh : sub.routeDestination}</span>
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[sub.status]}>{sub.status}</Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
                      <span>{TIER_LABELS[sub.tier][lang === 'zh' ? 'zh' : 'en']}</span>
                      <strong className="text-emerald-300 font-mono">{formatTWD(sub.pricePerPeriod)}/月</strong>
                    </div>

                    {/* Progress */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>{lang === 'zh' ? '本月趟次使用進度' : 'Rides Usage'}</span>
                        <span>{sub.ridesUsedThisPeriod} / {sub.ridesIncludedPerMonth} ({usagePct}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, usagePct)}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {filteredSubs.length === 0 && (
                <div className="py-16 text-center text-xs text-slate-500">
                  {lang === 'zh' ? '無符合條件之定期通行證' : 'No subscriptions match filter.'}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pass Detail & Weekly Recurring Schedule */}
          <div className="glass-panel rounded-3xl p-5 flex flex-col justify-between" data-testid="subscription-detail-card">
            {selectedSub ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                      <Repeat className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">{selectedSub.subscriberName}</h2>
                      <p className="text-xs text-slate-400">
                        {selectedSub.corporateName || (lang === 'zh' ? '個人 VIP 方案' : 'Individual VIP Plan')} · <span className="font-mono text-cyan-300">{selectedSub.subscriberPhone}</span>
                      </p>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[selectedSub.status]} className="text-xs px-2.5 py-1">
                    {selectedSub.status}
                  </Badge>
                </div>

                {/* Route Header Card */}
                <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 border border-cyan-500/30 p-4 space-y-3 shadow-lg">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    {lang === 'zh' ? '定期專屬保證專車路線' : 'Dedicated Guaranteed Route'}
                  </p>

                  <div className="flex items-center justify-between gap-2 text-sm font-bold text-white">
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-400 font-normal">{lang === 'zh' ? '固定上車地' : 'Pickup'}</p>
                      <p>{lang === 'zh' ? selectedSub.routeOriginZh : selectedSub.routeOrigin}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-cyan-400 shrink-0" />
                    <div className="flex-1 text-right">
                      <p className="text-[10px] text-slate-400 font-normal">{lang === 'zh' ? '固定目的地' : 'Dropoff'}</p>
                      <p>{lang === 'zh' ? selectedSub.routeDestinationZh : selectedSub.routeDestination}</p>
                    </div>
                  </div>
                </div>

                {/* Weekly Recurring Days */}
                <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    {lang === 'zh' ? '每週定期發車班表' : 'Weekly Recurring Schedule'}
                  </p>

                  <div className="flex items-center justify-between gap-1">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const isActive = selectedSub.scheduledDays.includes(day)
                      return (
                        <div
                          key={day}
                          className={clsx(
                            'flex flex-col items-center justify-center h-12 flex-1 rounded-xl border text-xs font-bold transition',
                            isActive
                              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 shadow-sm'
                              : 'bg-white/5 border-white/5 text-slate-600',
                          )}
                        >
                          <span className="text-[10px]">{lang === 'zh' ? DAY_NAMES_ZH[day] : DAY_NAMES_EN[day]}</span>
                          <span className="text-[9px] mt-0.5">{isActive ? selectedSub.preferredPickupTime : '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Billing & Contract Terms */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-3 space-y-1.5">
                    <p className="text-slate-400 text-[10.5px] uppercase font-bold">{lang === 'zh' ? '合約與續約週期' : 'Billing & Renewal'}</p>
                    <p className="text-slate-200 font-semibold">{selectedSub.billingCycle} ({selectedSub.startDate} ~ {selectedSub.renewDate})</p>
                    <p className="text-[11px] text-emerald-300 font-mono">{lang === 'zh' ? '合約專屬折扣' : 'Contract Discount'}: -{selectedSub.discountRatePct}% OFF</p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-3 space-y-1.5">
                    <p className="text-slate-400 text-[10.5px] uppercase font-bold">{lang === 'zh' ? '週期合約金額' : 'Period Amount'}</p>
                    <p className="text-lg font-black text-emerald-300 font-mono">{formatTWD(selectedSub.pricePerPeriod)}</p>
                    <p className="text-[10.5px] text-slate-400">{selectedSub.autoRenew ? (lang === 'zh' ? '✓ 自動扣款續約' : 'Auto-renew active') : (lang === 'zh' ? '手動續約' : 'Manual')}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <Button
                    variant="secondary"
                    onClick={() => handleToggleStatus(selectedSub.id, selectedSub.status)}
                    data-testid="toggle-sub-status-btn"
                  >
                    {selectedSub.status === 'ACTIVE'
                      ? lang === 'zh' ? '暫停此通行證' : 'Pause Subscription'
                      : lang === 'zh' ? '恢復啟用通行證' : 'Resume Subscription'}
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => showAlert(lang === 'zh' ? `已為【${selectedSub.subscriberName}】手動排入本週固定專車調派任務！` : `Scheduled this week's recurring VIP dispatches!`)}
                    data-testid="manual-schedule-dispatch-btn"
                  >
                    {lang === 'zh' ? '立即排定本週派車' : 'Dispatch Upcoming'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-500 text-sm">
                {lang === 'zh' ? '請從左側點選定期票以檢視班表細節' : 'Select a subscription pass to view schedule details.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Subscription Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl text-white space-y-4"
              data-testid="create-sub-modal"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                    <Repeat className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{lang === 'zh' ? '開通定期專車通行證' : 'New Route Subscription'}</h3>
                    <p className="text-xs text-slate-400">{lang === 'zh' ? '企業商務通勤與定額合約' : 'Corporate VIP Commuter'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'zh' ? '訂閱用戶/代表姓名 *' : 'Subscriber Name *'}</label>
                  <input
                    type="text"
                    value={newSubscriberName}
                    onChange={(e) => setNewSubscriberName(e.target.value)}
                    placeholder="e.g. David Chang (TSMC VIP)"
                    data-testid="new-sub-name-input"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'zh' ? '聯絡電話' : 'Phone'}</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+886 912-345-678"
                      data-testid="new-sub-phone-input"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/40"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'zh' ? '企業客戶名稱' : 'Corporate Name'}</label>
                    <input
                      type="text"
                      value={newCorpName}
                      onChange={(e) => setNewCorpName(e.target.value)}
                      placeholder="e.g. TSMC / MediaTek"
                      data-testid="new-sub-corp-input"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'zh' ? '出發地 *' : 'Origin *'}</label>
                    <input
                      type="text"
                      value={newOrigin}
                      onChange={(e) => setNewOrigin(e.target.value)}
                      placeholder="e.g. 新竹科學園區"
                      data-testid="new-sub-origin-input"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/40"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'zh' ? '目的地 *' : 'Destination *'}</label>
                    <input
                      type="text"
                      value={newDestination}
                      onChange={(e) => setNewDestination(e.target.value)}
                      placeholder="e.g. 桃園國際機場 第二航廈"
                      data-testid="new-sub-dest-input"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'zh' ? '方案等級' : 'Tier'}</label>
                    <select
                      value={newTier}
                      onChange={(e) => setNewTier(e.target.value as SubscriptionTier)}
                      data-testid="new-sub-tier-select"
                      className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40"
                    >
                      <option value="COMMUTER_BASIC">{lang === 'zh' ? '通勤月票 (12趟)' : 'Commuter Basic (12 Rides)'}</option>
                      <option value="EXECUTIVE_PRO">{lang === 'zh' ? '商務菁英 (16趟)' : 'Executive Pro (16 Rides)'}</option>
                      <option value="VIP_ENTERPRISE_UNLIMITED">{lang === 'zh' ? '企業尊榮 (30趟)' : 'Enterprise VIP (30 Rides)'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'zh' ? '月費定額 (NT$)' : 'Monthly Fee (NT$)'}</label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      data-testid="new-sub-price-input"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateSubscription}
                  disabled={!newSubscriberName.trim() || !newOrigin.trim() || !newDestination.trim()}
                  data-testid="submit-new-sub-btn"
                >
                  {lang === 'zh' ? '確認開通' : 'Activate Pass'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FleetOsPage>
  )
}
