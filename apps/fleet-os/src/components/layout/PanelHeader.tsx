import type { ReactNode } from 'react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { useFleetStore } from '../../store/useFleetStore'
import { TeamMessenger } from '../fleetos/TeamMessenger'

export function PanelHeader({
  title,
  subtitle,
  icon,
  light = false,
  right,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  light?: boolean
  right?: ReactNode
}) {
  const { t, lang } = useLang()
  const chatMessages = useFleetStore((s) => s.chatMessages)
  const [showMessengerDock, setShowMessengerDock] = useState(false)

  const unreadMsgCount = chatMessages.length > 0 ? Math.min(chatMessages.length, 5) : 0

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 pl-4 pr-24 sm:pl-6 sm:pr-28">
        <div className="flex items-center gap-3.5">
          {icon && (
            <div
              className={clsx(
                'flex h-11 w-11 items-center justify-center rounded-2xl shadow-xl transition',
                light
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20'
                  : 'glass-panel-glow border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]',
              )}
            >
              {icon}
            </div>
          )}
          <div>
            <h1 className={clsx('text-xl font-black tracking-tight sm:text-2xl', light ? 'text-slate-900' : 'text-white')}>{title}</h1>
            {subtitle && <p className={clsx('text-xs sm:text-sm mt-0.5', light ? 'text-slate-500' : 'text-slate-400')}>{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Persistent Floating Messenger Dock Launcher with glowing unread badge */}
          <button
            type="button"
            onClick={() => setShowMessengerDock((v) => !v)}
            data-testid="header-messenger-toggle-btn"
            className={clsx(
              'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition shadow-lg',
              showMessengerDock
                ? 'border-purple-400 bg-purple-500/30 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                : 'border-purple-400/40 bg-gradient-to-r from-purple-950/80 to-indigo-950/80 text-purple-300 hover:border-purple-300 hover:shadow-[0_0_12px_rgba(168,85,247,0.4)]',
            )}
          >
            <MessageSquare className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
            <span>{lang === 'zh' ? '💬 對講對話' : '💬 Messenger'}</span>
            {unreadMsgCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(168,85,247,0.8)]">
                {unreadMsgCount}
              </span>
            )}
          </button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ring-1 shadow-sm',
              light ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
            )}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            {t('common.liveSynced')}
          </motion.div>
          {right}
        </div>
      </div>

      {/* Floating Team Messenger Dock */}
      {showMessengerDock && (
        <TeamMessenger
          mode="FLOATING"
          onClose={() => setShowMessengerDock(false)}
        />
      )}
    </>
  )
}
