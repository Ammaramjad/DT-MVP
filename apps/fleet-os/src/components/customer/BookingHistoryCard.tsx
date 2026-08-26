import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarHeart, MapPin, Repeat } from 'lucide-react'
import type { CustomerHistoryEntry, CustomerProfile, Order } from '../../types'
import { OrderTypeBadge } from '../ui/OrderBadges'
import { formatDateTime, formatMonthYear, formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

interface CombinedEntry {
  id: string
  pickupName: string
  dropoffName: string
  type: Order['type']
  scheduledTime: string
  status: 'COMPLETED' | 'CANCELLED'
  priceEstimate: number
}

// "My Bookings" — a lightweight per-customer booking-frequency profile,
// combining seeded historical orders with any completed live orders from
// this session so the picture stays genuinely driven by shared store state.
export function BookingHistoryCard({ profile, liveOrders }: { profile: CustomerProfile | null; liveOrders: Order[] }) {
  const { t, lang } = useLang()
  const entries: CombinedEntry[] = useMemo(() => {
    const fromLive: CombinedEntry[] = liveOrders
      .filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED')
      .map((o) => ({
        id: o.id,
        pickupName: o.pickup.name,
        dropoffName: o.dropoff.name,
        type: o.type,
        scheduledTime: o.scheduledTime,
        status: o.status as 'COMPLETED' | 'CANCELLED',
        priceEstimate: o.priceEstimate,
      }))
    const fromHistory: CombinedEntry[] = (profile?.historicalOrders ?? []).map((h: CustomerHistoryEntry) => ({ ...h }))
    return [...fromLive, ...fromHistory].sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime())
  }, [profile, liveOrders])

  const totalRides = entries.filter((e) => e.status === 'COMPLETED').length
  const airportRides = entries.filter((e) => e.status === 'COMPLETED' && e.type !== 'TOUR_CHARTER')
  const tourRides = entries.filter((e) => e.status === 'COMPLETED' && e.type === 'TOUR_CHARTER').length
  const topPickup = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of airportRides) counts.set(e.pickupName, (counts.get(e.pickupName) ?? 0) + 1)
    let best: { name: string; count: number } | null = null
    for (const [name, count] of counts) if (!best || count > best.count) best = { name, count }
    return best
  }, [airportRides])

  const memberSince = profile?.memberSince ? new Date(profile.memberSince) : null
  const isRepeat = totalRides >= 3

  return (
    <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="booking-history-card">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <CalendarHeart className="h-4 w-4 text-blue-500" /> {t('history.myBookings')}
        </p>
        {isRepeat && (
          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600">
            <Repeat className="h-3 w-3" /> {t('history.repeatCustomer')}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-800">{t('history.ridesBooked', { n: totalRides })}</span>
        {topPickup && (
          <>
            {' '}
            · {t('history.fromLocation', { n: topPickup.count, name: topPickup.name.split(' ')[0] })}
          </>
        )}
        {tourRides > 0 && (
          <>
            {' '}
            · {t('history.tourCharters', { n: tourRides, plural: tourRides > 1 && lang === 'en' ? 's' : '' })}
          </>
        )}
        {memberSince && <> · {t('history.memberSince', { date: formatMonthYear(memberSince.toISOString(), lang) })}</>}
      </p>

      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
        {entries.length === 0 && <p className="p-3 text-center text-xs text-slate-400">{t('history.firstBooking')}</p>}
        {entries.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 text-xs"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-700">
                {e.pickupName} → {e.dropoffName}
              </p>
              <p className="text-[11px] text-slate-400">{formatDateTime(e.scheduledTime, lang)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <OrderTypeBadge type={e.type} />
              <span className={`text-[11px] font-semibold ${e.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                {formatTWD(e.priceEstimate)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
