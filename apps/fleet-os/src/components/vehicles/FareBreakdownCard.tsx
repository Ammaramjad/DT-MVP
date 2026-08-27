import { Info, ShieldCheck } from 'lucide-react'
import type { FareBreakdown } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

/**
 * The client brief's "clear and trustworthy breakdown" — every dynamic-
 * pricing line item is always rendered (base fare; distance/time; demand/
 * availability adjustment; weather/service-condition adjustment; airport/
 * toll/parking/waiting fees; VIP/night/holiday surcharges; discount; final
 * amount) with nothing hidden, plus the calm plain-language explanation for
 * *why* a surge/weather adjustment applied when one did. Reused by the
 * booking flow and the customer's trip-detail view so the same fare always
 * reads identically everywhere it's shown.
 */
export function FareBreakdownCard({ fareBreakdown, distanceKm, durationMin }: { fareBreakdown: FareBreakdown; distanceKm: number; durationMin: number }) {
  const { t, lang } = useLang()
  const pricingRules = useFleetStore((s) => s.pricingRules)
  const fb = fareBreakdown

  // `explanationParams` carries raw enum values (category/zone/weather/demand)
  // rather than pre-rendered text, so the same fare reads correctly in
  // whichever language is active — resolve them to display labels here.
  const resolvedExplanationParams = fb.explanationParams
    ? {
        category: t(`vehicle.category.${fb.explanationParams.category}`),
        zone: fb.explanationParams.zone ? t(`region.${fb.explanationParams.zone}`) : '',
        weather: t(`pricing.weather.${fb.explanationParams.weather}`),
        demand: t(`pricing.demandLevel.${fb.explanationParams.demand}`),
      }
    : undefined

  return (
    <div data-testid="fare-breakdown-card">
      <dl className="space-y-1 text-xs text-slate-600">
        <Row label={t('booking.fareBase')} value={fb.baseFare} />
        <Row label={t('booking.fareDistance', { km: distanceKm.toFixed(1) })} value={fb.distanceCost} />
        <Row label={t('booking.fareTime', { min: durationMin })} value={fb.timeCost} />
        {fb.demandAdjustment > 0 && <Row label={t('pricing.fareDemand', { level: t(`pricing.demandLevel.${fb.demandLevel}`) })} value={fb.demandAdjustment} tone="amber" />}
        {fb.weatherAdjustment > 0 && <Row label={t('pricing.fareWeather', { condition: t(`pricing.weather.${fb.weatherCondition}`) })} value={fb.weatherAdjustment} tone="amber" />}
        {fb.nightSurcharge > 0 && <Row label={t('pricing.fareNight')} value={fb.nightSurcharge} tone="amber" />}
        {fb.holidaySurcharge > 0 && <Row label={t('pricing.fareHoliday')} value={fb.holidaySurcharge} tone="amber" />}
        {fb.airportSurcharge > 0 && <Row label={t('booking.fareAirport')} value={fb.airportSurcharge} />}
        {fb.tollFee > 0 && <Row label={t('pricing.fareToll')} value={fb.tollFee} />}
        {fb.parkingFee > 0 && <Row label={t('pricing.fareParking')} value={fb.parkingFee} />}
        {fb.waitingFee > 0 && <Row label={t('booking.fareWaiting')} value={fb.waitingFee} tone="amber" />}
        {fb.vipSurcharge > 0 && <Row label={t('pricing.fareVip')} value={fb.vipSurcharge} tone="purple" />}
        <div className="flex justify-between border-t border-slate-100 pt-1 font-medium text-slate-700">
          <dt>{t('booking.fareSubtotal')}</dt>
          <dd>{formatTWD(fb.subtotal)}</dd>
        </div>
        {fb.discount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <dt>{t('booking.fareDiscount', { code: fb.couponCode ?? '' })}</dt>
            <dd>-{formatTWD(fb.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-slate-900">
          <dt>{t('booking.fareTotal')}</dt>
          <dd>{formatTWD(fb.total)}</dd>
        </div>
      </dl>

      {fb.explanationKey && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[11px] text-amber-700 ring-1 ring-amber-100" data-testid="pricing-explanation">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t(fb.explanationKey, resolvedExplanationParams)}</span>
        </div>
      )}

      {fb.fairnessCapApplied && (
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-[11px] text-blue-700 ring-1 ring-blue-100" data-testid="pricing-fairness-cap">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t('pricing.fairnessCapApplied', { pct: fb.appliedSurchargePct })}</span>
        </div>
      )}

      <p className="mt-2 text-[10.5px] text-slate-400" data-testid="pricing-transparency-note">
        {lang === 'zh' ? pricingRules.transparencyMessageZh : pricingRules.transparencyMessage}
      </p>
    </div>
  )
}

function Row({ label, value, tone }: { label: string; value: number; tone?: 'amber' | 'purple' }) {
  const toneClass = tone === 'amber' ? 'text-amber-600' : tone === 'purple' ? 'text-purple-600' : undefined
  return (
    <div className={`flex justify-between ${toneClass ?? ''}`}>
      <dt>{label}</dt>
      <dd>{formatTWD(value)}</dd>
    </div>
  )
}
