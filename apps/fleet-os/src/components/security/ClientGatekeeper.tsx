import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  KeyRound,
  MessageSquare,
  Lock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
} from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { LANGS } from '../../i18n/translations'
import { useGatekeeper } from '../../lib/gatekeeper'

export function ClientGatekeeper() {
  const { t, lang, setLang } = useLang()
  const { unlockWithPasscode, unlockWithLineOtp } = useGatekeeper()

  const [tab, setTab] = useState<'line' | 'passcode'>('line')
  const [passcode, setPasscode] = useState('')
  const [passcodeError, setPasscodeError] = useState<string | null>(null)

  // LINE 2FA simulation state
  const [lineIdentifier, setLineIdentifier] = useState('line_vip_client')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [lineOtp, setLineOtp] = useState('')
  const [lineError, setLineError] = useState<string | null>(null)
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null)

  const handleSendLineOtp = () => {
    if (!lineIdentifier.trim()) {
      setLineError(t('gatekeeper.line.emptyInput'))
      return
    }
    setLineError(null)
    setIsSendingOtp(true)
    setTimeout(() => {
      setIsSendingOtp(false)
      setOtpSent(true)
      setConfirmationNotice(t('gatekeeper.line.sentConfirmation'))
    }, 600)
  }

  const handleVerifyLineOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLineError(null)
    const success = unlockWithLineOtp(lineOtp)
    if (!success) {
      setLineError(t('gatekeeper.line.invalidOtp'))
    }
  }

  const handleVerifyPasscode = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setPasscodeError(null)
    const success = unlockWithPasscode(passcode)
    if (!success) {
      setPasscodeError(t('gatekeeper.passcode.invalid'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex min-h-screen w-screen flex-col items-center justify-center overflow-y-auto bg-slate-950 p-4 sm:p-6"
      data-testid="client-gatekeeper-overlay"
    >
      {/* Background glowing gradients */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[650px] rounded-full bg-gradient-to-br from-cyan-500/20 via-purple-600/15 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[400px] w-[500px] rounded-full bg-gradient-to-tl from-emerald-500/15 via-blue-600/10 to-transparent blur-3xl" />

      {/* Main Glassmorphic Access Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
        data-testid="gatekeeper-modal"
      >
        {/* Top Header: Brand & Language Toggle */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">{t('common.brand')}</span>
                <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300 ring-1 ring-amber-400/30">
                  {t('gatekeeper.badge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Fleet OS · Access Gatekeeper</p>
            </div>
          </div>

          {/* Language Switcher */}
          <div
            className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5"
            role="group"
            aria-label={t('lang.switchLabel')}
            data-testid="gatekeeper-language-switcher"
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                data-testid={`gatekeeper-lang-${l.code}`}
                aria-pressed={lang === l.code}
                className={clsx(
                  'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                  lang === l.code ? 'bg-cyan-300 text-mission-950' : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="mt-5 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-purple-500/20 text-cyan-300 ring-1 ring-white/15">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white sm:text-xl">{t('gatekeeper.title')}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t('gatekeeper.subtitle')}</p>
        </div>

        {/* Auth Method Tabs */}
        <div className="mt-6 flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('line')
              setPasscodeError(null)
              setLineError(null)
            }}
            data-testid="gatekeeper-tab-line"
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition',
              tab === 'line'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            <MessageSquare className="h-4 w-4" />
            {t('gatekeeper.tab.line2fa')}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('passcode')
              setPasscodeError(null)
              setLineError(null)
            }}
            data-testid="gatekeeper-tab-passcode"
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition',
              tab === 'passcode'
                ? 'bg-cyan-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            <KeyRound className="h-4 w-4" />
            {t('gatekeeper.tab.passcode')}
          </button>
        </div>

        {/* Tab Content: LINE 2FA */}
        {tab === 'line' && (
          <div className="mt-5 space-y-4" data-testid="gatekeeper-line-section">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-200">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <Smartphone className="h-4 w-4" />
                {t('gatekeeper.line.heading')}
              </div>
              <p className="mt-1 text-[11px] text-emerald-200/80 leading-relaxed">
                {t('gatekeeper.line.desc')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                {t('gatekeeper.line.inputLabel')}
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={lineIdentifier}
                  onChange={(e) => setLineIdentifier(e.target.value)}
                  placeholder={t('gatekeeper.line.inputPlaceholder')}
                  data-testid="gatekeeper-line-input"
                  className="input-field !py-2 !text-xs"
                />
                <button
                  type="button"
                  onClick={handleSendLineOtp}
                  disabled={isSendingOtp}
                  data-testid="gatekeeper-line-send-btn"
                  className="shrink-0 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isSendingOtp ? t('gatekeeper.line.sending') : otpSent ? t('gatekeeper.line.resend') : t('gatekeeper.line.sendOtp')}
                </button>
              </div>
            </div>

            {/* Calm confirmation notice without revealing passcode */}
            <AnimatePresence>
              {confirmationNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300 ring-1 ring-emerald-500/20"
                  data-testid="gatekeeper-line-sent-notice"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="leading-snug">{confirmationNotice}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP Input Form once sent */}
            <form onSubmit={handleVerifyLineOtp} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  {t('gatekeeper.line.otpLabel')}
                </label>
                <input
                  type="text"
                  value={lineOtp}
                  onChange={(e) => setLineOtp(e.target.value)}
                  placeholder={t('gatekeeper.line.otpPlaceholder')}
                  data-testid="gatekeeper-line-otp-input"
                  className="input-field mt-1.5 !py-2.5 text-center !text-sm font-mono tracking-widest"
                />
              </div>

              {lineError && (
                <div
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-300"
                  data-testid="gatekeeper-line-error"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{lineError}</span>
                </div>
              )}

              <button
                type="submit"
                data-testid="gatekeeper-line-verify-btn"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-emerald-400 hover:to-teal-400"
              >
                <span>{t('gatekeeper.line.verifyButton')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tab Content: Master Passcode */}
        {tab === 'passcode' && (
          <form onSubmit={handleVerifyPasscode} className="mt-5 space-y-4" data-testid="gatekeeper-passcode-section">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs text-cyan-200">
              <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                <KeyRound className="h-4 w-4" />
                {t('gatekeeper.passcode.heading')}
              </div>
              <p className="mt-1 text-[11px] text-cyan-200/80 leading-relaxed">
                {t('gatekeeper.passcode.desc')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                {t('gatekeeper.passcode.inputLabel')}
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={t('gatekeeper.passcode.inputPlaceholder')}
                data-testid="gatekeeper-passcode-input"
                className="input-field mt-1.5 !py-2.5 !text-sm"
              />
            </div>

            {passcodeError && (
              <div
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-300"
                data-testid="gatekeeper-passcode-error"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <button
              type="submit"
              data-testid="gatekeeper-passcode-unlock-btn"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-cyan-400 hover:to-blue-400"
            >
              <span>{t('gatekeeper.passcode.unlockButton')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Footer Security Notice */}
        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <p className="text-[10px] text-slate-500">
            {t('gatekeeper.securityNotice')}
          </p>
          <p className="mt-1 text-[10px] text-slate-600">
            {t('gatekeeper.footer.confidential')}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
