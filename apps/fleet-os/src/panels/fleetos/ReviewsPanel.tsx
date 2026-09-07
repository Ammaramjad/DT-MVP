import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  Sparkles,
  ThumbsUp,
  MessageSquare,
  Search,
  CheckCircle2,
  Award,
  ShieldCheck,
} from 'lucide-react'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { Badge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/StatCard'
import { formatRelative } from '../../lib/format'
import type { ReviewModerationStatus, ReviewSentiment } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import clsx from 'clsx'

const SENTIMENT_TONE: Record<ReviewSentiment, 'green' | 'amber' | 'red'> = {
  POSITIVE: 'green',
  NEUTRAL: 'amber',
  NEGATIVE: 'red',
}

const MODERATION_TONE: Record<ReviewModerationStatus, 'green' | 'red' | 'slate'> = {
  PUBLISHED: 'green',
  FLAGGED: 'red',
  HIDDEN: 'slate',
}

export default function ReviewsPanel() {
  const { lang } = useLang()
  const reviews = useFleetStore((s) => s.driverReviews)
  const setReviewModerationStatus = useFleetStore((s) => s.setReviewModerationStatus)

  const [searchQuery, setSearchQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL')
  const [sentimentFilter] = useState<'ALL' | ReviewSentiment>('ALL')
  const [actionAlert, setActionAlert] = useState<string | null>(null)

  const filteredReviews = useMemo(() => {
    return reviews.filter((rev) => {
      if (ratingFilter !== 'ALL' && rev.rating !== ratingFilter) return false
      if (sentimentFilter !== 'ALL' && rev.sentiment !== sentimentFilter) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        rev.customerName.toLowerCase().includes(q) ||
        rev.driverName.toLowerCase().includes(q) ||
        rev.driverNameZh.includes(searchQuery) ||
        rev.orderNo.toLowerCase().includes(q) ||
        rev.comment.toLowerCase().includes(q) ||
        rev.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [reviews, ratingFilter, sentimentFilter, searchQuery])

  const showAlert = (msg: string) => {
    setActionAlert(msg)
    setTimeout(() => setActionAlert(null), 4000)
  }

  const handleToggleModeration = (reviewId: string, current: ReviewModerationStatus) => {
    const next: ReviewModerationStatus = current === 'PUBLISHED' ? 'FLAGGED' : current === 'FLAGGED' ? 'HIDDEN' : 'PUBLISHED'
    setReviewModerationStatus(reviewId, next)
    showAlert(
      lang === 'zh'
        ? `評論 ${reviewId} 審核狀態已切換為【${next}】`
        : `Review ${reviewId} moderation status set to [${next}]`,
    )
  }

  // CSAT calculations
  const totalReviews = reviews.length
  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length
  const csatPct = Math.round((reviews.filter((r) => r.rating >= 4).length / totalReviews) * 100)

  // Driver ranking calculation
  const driverPerformance = useMemo(() => {
    const map = new Map<string, { driverId: string; name: string; nameZh: string; count: number; totalStars: number; tags: string[] }>()
    for (const r of reviews) {
      const existing = map.get(r.driverId) || { driverId: r.driverId, name: r.driverName, nameZh: r.driverNameZh, count: 0, totalStars: 0, tags: [] }
      existing.count += 1
      existing.totalStars += r.rating
      existing.tags.push(...r.tags)
      map.set(r.driverId, existing)
    }
    return Array.from(map.values())
      .map((d) => ({
        ...d,
        avg: (d.totalStars / d.count).toFixed(2),
        topTags: Array.from(new Set(d.tags)).slice(0, 3),
      }))
      .sort((a, b) => Number(b.avg) - Number(a.avg))
  }, [reviews])

  return (
    <FleetOsPage
      title={lang === 'zh' ? '司機服務滿意度與顧客評鑑 (CSAT Reviews)' : 'Driver CSAT & Passenger Rating Reviews'}
      subtitle={
        lang === 'zh'
          ? '全方位乘客五星滿意度指標、語音/文字情感分析、即時司機評級與負評自動預警'
          : 'Passenger satisfaction intelligence: CSAT ratings, sentiment breakdown, driver rankings, and review moderation'
      }
      icon={<Star className="h-5 w-5 text-amber-400 fill-amber-400" />}
    >
      <div className="pb-8" data-testid="reviews-panel">
        {/* Action Alert Banner */}
        <AnimatePresence>
          {actionAlert && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-950/80 p-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-xl"
              data-testid="reviews-alert"
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
            icon={<Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
            label={lang === 'zh' ? '車隊平均滿意度' : 'Fleet Avg Rating'}
            value={Number(avgRating)}
            suffix=" / 5.0"
            tone="purple"
          />
          <StatCard
            icon={<ThumbsUp className="h-4 w-4" />}
            label={lang === 'zh' ? 'CSAT 滿意指數' : 'CSAT Score (>=4★)'}
            value={csatPct}
            suffix="%"
            tone="lime"
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label={lang === 'zh' ? '五星好評總數' : '5-Star Reviews'}
            value={fiveStarCount}
            tone="cyan"
          />
          <StatCard
            icon={<MessageSquare className="h-4 w-4" />}
            label={lang === 'zh' ? '已分析乘客回饋' : 'Analyzed Reviews'}
            value={totalReviews}
            tone="amber"
          />
        </div>

        {/* 2-Column Split: Reviews Feed & Driver CSAT Leaderboard */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Left Column: Filterable Reviews Feed */}
          <div className="glass-panel rounded-3xl p-4 flex flex-col min-h-[600px]">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'zh' ? '搜尋司機、顧客評論、訂單標籤…' : 'Search driver, comment, tags…'}
                  data-testid="reviews-search-input"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400/40"
                />
              </div>

              {/* Rating Star Filters */}
              <div className="flex items-center gap-1">
                {(['ALL', 5, 4, 3, 2] as const).map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingFilter(star)}
                    className={clsx(
                      'flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition',
                      ratingFilter === star
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                        : 'text-slate-400 bg-white/5 hover:bg-white/10',
                    )}
                  >
                    {star === 'ALL' ? (
                      lang === 'zh' ? '全部星等' : 'All'
                    ) : (
                      <>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{star}★</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Reviews List */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1 max-h-[580px]">
              {filteredReviews.map((rev) => (
                <motion.div
                  key={rev.id}
                  layout
                  data-testid="driver-review-card"
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.04] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/30 text-amber-300 font-bold text-sm">
                        {rev.driverNameZh ? rev.driverNameZh[0] : '司'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">
                            {lang === 'zh' ? rev.driverNameZh : rev.driverName}
                          </p>
                          <span className="font-mono text-[11px] text-cyan-300 font-semibold">
                            {rev.vehiclePlate}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400">
                          {rev.customerName} · <span className="font-mono text-amber-300">{rev.orderNo}</span> · {formatRelative(rev.createdAt, lang)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={clsx(
                              'h-3.5 w-3.5',
                              i < rev.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-600',
                            )}
                          />
                        ))}
                      </div>
                      <Badge tone={SENTIMENT_TONE[rev.sentiment]}>
                        {rev.sentiment === 'POSITIVE'
                          ? lang === 'zh' ? '正向好評' : 'Positive'
                          : rev.sentiment === 'NEUTRAL'
                            ? lang === 'zh' ? '中性回饋' : 'Neutral'
                            : lang === 'zh' ? '預警需關注' : 'Attention Needed'}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                    "{rev.comment}"
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-1.5">
                      {rev.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge tone={MODERATION_TONE[rev.moderationStatus]}>
                        {rev.moderationStatus === 'PUBLISHED'
                          ? lang === 'zh' ? '公開' : 'Public'
                          : rev.moderationStatus === 'FLAGGED'
                            ? lang === 'zh' ? '列入跟進' : 'Flagged'
                            : lang === 'zh' ? '隱藏' : 'Hidden'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleToggleModeration(rev.id, rev.moderationStatus)}
                        className="rounded-lg bg-white/5 px-2 py-1 text-[10.5px] font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition"
                      >
                        {lang === 'zh' ? '變更審核' : 'Moderate'}
                      </button>
                    </div>
                  </div>

                  {rev.moderationNotes && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-2 text-[10.5px] text-rose-300">
                      <strong>{lang === 'zh' ? '客服跟進紀錄:' : 'Ops Follow-up:'}</strong> {rev.moderationNotes}
                    </div>
                  )}
                </motion.div>
              ))}

              {filteredReviews.length === 0 && (
                <div className="py-16 text-center text-xs text-slate-500">
                  {lang === 'zh' ? '無符合條件之乘客評鑑' : 'No customer reviews match filter criteria.'}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Driver Leaderboard & Satisfaction Analytics */}
          <div className="space-y-4">
            {/* Top Driver Ranking Card */}
            <div className="glass-panel rounded-3xl p-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-400" />
                  {lang === 'zh' ? '金牌司機評級排行' : 'Top Driver CSAT Leaderboard'}
                </p>
                <Badge tone="purple">{driverPerformance.length} {lang === 'zh' ? '位駕駛' : 'Drivers'}</Badge>
              </div>

              <div className="mt-3 space-y-2.5">
                {driverPerformance.map((d, idx) => (
                  <div
                    key={d.driverId}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.02] border border-white/5 p-3 hover:bg-white/[0.04] transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={clsx(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-black',
                          idx === 0
                            ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                            : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-white/10 text-slate-400',
                        )}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{lang === 'zh' ? d.nameZh : d.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {d.topTags.map((tag) => (
                            <span key={tag} className="text-[9px] text-slate-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs font-black text-amber-300">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{d.avg}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">{d.count} {lang === 'zh' ? '則評價' : 'reviews'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Quality Standards */}
            <div className="glass-panel rounded-3xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                {lang === 'zh' ? '車隊五星服務品質守則' : 'Service Excellence Standards'}
              </p>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02]">
                  <span>{lang === 'zh' ? '準時到達率目標' : 'Punctuality Target'}</span>
                  <strong className="text-emerald-300">99.2% (±5 min)</strong>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02]">
                  <span>{lang === 'zh' ? '舉牌接機落實度' : 'Meet & Greet Board Compliance'}</span>
                  <strong className="text-cyan-300">100% Verified</strong>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02]">
                  <span>{lang === 'zh' ? '外語溝通接待支援' : 'Multilingual Concierge Support'}</span>
                  <strong className="text-purple-300">EN / JA / KO</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FleetOsPage>
  )
}
