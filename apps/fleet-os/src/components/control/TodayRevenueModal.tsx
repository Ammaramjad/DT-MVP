import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign,
  PieChart as PieIcon,
  X,
  Receipt,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

interface TodayRevenueModalProps {
  isOpen: boolean
  onClose: () => void
}

const TIER_COLORS: Record<string, string> = {
  SEDAN: '#22d3ee',
  SUV: '#a855f7',
  VAN: '#fbbf24',
  LUXURY: '#f472b6',
  MINIBUS: '#a3e635',
}

export function TodayRevenueModal({ isOpen, onClose }: TodayRevenueModalProps) {
  const { lang } = useLang()
  const orders = useFleetStore((s) => s.orders)

  const now = Date.now()
  const todayOrders = useMemo(() => {
    return orders.filter((o) => {
      const isCompleted = o.status === 'COMPLETED'
      const completedTime = o.statusHistory.find((h) => h.status === 'COMPLETED')?.at ?? o.createdAt
      return isCompleted && now - completedTime <= 24 * 60 * 60 * 1000
    })
  }, [orders, now])

  // Aggregate stats
  const totalRevenue = useMemo(() => todayOrders.reduce((sum, o) => sum + o.priceEstimate, 0), [todayOrders])
  const platformCommission = Math.round(totalRevenue * 0.18) // 18% average platform commission
  const driverPayouts = totalRevenue - platformCommission
  const avgFare = todayOrders.length > 0 ? Math.round(totalRevenue / todayOrders.length) : 0

  // Revenue by vehicle physical type
  const vehicleTierData = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>()
    todayOrders.forEach((o) => {
      const type = o.vehicleType || 'SEDAN'
      const existing = map.get(type) || { count: 0, revenue: 0 }
      map.set(type, {
        count: existing.count + 1,
        revenue: existing.revenue + o.priceEstimate,
      })
    })

    return Array.from(map.entries()).map(([type, stats]) => ({
      name: type,
      displayName: type === 'SEDAN' ? 'Comfort Sedan' : type === 'SUV' ? 'Premium SUV' : type === 'VAN' ? '9-Seater Van' : type === 'LUXURY' ? 'VIP Luxury' : 'Charter Minibus',
      trips: stats.count,
      revenue: stats.revenue,
      pct: totalRevenue > 0 ? Math.round((stats.revenue / totalRevenue) * 100) : 0,
      color: TIER_COLORS[type] || '#22d3ee',
    })).sort((a, b) => b.revenue - a.revenue)
  }, [todayOrders, totalRevenue])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none"
        data-testid="today-revenue-modal"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl border border-lime-400/40 bg-slate-900/98 p-6 shadow-2xl shadow-lime-500/20 text-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-500/20 text-lime-400 border border-lime-400/40 shadow-[0_0_20px_rgba(163,230,53,0.3)]">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{lang === 'zh' ? '今日營收財務分析儀表板' : "Today's Revenue & Financial Analytics"}</span>
                  <span className="rounded-full bg-lime-400/20 px-2 py-0.5 text-[10.5px] font-mono text-lime-300 border border-lime-400/30">
                    REAL-TIME LEDGER
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'zh' ? '當日實收車資、車隊 18% 抽成拆帳、車種收益比重與 24 小時時段曲線' : 'Gross revenue, 18% commission split, vehicle earnings & hourly trends'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              data-testid="close-revenue-modal-btn"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="rounded-2xl bg-lime-950/40 border border-lime-500/30 p-3.5 shadow-inner">
              <p className="text-[10.5px] font-bold text-lime-300 uppercase">{lang === 'zh' ? '今日總營收 (Gross)' : 'Gross Revenue'}</p>
              <p className="mt-1 text-2xl font-black text-lime-400 font-mono">{formatTWD(totalRevenue)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{todayOrders.length} {lang === 'zh' ? '趟已結算訂單' : 'trips settled'}</p>
            </div>
            <div className="rounded-2xl bg-purple-950/40 border border-purple-500/30 p-3.5 shadow-inner">
              <p className="text-[10.5px] font-bold text-purple-300 uppercase">{lang === 'zh' ? '車隊抽成 (18% Commission)' : 'Fleet Commission'}</p>
              <p className="mt-1 text-2xl font-black text-purple-300 font-mono">{formatTWD(platformCommission)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{lang === 'zh' ? '淨利收益已入金庫' : 'Net platform revenue'}</p>
            </div>
            <div className="rounded-2xl bg-cyan-950/40 border border-cyan-500/30 p-3.5 shadow-inner">
              <p className="text-[10.5px] font-bold text-cyan-300 uppercase">{lang === 'zh' ? '司機撥款總額 (Net Payout)' : 'Driver Payouts'}</p>
              <p className="mt-1 text-2xl font-black text-cyan-300 font-mono">{formatTWD(driverPayouts)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{lang === 'zh' ? '錢包即時提現撥款' : 'Available for cashout'}</p>
            </div>
            <div className="rounded-2xl bg-amber-950/40 border border-amber-500/30 p-3.5 shadow-inner">
              <p className="text-[10.5px] font-bold text-amber-300 uppercase">{lang === 'zh' ? '平均客單價 (Avg Fare)' : 'Average Fare'}</p>
              <p className="mt-1 text-2xl font-black text-amber-300 font-mono">{formatTWD(avgFare)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{lang === 'zh' ? '含機場接送與包車' : 'Across all categories'}</p>
            </div>
          </div>

          {/* Charts & Breakdown */}
          <div className="mt-4 flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1">
            {/* Vehicle Tier Breakdown */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5 mb-3">
                  <PieIcon className="h-4 w-4 text-cyan-400" />
                  <span>{lang === 'zh' ? '車種收益比重與分佈' : 'Earnings by Vehicle Tier'}</span>
                </h4>
                <div className="space-y-2.5">
                  {vehicleTierData.map((tier) => (
                    <div key={tier.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200 flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
                          {tier.displayName}
                        </span>
                        <span className="font-mono text-white font-bold">
                          {formatTWD(tier.revenue)} ({tier.pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${tier.pct}%`, backgroundColor: tier.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-3 border-t border-white/5 pt-2">
                {lang === 'zh' ? '※ 尊榮商務休旅 (SUV) 與 9 人座商務車貢獻逾 65% 之高單價營收。' : '※ SUVs and 9-Seater Vans contribute >65% of high-yield airport revenues.'}
              </p>
            </div>

            {/* Today Settled Trips Sample List */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5 mb-3">
                  <Receipt className="h-4 w-4 text-lime-400" />
                  <span>{lang === 'zh' ? '今日最新結算趟次明細' : 'Recent Settled Trips'}</span>
                </h4>
                <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                  {todayOrders.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/5 p-2 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-cyan-300 font-bold">{o.orderNo}</span>
                          <span className="text-slate-400 text-[11px]">{o.pickup.name} ➔ {o.dropoff.name}</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">{o.customer.name} · {o.vehicleCategory}</p>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-bold text-emerald-300">{formatTWD(o.priceEstimate)}</span>
                        <p className="text-[10px] text-slate-500">+{formatTWD(Math.round(o.priceEstimate * 0.18))} com.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>{lang === 'zh' ? '財務狀態：已入帳並完成電子發票開立' : 'Status: Settled & e-GUI Invoiced'}</span>
                <span className="text-lime-400 font-bold">100% Captured</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
