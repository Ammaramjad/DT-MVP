import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  Clock,
  Eye,
  ListChecks,
  MapPin,
  MessageSquareWarning,
  Navigation,
  Plane,
  Route,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import type { Driver, Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { StatusBadge, OrderTypeBadge, FlightBadge } from '../ui/OrderBadges'
import { formatClock, formatDateTime, formatTWD } from '../../lib/format'
import { RouteMapView } from '../map/RouteMapView'
import { useLang } from '../../i18n'

/** Full, searchable job history & schedule for the signed-in driver — the Driver
 * App's "Activity" tab, listing upcoming scheduled trips (Today, Tomorrow, Next 7 Days),
 * assigned airport bookings, flight delay alerts, route previews, and Shift timings. */
export function ActivityScreen({ driver, orders }: { driver: Driver; orders: Order[] }) {
  const { t, lang } = useLang()
  const createSupportTicket = useFleetStore((s) => s.createSupportTicket)
  const [query, setQuery] = useState('')
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null)
  const [upcomingTab, setUpcomingTab] = useState<'TODAY' | 'TOMORROW' | 'NEXT_7D'>('TODAY')

  const jobs = useMemo(() => orders.filter((o) => o.driverId === driver.id).sort((a, b) => b.createdAt - a.createdAt), [orders, driver.id])

  // Upcoming scheduled trips partitioned by Horizon
  const upcomingJobs = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10)

    const next7DaysEnd = new Date(now)
    next7DaysEnd.setDate(next7DaysEnd.getDate() + 7)

    const driverAssignedOrders = orders.filter((o) => o.driverId === driver.id && !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status))

    if (upcomingTab === 'TODAY') {
      return driverAssignedOrders.filter((o) => o.scheduledTime.slice(0, 10) === todayStr)
    } else if (upcomingTab === 'TOMORROW') {
      return driverAssignedOrders.filter((o) => o.scheduledTime.slice(0, 10) === tomorrowStr)
    } else {
      // NEXT_7D
      return driverAssignedOrders.filter((o) => {
        const d = new Date(o.scheduledTime)
        return d > tomorrow && d <= next7DaysEnd
      })
    }
  }, [orders, driver.id, upcomingTab])

  const assignedAirportBookings = useMemo(() => {
    return jobs.filter((j) => j.type === 'AIRPORT_PICKUP' || j.type === 'AIRPORT_DROPOFF' || !!j.flightInfo)
  }, [jobs])

  const flightAlerts = useMemo(() => {
    return jobs.filter((j) => j.flightInfo && (j.flightInfo.delayMinutes > 0 || j.flightInfo.status === 'DIVERTED' || j.flightInfo.status === 'DELAYED'))
  }, [jobs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter((job) => job.orderNo.toLowerCase().includes(q) || job.pickup.name.toLowerCase().includes(q) || job.dropoff.name.toLowerCase().includes(q) || job.pickup.nameZh.includes(q) || job.dropoff.nameZh.includes(q))
  }, [jobs, query])

  return (
    <div className="mx-auto max-w-md px-4 pb-6 space-y-4" data-testid="driver-activity-screen">
      {/* Route Preview Modal */}
      {previewOrder && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl" data-testid="driver-route-preview-modal">
          <div className="w-full max-w-md rounded-3xl border border-cyan-400/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-2xl text-white space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white">
                  {lang === 'zh' ? '路線預覽' : 'Route Preview'} · {previewOrder.orderNo}
                </h3>
              </div>
              <button onClick={() => setPreviewOrder(null)} className="rounded-lg p-1 text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-56 overflow-hidden rounded-2xl border border-white/10">
              <RouteMapView order={previewOrder} height="100%" />
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>{lang === 'zh' ? previewOrder.pickup.nameZh : previewOrder.pickup.name}</span>
              </p>
              <p className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                <span>{lang === 'zh' ? previewOrder.dropoff.nameZh : previewOrder.dropoff.name}</span>
              </p>
            </div>

            <button
              onClick={() => setPreviewOrder(null)}
              className="w-full rounded-xl bg-cyan-500/20 py-2 text-xs font-bold text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30"
            >
              {t('common.done')}
            </button>
          </div>
        </div>
      )}

      {/* Driver Working Shift & Timings Card */}
      <div className="glass-panel rounded-2xl p-4 border border-cyan-500/20" data-testid="driver-shift-timings-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {lang === 'zh' ? '今日執勤班表 (Shift Timings)' : 'Shift Schedule'}
            </h3>
          </div>
          <span className="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
            {driver.workingHours?.shiftType ? t(`shift.${driver.workingHours.shiftType}`) : 'DAY SHIFT'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
            <p className="text-[10px] text-slate-400">{lang === 'zh' ? '班表時段' : 'Active Hours'}</p>
            <p className="text-sm font-mono font-bold text-cyan-300 mt-0.5">
              {driver.workingHours ? `${driver.workingHours.shiftStart} - ${driver.workingHours.shiftEnd}` : '08:00 - 18:00'}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
            <p className="text-[10px] text-slate-400">{lang === 'zh' ? '服務模式' : 'Working Mode'}</p>
            <p className="text-xs font-bold text-purple-300 mt-0.5">
              {t(`fleetos.roster.mode.${driver.workingMode}`)}
            </p>
          </div>
        </div>
      </div>

      {/* NEW: Upcoming Scheduled Trips (未來預約行程) with tabs (Today, Tomorrow, Next 7 Days) */}
      <div className="glass-panel-glow rounded-3xl p-4 border border-cyan-400/30 shadow-2xl" data-testid="driver-upcoming-trips-section">
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {lang === 'zh' ? '未來預約行程 (Advance Trips)' : 'Upcoming Scheduled Trips'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {lang === 'zh' ? '提前掌握已確認接送、航班號與接機航廈' : 'Confirmed bookings, flights & gates'}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-400/40">
            <Sparkles className="h-2.5 w-2.5" />
            <span>{upcomingJobs.length} {lang === 'zh' ? '趟已排' : 'trips'}</span>
          </span>
        </div>

        {/* Horizon Tabs (Today, Tomorrow, Next 7 Days) */}
        <div className="flex items-center gap-1 rounded-2xl bg-slate-950/80 p-1 border border-white/10 mb-3" data-testid="driver-upcoming-tabs">
          {[
            { key: 'TODAY', labelZh: '本日行程', labelEn: 'Today' },
            { key: 'TOMORROW', labelZh: '明日預約', labelEn: 'Tomorrow' },
            { key: 'NEXT_7D', labelZh: '未來7天', labelEn: 'Next 7 Days' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setUpcomingTab(tab.key as any)}
              data-testid={`driver-upcoming-tab-${tab.key.toLowerCase()}`}
              className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition ${
                upcomingTab === tab.key
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'zh' ? tab.labelZh : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Upcoming Trips List */}
        <div className="space-y-2.5">
          {upcomingJobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <Calendar className="h-6 w-6 mx-auto mb-1.5 text-slate-600 opacity-60" />
              <p className="font-bold text-slate-400">{lang === 'zh' ? '此時段尚無排定預約行程' : 'No upcoming bookings in this window.'}</p>
              <p className="text-[10.5px] mt-0.5 text-slate-500">{lang === 'zh' ? '中心調度完成後將自動推播至此' : 'Dispatch pre-assignments will appear here.'}</p>
            </div>
          ) : (
            upcomingJobs.map((trip) => (
              <div
                key={trip.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-md space-y-2 hover:border-cyan-400/40 transition"
                data-testid={`driver-upcoming-trip-card-${trip.id}`}
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                      {trip.orderNo}
                    </span>
                    <OrderTypeBadge type={trip.type} />
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    預估 {formatTWD(trip.priceEstimate)}
                  </span>
                </div>

                {/* Pickup Time & Route */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1 font-mono text-cyan-200">
                      <Clock className="h-3 w-3 text-cyan-400" />
                      {formatDateTime(trip.scheduledTime, lang)}
                    </span>
                    <span className="text-slate-400 text-[10.5px]">{trip.channel}</span>
                  </div>

                  <div className="flex items-start gap-1.5 text-slate-200 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="truncate">{lang === 'zh' ? trip.pickup.nameZh : trip.pickup.name}</span>
                    <span className="text-slate-500 shrink-0">➔</span>
                    <span className="truncate">{lang === 'zh' ? trip.dropoff.nameZh : trip.dropoff.name}</span>
                  </div>
                </div>

                {/* Flight & Gate Details */}
                {trip.flightNumber && (
                  <div className="flex items-center justify-between rounded-xl bg-cyan-950/40 border border-cyan-500/20 p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Plane className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="font-mono font-bold text-white">{trip.flightNumber}</span>
                      {trip.flightInfo && (
                        <span className="text-[10.5px] text-slate-300">
                          {t('booking.gate', { gate: trip.flightInfo.gate })}
                        </span>
                      )}
                    </div>
                    {trip.flightInfo && <FlightBadge status={trip.flightInfo.status} />}
                  </div>
                )}

                {/* Passenger & Notes */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-1.5">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 text-slate-500" />
                    <span className="text-slate-200 font-medium">{trip.customer.name}</span>
                    <span className="font-mono text-[10px]">({trip.customer.phone})</span>
                  </span>

                  <button
                    onClick={() => setPreviewOrder(trip)}
                    className="flex items-center gap-1 text-[10.5px] font-bold text-cyan-300 hover:underline"
                  >
                    <Eye className="h-3 w-3" />
                    <span>{lang === 'zh' ? '預覽路線' : 'Preview'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Flight Delay Alerts Banner */}
      {flightAlerts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-3.5 shadow-lg space-y-2" data-testid="driver-flight-alerts-banner">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
            <AlertTriangle className="h-4 w-4 animate-bounce" />
            <span>{lang === 'zh' ? '即時航班異動與延誤警示' : 'Flight Delay & Schedule Alerts'}</span>
          </div>
          {flightAlerts.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-xl bg-black/40 p-2.5 text-xs text-slate-200 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <Plane className="h-3.5 w-3.5 text-amber-400" />
                <div>
                  <span className="font-mono font-bold text-amber-300">{f.flightInfo?.flightNumber}</span>
                  <span className="text-slate-400 text-[10.5px] ml-1.5">{f.customer.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10.5px] text-amber-300 border border-amber-400/30">
                  +{f.flightInfo?.delayMinutes}m DELAY
                </span>
                <FlightBadge status={f.flightInfo!.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's Assigned Airport Bookings Preview */}
      {assignedAirportBookings.length > 0 && (
        <div className="glass-panel rounded-2xl p-4" data-testid="driver-airport-bookings-section">
          <div className="flex items-center justify-between mb-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Plane className="h-3.5 w-3.5 text-cyan-400" />
              <span>{lang === 'zh' ? '今日指派機場專車' : 'Assigned Airport Bookings'}</span>
            </p>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400/30">
              {assignedAirportBookings.length} TRIPS
            </span>
          </div>
          <div className="space-y-2 mt-2">
            {assignedAirportBookings.slice(0, 3).map((job) => (
              <div key={job.id} className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">{job.orderNo}</span>
                    <OrderTypeBadge type={job.type} />
                  </div>
                  <button
                    onClick={() => setPreviewOrder(job)}
                    data-testid={`preview-route-btn-${job.orderNo}`}
                    className="flex items-center gap-1 rounded-lg bg-cyan-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-cyan-300 hover:bg-cyan-400/20 border border-cyan-400/30"
                  >
                    <Eye className="h-3 w-3" />
                    <span>{lang === 'zh' ? '路線預覽' : 'Preview'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 truncate">
                  {(lang === 'zh' ? job.pickup.nameZh : job.pickup.name)} → {(lang === 'zh' ? job.dropoff.nameZh : job.dropoff.name)}
                </p>
                {job.flightInfo && (
                  <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-white/5">
                    <span>✈ {job.flightInfo.flightNumber} ({t('booking.gate', { gate: job.flightInfo.gate })})</span>
                    <span className="text-cyan-300 font-medium">{formatClock(job.scheduledTime, lang)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full searchable Job History */}
      <div className="glass-panel rounded-2xl p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <ListChecks className="h-3.5 w-3.5" /> {t('driver.activity.title')}
        </p>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('driver.activity.searchPlaceholder')}
            data-testid="driver-activity-search"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
          />
        </div>
        {filtered.length === 0 && <p className="p-6 text-center text-xs text-slate-500">{t('driver.noJobsToday')}</p>}
        <div className="space-y-2">
          {filtered.map((job) => (
            <div key={job.id} className="rounded-xl bg-white/[0.03] p-3" data-testid="driver-activity-job-row">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-200">{job.orderNo}</span>
                <StatusBadge status={job.status} />
              </div>
              <p className="mt-1.5 truncate text-xs text-slate-400">
                {(lang === 'zh' ? job.pickup.nameZh : job.pickup.name)} → {(lang === 'zh' ? job.dropoff.nameZh : job.dropoff.name)}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <OrderTypeBadge type={job.type} />
                <span>{formatDateTime(job.scheduledTime, lang)}</span>
                <span className="font-semibold text-slate-300">{formatTWD(job.priceEstimate)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
                <button
                  onClick={() => setPreviewOrder(job)}
                  className="flex items-center gap-1 text-[10.5px] font-medium text-cyan-300 hover:underline"
                >
                  <Navigation className="h-3 w-3" /> {lang === 'zh' ? '查看路線圖' : 'View Route Map'}
                </button>
                {job.status === 'COMPLETED' && (
                  <div>
                    {reportedIds.has(job.id) ? (
                      <span className="text-[10.5px] font-medium text-cyan-300">{t('driver.activity.issueReported')}</span>
                    ) : (
                      <button
                        onClick={() => {
                          createSupportTicket(job.id, job.customer.name, t('driver.activity.issueSubject', { orderNo: job.orderNo }), 'Driver Operations')
                          setReportedIds((prev) => new Set(prev).add(job.id))
                        }}
                        data-testid="driver-activity-report-issue"
                        className="flex items-center gap-1 text-[10.5px] font-medium text-slate-400 hover:text-amber-300"
                      >
                        <MessageSquareWarning className="h-3 w-3" /> {t('driver.activity.reportIssue')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
