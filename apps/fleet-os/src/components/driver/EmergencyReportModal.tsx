import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Ambulance, Car, HeartPulse, ShieldAlert, Truck, X } from 'lucide-react'
import type { IncidentType } from '../../types'
import { Button } from '../ui/Button'
import { useLang } from '../../i18n'

interface EmergencyReportModalProps {
  orderNo: string
  onClose: () => void
  onSubmit: (data: {
    incidentType: IncidentType
    note: string
    passengerSafe: boolean
    needsAmbulance: boolean
    vehicleTowed: boolean
  }) => void
}

const INCIDENT_TYPES: { type: IncidentType; labelKey: string; icon: typeof AlertTriangle }[] = [
  { type: 'ACCIDENT', labelKey: 'driver.emergency.typeAccident', icon: Car },
  { type: 'BREAKDOWN', labelKey: 'driver.emergency.typeBreakdown', icon: Truck },
  { type: 'MEDICAL_EMERGENCY', labelKey: 'driver.emergency.typeMedical', icon: HeartPulse },
  { type: 'ROAD_BLOCK', labelKey: 'driver.emergency.typeRoadBlock', icon: AlertTriangle },
]

export function EmergencyReportModal({ orderNo, onClose, onSubmit }: EmergencyReportModalProps) {
  const { t } = useLang()
  const [selectedType, setSelectedType] = useState<IncidentType>('ACCIDENT')
  const [passengerSafe, setPassengerSafe] = useState(true)
  const [needsAmbulance, setNeedsAmbulance] = useState(false)
  const [vehicleTowed, setVehicleTowed] = useState(true)
  const [note, setNote] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1400] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
      data-testid="emergency-report-modal"
    >
      <motion.div
        initial={{ y: '100%', scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border-t border-rose-500/40 bg-slate-900 shadow-2xl sm:rounded-[28px] sm:border"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-500/20 bg-rose-500/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">{t('driver.emergency.modalTitle')}</h2>
              <p className="text-xs text-rose-300/80">{t('driver.emergency.modalSubtitle', { orderNo })}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="emergency-modal-close"
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-sm text-slate-200">
          {/* Incident Type Grid */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('driver.emergency.selectType')}
            </label>
            <div className="grid grid-cols-2 gap-2.5" data-testid="emergency-incident-type-group">
              {INCIDENT_TYPES.map(({ type, labelKey, icon: Icon }) => {
                const isSelected = selectedType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    data-testid={`emergency-type-${type.toLowerCase()}`}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/20 text-white shadow-lg shadow-rose-500/20 ring-1 ring-rose-500'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-rose-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold">{t(labelKey)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Passenger Safety Toggle */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('driver.emergency.passengerSafety')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPassengerSafe(true)
                  setNeedsAmbulance(false)
                }}
                data-testid="emergency-passenger-safe-btn"
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                  passengerSafe
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                {t('driver.emergency.passengerSafe')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPassengerSafe(false)
                  setNeedsAmbulance(true)
                }}
                data-testid="emergency-passenger-injured-btn"
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                  !passengerSafe
                    ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/50'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                {t('driver.emergency.passengerInjured')}
              </button>
            </div>
          </div>

          {/* Checklist Toggles */}
          <div className="space-y-2">
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Ambulance className="h-4 w-4 text-rose-400" />
                <span className="text-xs font-medium">{t('driver.emergency.callAmbulance')} (119)</span>
              </div>
              <input
                type="checkbox"
                checked={needsAmbulance}
                onChange={(e) => setNeedsAmbulance(e.target.checked)}
                data-testid="emergency-needs-ambulance-checkbox"
                className="h-4 w-4 rounded accent-rose-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium">{t('driver.emergency.requestTow')}</span>
              </div>
              <input
                type="checkbox"
                checked={vehicleTowed}
                onChange={(e) => setVehicleTowed(e.target.checked)}
                data-testid="emergency-vehicle-towed-checkbox"
                className="h-4 w-4 rounded accent-rose-500"
              />
            </label>
          </div>

          {/* Incident Note */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('driver.emergency.situationNotes')}
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="emergency-note-input"
              placeholder={t('driver.emergency.situationPlaceholder')}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-400/60 focus:ring-1 focus:ring-rose-400/40"
            />
          </div>

          {/* Warning Banner */}
          <div className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{t('driver.emergency.modalNotice')}</span>
            </p>
          </div>
        </div>

        {/* Action Footer */}
        <div className="border-t border-white/10 bg-slate-900/90 p-4">
          <Button
            fullWidth
            size="lg"
            variant="danger"
            onClick={() =>
              onSubmit({
                incidentType: selectedType,
                note: note.trim(),
                passengerSafe,
                needsAmbulance,
                vehicleTowed,
              })
            }
            data-testid="emergency-submit-btn"
          >
            <ShieldAlert className="h-4 w-4" /> {t('driver.emergency.submitAndRequestRescue')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
