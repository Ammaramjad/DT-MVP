import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ShieldAlert, Siren, Star, X, Zap } from 'lucide-react'
import type { Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { rankRescueDrivers } from '../../lib/dispatch'
import { Button } from '../ui/Button'
import { RouteMapView } from '../map/RouteMapView'
import { useLang } from '../../i18n'

interface EmergencyRescueDrawerProps {
  order: Order
  onClose: () => void
}

export function EmergencyRescueDrawer({ order, onClose }: EmergencyRescueDrawerProps) {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const dispatchRescueDriver = useFleetStore((s) => s.dispatchRescueDriver)
  const resolveEmergencyIncident = useFleetStore((s) => s.resolveEmergencyIncident)

  const originalDriver = drivers.find((d) => d.id === order.originalDriverId || d.id === order.driverId)
  const accidentLat = order.currentPos?.lat ?? order.incidentDetails?.reportedLocation.lat ?? order.pickup.lat
  const accidentLng = order.currentPos?.lng ?? order.incidentDetails?.reportedLocation.lng ?? order.pickup.lng

  const rankedCandidates = useMemo(
    () => rankRescueDrivers(order, drivers, vehicles, { lat: accidentLat, lng: accidentLng }),
    [order, drivers, vehicles, accidentLat, accidentLng],
  )

  const assignedRescueDriver = drivers.find((d) => d.id === order.rescueDriverId)
  const isDispatched = order.emergencyStatus === 'RESCUE_DISPATCHED' || order.emergencyStatus === 'RESCUE_EN_ROUTE' || order.emergencyStatus === 'RESCUE_ARRIVED'
  const isResolved = order.emergencyStatus === 'RESOLVED'

  return (
    <div
      className="fixed inset-0 z-[1500] flex justify-end bg-slate-950/70 backdrop-blur-sm"
      data-testid="emergency-rescue-drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-rose-500/30 bg-slate-900 shadow-2xl text-white"
        data-testid="emergency-rescue-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-500/20 bg-rose-500/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40">
              <Siren className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-white">{order.orderNo}</span>
                <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10.5px] font-bold text-rose-300 ring-1 ring-rose-500/30 uppercase">
                  {order.incidentType ? t(`driver.emergency.type${order.incidentType === 'MEDICAL_EMERGENCY' ? 'Medical' : order.incidentType === 'BREAKDOWN' ? 'Breakdown' : order.incidentType === 'ROAD_BLOCK' ? 'RoadBlock' : 'Accident'}`) : 'EMERGENCY'}
                </span>
              </div>
              <p className="text-xs text-rose-300/80">{t('control.emergency.drawerSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="emergency-drawer-close"
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-sm">
          {/* Incident Status Banner */}
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 to-slate-900 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  {t('control.emergency.statusTitle')}
                </p>
                <p className="mt-1 text-base font-bold text-white">
                  {order.emergencyStatus === 'RESCUE_ARRIVED'
                    ? t('control.emergency.statusArrived')
                    : order.emergencyStatus === 'RESCUE_EN_ROUTE'
                    ? t('control.emergency.statusEnRoute')
                    : order.emergencyStatus === 'RESCUE_DISPATCHED'
                    ? t('control.emergency.statusDispatched')
                    : isResolved
                    ? t('control.emergency.statusResolved')
                    : t('control.emergency.statusAwaitingDispatch')}
                </p>
              </div>
              {order.incidentDetails?.passengerSafe !== undefined && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    order.incidentDetails.passengerSafe
                      ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                  }`}
                >
                  {order.incidentDetails.passengerSafe ? t('driver.emergency.passengerSafe') : t('driver.emergency.passengerInjured')}
                </span>
              )}
            </div>

            {order.incidentDetails && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-rose-500/20 pt-3 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400">{t('control.emergency.incidentNote')}:</span>{' '}
                  <span className="font-medium text-white">{order.incidentDetails.note}</span>
                </div>
                <div>
                  <span className="text-slate-400">{t('control.emergency.needsAmbulance')}:</span>{' '}
                  <span className="font-medium text-white">{order.incidentDetails.needsAmbulance ? t('common.yes') : t('common.no')}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">{t('control.emergency.strandedLocation')}:</span>{' '}
                  <span className="font-medium text-cyan-300">{order.incidentDetails.reportedLocation.address || `${order.pickup.nameZh} 往 ${order.dropoff.nameZh}`}</span>
                </div>
              </div>
            )}
          </div>

          {/* Original Driver & Trip Overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('control.emergency.originalDriver')}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xl">{originalDriver?.avatarEmoji ?? '👤'}</span>
                <div>
                  <p className="font-bold text-white leading-tight">{lang === 'zh' ? originalDriver?.nameZh : originalDriver?.name}</p>
                  <p className="text-[11px] text-rose-300">{t('driver.status.INCIDENT')}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('control.emergency.passengerInfo')}</p>
              <div className="mt-1.5">
                <p className="font-bold text-white">{order.customer.name}</p>
                <p className="text-xs text-slate-400">{order.customer.phone} · {order.passengers} pax · {order.luggage} bags</p>
              </div>
            </div>
          </div>

          {/* Live Incident Map Preview */}
          <div className="h-44 overflow-hidden rounded-2xl border border-white/10">
            <RouteMapView order={order} />
          </div>

          {/* Rescue Dispatch Section */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {t('control.emergency.compatibleRescueVehicles')} ({rankedCandidates.length})
              </h3>
              {rankedCandidates.length > 0 && !isDispatched && (
                <button
                  onClick={() => dispatchRescueDriver(order.id, rankedCandidates[0].driver.id)}
                  data-testid="auto-dispatch-fastest-rescue-btn"
                  className="flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-cyan-200"
                >
                  <Zap className="h-3.5 w-3.5" /> {t('control.emergency.dispatchFastest')}
                </button>
              )}
            </div>

            {isDispatched && assignedRescueDriver ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4" data-testid="assigned-rescue-driver-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl">
                      {assignedRescueDriver.avatarEmoji}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-base">{lang === 'zh' ? assignedRescueDriver.nameZh : assignedRescueDriver.name}</p>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          {t('control.emergency.assignedBadge')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{assignedRescueDriver.phone} · {assignedRescueDriver.tier}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{t('control.emergency.status')}</p>
                    <p className="text-xs font-bold text-emerald-300">{order.emergencyStatus}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-emerald-500/20 pt-3">
                  <Button
                    fullWidth
                    variant="success"
                    onClick={() => resolveEmergencyIncident(order.id)}
                    data-testid="resolve-emergency-btn"
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t('control.emergency.markResolved')}
                  </Button>
                </div>
              </div>
            ) : rankedCandidates.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-xs text-slate-400">
                {t('control.emergency.noDriversAvailable')}
              </div>
            ) : (
              <div className="space-y-2.5" data-testid="rescue-candidates-list">
                {rankedCandidates.map(({ driver: candidate, vehicle: candVehicle, distanceKm, etaMinutes }, index) => {
                  return (
                    <div
                      key={candidate.id}
                      data-testid={`rescue-candidate-${candidate.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5 transition hover:bg-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{candidate.avatarEmoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{lang === 'zh' ? candidate.nameZh : candidate.name}</span>
                            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                              {candVehicle.plate}
                            </span>
                            <span className="rounded-md bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">
                              {t(`vehicle.category.${candVehicle.category}`)}
                            </span>
                            {index === 0 && (
                              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                {t('control.emergency.recommended')}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-300 text-amber-300" /> {candidate.rating.toFixed(1)}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-cyan-300">{distanceKm.toFixed(1)} km ({etaMinutes} min ETA)</span>
                            <span>•</span>
                            <span>{candidate.tier}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => dispatchRescueDriver(order.id, candidate.id)}
                        data-testid={`dispatch-rescue-driver-btn-${candidate.id}`}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-rose-500/20 transition hover:opacity-90 active:scale-95"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {t('control.emergency.dispatchThisDriver')}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Audit Timeline Notes */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {t('control.emergency.auditTrail')}
            </h4>
            <div className="space-y-2 text-xs">
              {order.auditLog
                .filter((a) => a.action.includes('緊急') || a.action.includes('Rescue') || a.action.includes('Emergency'))
                .map((log) => (
                  <div key={log.id} className="border-l-2 border-rose-500 pl-2.5 py-0.5">
                    <p className="font-semibold text-white">{log.action}</p>
                    {log.detail && <p className="text-slate-400">{log.detail}</p>}
                    <p className="text-[10px] text-slate-500">{new Date(log.at).toLocaleTimeString()}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
