import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LogOut,
  ShieldCheck,
  Ticket,
  Smartphone,
  Clock,
  Flame,
} from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { useGatekeeper } from '../../lib/gatekeeper'

export function formatSessionCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const hrs = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function SessionHeaderIndicator({ compact = false }: { compact?: boolean }) {
  const { t, lang } = useLang()
  const { currentUser, sessionRemainingMs, logout } = useGatekeeper()

  const countdownText = useMemo(() => {
    return formatSessionCountdown(sessionRemainingMs)
  }, [sessionRemainingMs])

  if (!currentUser) {
    return null
  }

  const isGuest = currentUser.authMethod === 'GUEST_ONE_TIME' || currentUser.role === 'guest'
  const isLine = currentUser.authMethod === 'LINE_2FA'
  const isAdmin = currentUser.role === 'admin'
  const isDispatcher = currentUser.role === 'dispatcher'

  return (
    <div
      className="flex items-center gap-2"
      data-testid="header-session-indicator"
    >
      {/* 1. Logged-in User Profile Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        data-testid="header-user-badge"
        className={clsx(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition backdrop-blur-md shadow-md',
          isGuest
            ? 'border border-amber-500/40 bg-amber-950/70 text-amber-300 ring-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
            : isLine
              ? 'border border-emerald-500/40 bg-emerald-950/70 text-emerald-300 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              : isAdmin
                ? 'border border-cyan-500/40 bg-cyan-950/70 text-cyan-300 ring-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                : 'border border-indigo-500/40 bg-indigo-950/70 text-indigo-300 ring-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.25)]',
        )}
      >
        {isGuest ? (
          <Ticket className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        ) : isLine ? (
          <Smartphone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
        )}

        <span className="truncate max-w-[150px] sm:max-w-none">
          {isGuest
            ? `🎟️ ${t('header.session.guestBadge')} (${currentUser.username})`
            : isAdmin
              ? `👤 ${currentUser.username} (${lang === 'zh' ? '系統管理員' : 'System Admin'})`
              : isDispatcher
                ? `👤 ${currentUser.username} (${lang === 'zh' ? '首席調度員' : 'Chief Dispatcher'})`
                : isLine
                  ? `📱 LINE 2FA (${currentUser.displayName})`
                  : `👤 ${currentUser.displayName || currentUser.username}`}
        </span>
      </motion.div>

      {/* 2. Session Live Countdown Timer */}
      {!compact && (
        <div
          data-testid="header-session-countdown"
          className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-300 shadow-sm backdrop-blur-md"
          title={t('header.session.countdown')}
        >
          <Clock className="h-3 w-3 text-cyan-400 animate-pulse" />
          <span>{countdownText}</span>
        </div>
      )}

      {/* 3. Prominent Logout Button */}
      <button
        type="button"
        onClick={() => logout()}
        data-testid="header-logout-btn"
        title={isGuest ? 'End session & Burn one-time pass' : 'End session & Lock'}
        className={clsx(
          'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition shadow-lg',
          isGuest
            ? 'border border-rose-500/50 bg-gradient-to-r from-rose-950/90 to-red-950/90 text-rose-300 hover:border-rose-400 hover:bg-rose-900/80 hover:text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]'
            : 'border border-rose-500/40 bg-slate-900/90 text-rose-300 hover:border-rose-400 hover:bg-rose-950 hover:text-white shadow-[0_0_10px_rgba(244,63,94,0.2)]',
        )}
      >
        {isGuest ? (
          <Flame className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
        ) : (
          <LogOut className="h-3.5 w-3.5 text-rose-400" />
        )}
        <span>{t('header.session.logout')}</span>
      </button>
    </div>
  )
}
