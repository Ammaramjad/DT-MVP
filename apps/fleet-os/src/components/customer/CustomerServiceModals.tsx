import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  CheckCircle2,
  Copy,
  Heart,
  PackageSearch,
  Share2,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { Driver, LostItemReport, Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

const TIP_AMOUNTS = [50, 100, 200]

const DRIVER_TAGS = [
  { key: 'safe_driving', labelEn: 'Safe Driving', labelZh: '駕駛平穩' },
  { key: 'clean_vehicle', labelEn: 'Clean Vehicle', labelZh: '車室整潔' },
  { key: 'punctual', labelEn: 'Punctual', labelZh: '準時抵達' },
  { key: 'polite_service', labelEn: 'Courteous', labelZh: '親切有禮' },
  { key: 'smooth_route', labelEn: 'Great Route', labelZh: '熟門熟路' },
]

export function TipDriverModal({
  isOpen,
  onClose,
  order,
  driver,
}: {
  isOpen: boolean
  onClose: () => void
  order: Order
  driver?: Driver
}) {
  const { t, lang } = useLang()
  const tipAndRateDriver = useFleetStore((s) => s.tipAndRateDriver)

  const [selectedTip, setSelectedTip] = useState<number | null>(100)
  const [customTip, setCustomTip] = useState<string>('')
  const [ratingStars, setRatingStars] = useState<number>(5)
  const [selectedTags, setSelectedTags] = useState<string[]>(['safe_driving', 'clean_vehicle'])
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const effectiveTip = selectedTip !== null ? selectedTip : Number(customTip) || 0

  const toggleTag = (key: string) => {
    setSelectedTags((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const handleConfirm = () => {
    tipAndRateDriver(order.id, effectiveTip, selectedTags, ratingStars)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      onClose()
    }, 1400)
  }

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl" data-testid="tip-driver-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-pink-400/30 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl text-white max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-400 fill-pink-400/30" />
            <h3 className="text-sm font-bold text-white">{t('customer.tip.title')}</h3>
          </div>
          <button onClick={onClose} data-testid="close-tip-modal" className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/40 shadow-[0_0_15px_rgba(244,114,182,0.4)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-white">{t('customer.tip.thankYou')}</p>
            <p className="text-xs text-slate-400">{t('customer.tip.sentToDriver')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl mb-1">{driver?.avatarEmoji || '👨🏻‍✈️'}</div>
              <p className="text-sm font-bold text-white">{driver ? (lang === 'zh' ? driver.nameZh : driver.name) : 'Your Driver'}</p>
              <div className="flex justify-center gap-1 mt-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition"
                  >
                    <Star className={`h-5 w-5 ${star <= ratingStars ? 'fill-amber-400' : 'text-slate-600'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Recognition Tags */}
            <div>
              <p className="text-xs font-medium text-slate-300 mb-1.5">{t('customer.tip.serviceCompliments')}</p>
              <div className="flex flex-wrap gap-1.5">
                {DRIVER_TAGS.map((tag) => (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => toggleTag(tag.key)}
                    data-testid={`driver-tag-${tag.key}`}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      selectedTags.includes(tag.key)
                        ? 'bg-pink-500/25 text-pink-200 border border-pink-400/40 shadow-[0_0_8px_rgba(244,114,182,0.3)]'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {lang === 'zh' ? tag.labelZh : tag.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Tip Amount Grid */}
            <div>
              <p className="text-xs font-medium text-slate-300 mb-1.5">{t('customer.tip.selectAmount')}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {TIP_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedTip(amt)
                      setCustomTip('')
                    }}
                    data-testid={`tip-btn-${amt}`}
                    className={`rounded-xl py-2 text-xs font-bold transition border ${
                      selectedTip === amt
                        ? 'bg-pink-500/25 text-pink-200 border-pink-400/50 shadow-[0_0_10px_rgba(244,114,182,0.3)]'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    NT${amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedTip(null)}
                  className={`rounded-xl py-2 text-xs font-bold transition border ${
                    selectedTip === null
                      ? 'bg-pink-500/25 text-pink-200 border-pink-400/50'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Custom
                </button>
              </div>

              {selectedTip === null && (
                <div className="mt-2">
                  <input
                    type="number"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    placeholder="Enter custom NT$"
                    data-testid="custom-tip-input"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-pink-400 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              data-testid="confirm-tip-btn"
              className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-xs font-bold text-white shadow-lg shadow-pink-500/30 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              {effectiveTip > 0 ? t('customer.tip.payTipBtn', { amount: String(effectiveTip) }) : t('customer.tip.submitRatingOnly')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export function SplitFareModal({
  isOpen,
  onClose,
  order,
}: {
  isOpen: boolean
  onClose: () => void
  order: Order
}) {
  const { t } = useLang()
  const [coPassengerCount, setCoPassengerCount] = useState(2)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const splitAmount = Math.ceil(order.priceEstimate / coPassengerCount)
  const shareUrl = `https://dt-mvp-fleet-dispatch-8c37.surge.sh/pay-split?order=${order.orderNo}&share=${splitAmount}`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl" data-testid="split-fare-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-cyan-400/30 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl text-white text-center"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">{t('customer.split.title')}</h3>
          </div>
          <button onClick={onClose} data-testid="close-split-modal" className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-cyan-950/40 p-3 border border-cyan-500/20">
            <p className="text-[11px] text-cyan-300 font-semibold">{t('customer.split.eachPersonPays')}</p>
            <p className="text-2xl font-black text-white mt-0.5">{formatTWD(splitAmount)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Total {formatTWD(order.priceEstimate)} divided by {coPassengerCount}</p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-slate-300">{t('customer.split.passengers')}:</span>
            {[2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCoPassengerCount(num)}
                data-testid={`split-count-${num}`}
                className={`h-8 w-8 rounded-xl text-xs font-bold transition border ${
                  coPassengerCount === num
                    ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl bg-white p-2.5 shadow-xl">
            <QRCodeSVG value={shareUrl} size={110} />
          </div>

          <button
            onClick={handleCopy}
            data-testid="copy-split-link-btn"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? t('customer.split.copied') : t('customer.split.copyLink')}</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function LostAndFoundModal({
  isOpen,
  onClose,
  order,
}: {
  isOpen: boolean
  onClose: () => void
  order: Order
}) {
  const { t } = useLang()
  const reportLostItem = useFleetStore((s) => s.reportLostItem)

  const [category, setCategory] = useState<LostItemReport['itemCategory']>('PHONE')
  const [description, setDescription] = useState('')
  const [contactPhone, setContactPhone] = useState(order.customer.phone || '0912-')
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return

    reportLostItem(order.id, {
      itemCategory: category,
      itemDescription: description.trim(),
      contactPhone: contactPhone.trim(),
    })

    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      onClose()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl" data-testid="lost-found-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-amber-400/30 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl text-white"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">{t('customer.lost.title')}</h3>
          </div>
          <button onClick={onClose} data-testid="close-lost-found-modal" className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted || order.lostItemReport ? (
          <div className="py-6 text-center space-y-2.5">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-white">{t('customer.lost.reportSubmitted')}</p>
            <p className="text-xs text-slate-400">{t('customer.lost.driverContactedNote')}</p>
            {order.lostItemReport && (
              <div className="mt-2 rounded-xl bg-white/[0.03] p-2.5 text-left border border-white/10 text-[11px] space-y-1">
                <p className="font-semibold text-slate-200">Status: {order.lostItemReport.status}</p>
                <p className="text-slate-400">Item: {order.lostItemReport.itemCategory} - {order.lostItemReport.itemDescription}</p>
                {order.lostItemReport.dispatcherNotes && (
                  <p className="text-cyan-300 font-medium">Ops: {order.lostItemReport.dispatcherNotes}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <p className="text-xs text-slate-300">{t('customer.lost.promptDesc')}</p>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">{t('customer.lost.itemCategory')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LostItemReport['itemCategory'])}
                data-testid="lost-item-category-select"
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="PHONE">{t('customer.lost.catPhone')}</option>
                <option value="WALLET">{t('customer.lost.catWallet')}</option>
                <option value="LUGGAGE">{t('customer.lost.catLuggage')}</option>
                <option value="KEYS">{t('customer.lost.catKeys')}</option>
                <option value="DOCUMENT">{t('customer.lost.catDoc')}</option>
                <option value="OTHER">{t('customer.lost.catOther')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">{t('customer.lost.description')}</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Black iPhone 15 Pro in leather case"
                data-testid="lost-item-desc-input"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">{t('customer.lost.contactPhone')}</label>
              <input
                type="text"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                data-testid="lost-item-phone-input"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              data-testid="submit-lost-item-btn"
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              {t('customer.lost.submitReport')}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
