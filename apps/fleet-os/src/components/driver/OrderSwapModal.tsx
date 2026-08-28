import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, X } from 'lucide-react'
import type { Order, OrderSwapRequest } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { formatTWD, formatClock } from '../../lib/format'

interface OrderSwapModalProps {
  order: Order | null
  driverId: string
  isOpen: boolean
  onClose: () => void
}

const SWAP_REASONS: {
  key: OrderSwapRequest['reason']
  labelZh: string
  labelEn: string
  desc: string
}[] = [
  {
    key: 'FATIGUE_SHIFT_END',
    labelZh: '工時結束 / 疲勞交接 (Shift Ending / HoS Limit)',
    labelEn: 'Shift Ending / HoS Limit',
    desc: '今日值勤工時已滿或排班即將結束，需交接後續行程',
  },
  {
    key: 'TRAFFIC_JAM_DELAY',
    labelZh: '國道塞車嚴重延誤 (Traffic Jam Delay)',
    labelEn: 'Traffic Jam Delay',
    desc: '遭遇國道或市區重大塞車，無法準時趕往接機點',
  },
  {
    key: 'MECHANICAL_ISSUE',
    labelZh: '車輛機械突發狀況 (Mechanical Issue)',
    labelEn: 'Mechanical Issue',
    desc: '車輛輪胎警示、引擎故障或冷氣異常，需進廠檢修',
  },
  {
    key: 'PERSONAL_URGENT',
    labelZh: '司機個人緊急突發 (Personal Urgent)',
    labelEn: 'Personal Urgent',
    desc: '突發個人急事或身體不適，無法繼續執行此單',
  },
  {
    key: 'OTHER',
    labelZh: '其他特殊原因 (Other Reason)',
    labelEn: 'Other Reason',
    desc: '自訂備註填寫其他調度轉單原因',
  },
]

export function OrderSwapModal({ order, driverId, isOpen, onClose }: OrderSwapModalProps) {
  const { lang, t } = useLang()
  const createOrderSwapRequest = useFleetStore((s) => s.createOrderSwapRequest)

  const [selectedReason, setSelectedReason] = useState<OrderSwapRequest['reason']>('FATIGUE_SHIFT_END')
  const [customReason, setCustomReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen || !order) return null

  const handleSubmit = () => {
    createOrderSwapRequest({
      orderId: order.id,
      fromDriverId: driverId,
      reason: selectedReason,
      reasonCustom: customReason.trim() || undefined,
    })
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      onClose()
    }, 1200)
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none"
        data-testid="order-swap-modal"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-900/98 p-6 shadow-2xl shadow-cyan-500/20 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{lang === 'zh' ? '發起行程轉單 / 隊員交接' : 'Request Trip Handover / Swap'}</span>
                  <span className="font-mono text-xs text-cyan-300">({order.orderNo})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'zh' ? '發布轉單卡片至 #order-swaps 頻道供其他空車司機承接' : 'Broadcast swap card to #order-swaps for nearby drivers'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              data-testid="close-swap-modal-btn"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Trip Summary Card */}
          <div className="mt-4 rounded-xl bg-slate-950/60 p-3.5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-cyan-300">{order.orderNo}</span>
              <Badge tone="cyan">{t(`vehicle.category.${order.vehicleCategory}`)}</Badge>
            </div>
            <div className="text-xs text-slate-200">
              <p className="font-semibold text-white">
                {order.pickup.name} ➔ {order.dropoff.name}
              </p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>預約: {formatClock(order.scheduledTime, lang)}</span>
                <span className="font-bold text-emerald-400">{formatTWD(order.priceEstimate)}</span>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              {lang === 'zh' ? '選擇轉單交接原因 (Swap Reason)：' : 'Select Handover Reason:'}
            </label>
            <div className="space-y-1.5" data-testid="swap-reason-options">
              {SWAP_REASONS.map((r) => {
                const isSelected = selectedReason === r.key
                return (
                  <div
                    key={r.key}
                    onClick={() => setSelectedReason(r.key)}
                    data-testid={`swap-reason-${r.key.toLowerCase()}`}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition ${
                      isSelected
                        ? 'border-purple-400 bg-purple-500/15 ring-1 ring-purple-400'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? 'border-purple-400 bg-purple-500 text-white' : 'border-slate-500'
                    }`}>
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {lang === 'zh' ? r.labelZh : r.labelEn}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {r.desc}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {lang === 'zh' ? '補充說明備註 (Optional Notes)：' : 'Additional Notes (Optional):'}
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={lang === 'zh' ? '例如：電瓶異常正於保養廠檢測…' : 'e.g. Battery issue, waiting at repair shop…'}
                data-testid="swap-custom-reason-input"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
            <Button size="sm" variant="ghost" onClick={onClose}>
              {lang === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              data-testid="submit-swap-request-btn"
              onClick={handleSubmit}
              disabled={submitted}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold"
            >
              {submitted ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {lang === 'zh' ? '已成功發送轉單！' : 'Swap Requested!'}
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-1" />
                  {lang === 'zh' ? '確認發布轉單卡片 (Publish Swap Card)' : 'Publish Swap Card'}
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
