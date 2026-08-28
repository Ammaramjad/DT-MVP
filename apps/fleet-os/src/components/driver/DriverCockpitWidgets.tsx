import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Coffee,
  Coins,
  FileCheck2,
  X,
} from 'lucide-react'
import type { Driver, InstantCashoutReceipt } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

/**
 * Advanced Driver Cockpit Widgets:
 * 1. Fatigue & Hours of Service (HoS) Tracker with 7-hour limit countdown & rest mode toggle.
 * 2. Pre-Trip Vehicle Safety Inspection Checklist (Tires, Brakes, Lights, Dashcam).
 * 3. Instant Cashout / Earnings Payout Modal with Bank / LINE Pay Money selection and receipt.
 */

export function DriverFatigueWidget({ driver }: { driver: Driver }) {
  const { t } = useLang()
  const toggleDriverBreakMode = useFleetStore((s) => s.toggleDriverBreakMode)

  const serviceMinutes = driver.serviceMinutesToday ?? 140
  const maxShiftMinutes = 420 // 7 hours legal shift limit
  const remainingMinutes = Math.max(0, maxShiftMinutes - serviceMinutes)
  const remainingHours = (remainingMinutes / 60).toFixed(1)
  const progressPct = Math.min(100, (serviceMinutes / maxShiftMinutes) * 100)

  const isWarning = remainingMinutes <= 90
  const isCritical = remainingMinutes <= 30

  const isResting = driver.breakMode || driver.status === 'BREAK'

  return (
    <div className="glass-panel rounded-3xl p-4 border border-white/10 shadow-xl" data-testid="driver-fatigue-widget">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isResting ? 'bg-purple-500/20 text-purple-300' : isCritical ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
            <Clock3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{t('driver.fatigue.title')}</p>
            <p className="text-[10.5px] text-slate-400">{t('driver.fatigue.limit7h')}</p>
          </div>
        </div>

        <button
          onClick={() => toggleDriverBreakMode(driver.id)}
          data-testid="driver-break-toggle-btn"
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition shadow-md ${
            isResting
              ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
              : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
          }`}
        >
          <Coffee className="h-3.5 w-3.5" />
          <span>{isResting ? t('driver.fatigue.endBreak') : t('driver.fatigue.takeBreak')}</span>
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-400">{t('driver.fatigue.drivingHoursRemaining')}</span>
          <span className={isCritical ? 'text-rose-400 font-bold animate-pulse' : isWarning ? 'text-amber-400 font-bold' : 'text-emerald-300 font-bold'}>
            {isResting ? t('driver.fatigue.statusResting') : `${remainingHours}h ${t('driver.fatigue.hoursLeft')}`}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/10">
          <div
            className={`h-full transition-all duration-500 ${
              isCritical
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                : isWarning
                  ? 'bg-gradient-to-r from-cyan-500 to-amber-400'
                  : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 text-right">
          {serviceMinutes} / {maxShiftMinutes} min ({t('driver.fatigue.taiwanRegulation')})
        </p>
      </div>
    </div>
  )
}

export function PreTripInspectionModal({
  isOpen,
  onClose,
  driver,
}: {
  isOpen: boolean
  onClose: () => void
  driver: Driver
}) {
  const { t } = useLang()
  const submitPreTripInspection = useFleetStore((s) => s.submitPreTripInspection)

  const [checklist, setChecklist] = useState({
    tires: true,
    brakes: true,
    lights: true,
    dashcam: true,
  })

  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSave = () => {
    submitPreTripInspection(driver.id, checklist)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl" data-testid="pretrip-inspection-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-cyan-400/30 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl text-white"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">{t('driver.inspection.title')}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-white">{t('driver.inspection.passed')}</p>
            <p className="text-xs text-slate-400">{t('driver.inspection.readyToDispatch')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-300">{t('driver.inspection.subtitle')}</p>

            <div className="space-y-2">
              {[
                { key: 'tires', labelKey: 'driver.inspection.itemTires' },
                { key: 'brakes', labelKey: 'driver.inspection.itemBrakes' },
                { key: 'lights', labelKey: 'driver.inspection.itemLights' },
                { key: 'dashcam', labelKey: 'driver.inspection.itemDashcam' },
              ].map(({ key, labelKey }) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-xl bg-white/[0.03] p-2.5 border border-white/5 cursor-pointer hover:bg-white/[0.06] transition"
                >
                  <span className="text-xs font-medium text-slate-200">{t(labelKey)}</span>
                  <input
                    type="checkbox"
                    checked={checklist[key as keyof typeof checklist]}
                    onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
                    data-testid={`inspection-check-${key}`}
                    className="h-4 w-4 rounded border-white/20 bg-slate-800 text-cyan-500 focus:ring-cyan-400"
                  />
                </label>
              ))}
            </div>

            <button
              onClick={handleSave}
              data-testid="submit-inspection-btn"
              className="w-full mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              {t('driver.inspection.confirmSubmit')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export function InstantCashoutModal({
  isOpen,
  onClose,
  driver,
}: {
  isOpen: boolean
  onClose: () => void
  driver: Driver
}) {
  const { t } = useLang()
  const requestInstantCashout = useFleetStore((s) => s.requestInstantCashout)

  const availableBalance = driver.walletBalance ?? 12800
  const [amount, setAmount] = useState<number>(availableBalance)
  const [method, setMethod] = useState<'BANK_TRANSFER' | 'LINE_PAY_MONEY'>('BANK_TRANSFER')
  const [receipt, setReceipt] = useState<InstantCashoutReceipt | null>(null)

  if (!isOpen) return null

  const handleCashout = () => {
    if (amount <= 0 || amount > availableBalance) return
    const res = requestInstantCashout(driver.id, amount, method)
    setReceipt(res)
  }

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl" data-testid="instant-cashout-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-emerald-400/30 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl text-white"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">{t('driver.cashout.title')}</h3>
          </div>
          <button
            onClick={() => {
              setReceipt(null)
              onClose()
            }}
            data-testid="close-cashout-modal"
            className="rounded-lg p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {receipt ? (
          <div className="space-y-3 py-2 text-center" data-testid="cashout-receipt-card">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-black text-white">{t('driver.cashout.transferSuccess')}</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{formatTWD(receipt.netReceived)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-left space-y-1.5 text-[11px] text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">{t('driver.cashout.refNo')}</span>
                <span className="text-white">{receipt.referenceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('driver.cashout.account')}</span>
                <span className="text-white">{receipt.accountMask}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('driver.cashout.fee')}</span>
                <span className="text-white">NT${receipt.fee}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setReceipt(null)
                onClose()
              }}
              data-testid="cashout-receipt-dismiss-btn"
              className="w-full rounded-xl bg-white/10 py-2.5 text-xs font-bold text-white hover:bg-white/15 transition"
            >
              {t('common.done')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-950/40 p-3.5 border border-emerald-500/20">
              <p className="text-[11px] text-emerald-300 font-semibold">{t('driver.cashout.availableToCashout')}</p>
              <p className="text-2xl font-black text-white mt-0.5">{formatTWD(availableBalance)}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">{t('driver.cashout.selectMethod')}</label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMethod('BANK_TRANSFER')}
                  data-testid="cashout-method-bank"
                  className={`w-full flex items-center justify-between rounded-xl p-3 border transition text-left ${
                    method === 'BANK_TRANSFER'
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    <div>
                      <p className="text-xs font-bold">{t('driver.cashout.bankTransfer')}</p>
                      <p className="text-[10px] text-slate-400">CTBC Bank (822) **** 6789</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">NT$15 fee</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('LINE_PAY_MONEY')}
                  data-testid="cashout-method-linepay"
                  className={`w-full flex items-center justify-between rounded-xl p-3 border transition text-left ${
                    method === 'LINE_PAY_MONEY'
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    <div>
                      <p className="text-xs font-bold">{t('driver.cashout.linePayMoney')}</p>
                      <p className="text-[10px] text-slate-400">iPASS Money **** 3318</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">FREE</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-300">{t('driver.cashout.amount')}</label>
                <button
                  type="button"
                  onClick={() => setAmount(availableBalance)}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  {t('driver.cashout.withdrawAll')}
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                data-testid="cashout-amount-input"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <button
              onClick={handleCashout}
              disabled={amount <= 0 || amount > availableBalance}
              data-testid="confirm-cashout-btn"
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50"
            >
              {t('driver.cashout.confirmTransfer')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
