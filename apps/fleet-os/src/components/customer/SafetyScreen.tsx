import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, MessageSquareWarning, Phone, Share2, ShieldCheck, Siren } from 'lucide-react'
import type { Order } from '../../types'
import { useLang } from '../../i18n'

/**
 * Customer Safety Center — share-trip, emergency-contact, SOS, driver/vehicle
 * verification and "report a concern" flows. Explicitly prototype-only UI:
 * no real emergency-service connectivity is implied, per the client brief.
 */
export function SafetyScreen({ order }: { order: Order | null }) {
  const { t } = useLang()
  const [shared, setShared] = useState(false)
  const [sosActive, setSosActive] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportText, setReportText] = useState('')
  const [showReport, setShowReport] = useState(false)

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6" data-testid="customer-safety-screen">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('safety.title')}</h1>
        <p className="text-xs text-slate-500">{t('safety.subtitle')}</p>
      </div>

      <div className="rounded-2xl bg-amber-50 p-3.5 text-[11px] text-amber-700 ring-1 ring-amber-100">
        <AlertTriangle className="mb-1 h-4 w-4" /> {t('safety.demoDisclaimer')}
      </div>

      <AnimatePresence>
        {sosActive ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-red-500 p-5 text-center text-white shadow-xl shadow-red-500/30"
            data-testid="safety-sos-active"
          >
            <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.1, repeat: Infinity }} className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <Siren className="h-7 w-7" />
            </motion.div>
            <p className="mt-3 text-sm font-bold">{t('safety.sosActiveTitle')}</p>
            <p className="mt-1 text-xs text-white/85">{t('safety.sosActiveDesc')}</p>
            <button
              onClick={() => setSosActive(false)}
              data-testid="safety-sos-cancel"
              className="mt-4 w-full rounded-xl bg-white/15 py-2.5 text-xs font-semibold hover:bg-white/25"
            >
              {t('safety.sosCancel')}
            </button>
          </motion.div>
        ) : (
          <motion.button
            onClick={() => setSosActive(true)}
            data-testid="safety-sos-button"
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-lg shadow-red-100 ring-1 ring-red-100"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Siren className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-bold text-red-600">{t('safety.sosButton')}</span>
              <span className="block text-[11px] text-slate-500">{t('safety.sosButtonDesc')}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShared((v) => !v)}
          data-testid="safety-share-trip"
          className={`flex flex-col items-center gap-1.5 rounded-2xl p-4 text-center shadow-sm ring-1 transition ${
            shared ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : 'bg-white text-slate-600 ring-slate-100'
          }`}
        >
          {shared ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
          <span className="text-[11px] font-medium">{shared ? t('safety.shareActive') : t('safety.shareTrip')}</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-4 text-center text-slate-600 shadow-sm ring-1 ring-slate-100" data-testid="safety-emergency-contact">
          <Phone className="h-5 w-5" />
          <span className="text-[11px] font-medium">{t('safety.emergencyContact')}</span>
        </button>
      </div>

      {order && (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> {t('safety.verification')}
          </p>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>{t('safety.tripPin')}</span>
              <span className="font-mono font-bold text-slate-800" data-testid="safety-trip-pin">
                {order.pickupPin}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t('safety.orderNo')}</span>
              <span className="font-mono text-slate-500">{order.orderNo}</span>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => setShowReport((v) => !v)}
          data-testid="safety-report-concern-toggle"
          className="flex w-full items-center gap-2 text-sm font-semibold text-slate-700"
        >
          <MessageSquareWarning className="h-4 w-4 text-amber-500" /> {t('safety.reportConcern')}
        </button>
        <AnimatePresence>
          {showReport && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
              {reportSent ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-600" data-testid="safety-report-sent">
                  {t('safety.reportSent')}
                </p>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    rows={3}
                    placeholder={t('safety.reportPlaceholder')}
                    data-testid="safety-report-input"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => setReportSent(true)}
                    disabled={!reportText.trim()}
                    data-testid="safety-report-submit"
                    className="w-full rounded-xl bg-slate-800 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {t('safety.reportSubmit')}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
