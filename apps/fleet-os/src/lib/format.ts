import { translate, type Lang } from '../i18n/translations'
import type { AppNotification } from '../types'

export const TICK_MS = 1500

export function formatTWD(amount: number): string {
  return `NT$${Math.round(amount).toLocaleString('en-US')}`
}

export function formatClock(iso: string, lang: Lang = 'en'): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(lang === 'zh' ? 'zh-TW' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

/** Calendar date only (with year) — for document expiry, where a time-of-day is meaningless. */
export function formatExpiryDate(iso: string, lang: Lang = 'en'): string {
  const d = new Date(iso)
  return d.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(iso: string, lang: Lang = 'en'): string {
  const d = new Date(iso)
  return d.toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatMonthYear(iso: string, lang: Lang = 'en'): string {
  const d = new Date(iso)
  return d.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'long', year: 'numeric' })
}

export function formatRelative(ts: number, lang: Lang = 'en'): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (diffSec < 5) return lang === 'zh' ? '剛剛' : 'just now'
  if (diffSec < 60) return lang === 'zh' ? `${diffSec}秒前` : `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return lang === 'zh' ? `${diffMin}分鐘前` : `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  return lang === 'zh' ? `${diffHr}小時前` : `${diffHr}h ago`
}

export function ticksToMinutesLabel(remainingTicks: number, lang: Lang = 'en'): string {
  const seconds = remainingTicks * (TICK_MS / 1000)
  const minutes = Math.max(0, Math.round(seconds / 60))
  if (minutes <= 0) return lang === 'zh' ? '不到1分鐘' : '<1 min'
  return lang === 'zh' ? `${minutes} 分鐘` : `${minutes} min`
}

export function nowPlusMinutesISO(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

export function orderTypeLabel(type: string, lang: Lang = 'en'): string {
  return translate(lang, `type.${type}`)
}

export function orderStatusLabel(status: string, lang: Lang = 'en'): string {
  return translate(lang, `status.${status}`)
}

export function notificationChannelLabel(channel: string, lang: Lang = 'en'): string {
  return translate(lang, `channel.${channel}`)
}

/**
 * Notification message templates reference `{channels}`, but the channel list
 * lives on the notification itself rather than in its params (the feed also
 * renders it as badges). This merges a localized, human-readable channel list
 * into the interpolation vars so the placeholder always resolves.
 */
export function notificationVars(
  notification: Pick<AppNotification, 'params' | 'channels'>,
  lang: Lang = 'en',
): Record<string, string | number> | undefined {
  const { params, channels } = notification
  if (!channels || channels.length === 0) return params
  return {
    ...params,
    channels: channels.map((c) => notificationChannelLabel(c, lang)).join(translate(lang, 'channel.joiner')),
  }
}

export function countdownLabel(msRemaining: number): string {
  const s = Math.max(0, Math.ceil(msRemaining / 1000))
  return `${s}s`
}

export function driverTierLabel(tier: string, lang: Lang = 'en'): string {
  return translate(lang, `tier.${tier}`)
}

export function driverStatusLabel(status: string, lang: Lang = 'en'): string {
  return translate(lang, `driverStatus.${status}`)
}

/** Formats a millisecond duration as mm:ss for the quotation-expiry countdown. */
export function formatCountdownClock(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
