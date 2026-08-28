import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Car,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { VEHICLE_CATEGORY_CATALOG } from '../../data/vehicleCatalog'
import { REGIONS } from '../../data/locations'
import type { DriverTier, TaiwanRegion, VehicleCategory } from '../../types'
import { useLang } from '../../i18n'

const DRIVER_TIERS: { tier: DriverTier; labelKey: string }[] = [
  { tier: 'OWNED_FLEET', labelKey: 'tier.OWNED_FLEET' },
  { tier: 'PAID_MEMBER', labelKey: 'tier.PAID_MEMBER' },
  { tier: 'OUTSIDE_CONTRACTOR', labelKey: 'tier.OUTSIDE_CONTRACTOR' },
]

const EMOJI_AVATARS = ['👨🏻‍✈️', '👩🏻‍✈️', '🧑🏽‍✈️', '👨🏼‍✈️', '👩🏽‍✈️', '🧑🏻‍✈️', '😎', '🚘']

export function AddDriverModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, lang } = useLang()
  const addNewDriver = useFleetStore((s) => s.addNewDriver)

  const [name, setName] = useState('')
  const [nameZh, setNameZh] = useState('')
  const [phone, setPhone] = useState('0988-')
  const [avatarEmoji, setAvatarEmoji] = useState('👨🏻‍✈️')
  const [tier, setTier] = useState<DriverTier>('OWNED_FLEET')
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>('COMFORT_SEDAN')
  const [vehiclePlate, setVehiclePlate] = useState('RAC-')
  const [serviceRegion, setServiceRegion] = useState<TaiwanRegion>('TAIPEI')
  const [licenseNumber, setLicenseNumber] = useState('TPE-DL-')
  const [insuranceNumber, setInsuranceNumber] = useState('INS-9921-')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successResult, setSuccessResult] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !vehiclePlate.trim()) return

    setIsSubmitting(true)
    const newDriver = addNewDriver({
      name: name.trim(),
      nameZh: nameZh.trim() || name.trim(),
      phone: phone.trim(),
      avatarEmoji,
      tier,
      vehicleCategory,
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      serviceRegion,
      licenseNumber: licenseNumber.trim(),
      insuranceNumber: insuranceNumber.trim(),
    })

    setIsSubmitting(false)
    setSuccessResult(newDriver.nameZh)
    setTimeout(() => {
      setSuccessResult(null)
      onClose()
    }, 1400)
  }

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl" data-testid="add-driver-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg rounded-3xl border border-cyan-400/30 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl text-white max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
              <UserPlus className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">{t('fleetos.roster.addDriverTitle')}</h2>
              <p className="text-[11px] text-slate-400">{t('fleetos.roster.addDriverSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-add-driver-modal"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {successResult ? (
          <div className="py-12 text-center space-y-3" data-testid="add-driver-success-message">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">{t('fleetos.roster.driverAddedSuccess', { name: successResult })}</h3>
            <p className="text-xs text-slate-400">{t('fleetos.roster.driverOnboardedReady')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar & Basic Info */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                {t('fleetos.roster.avatarSelect')}
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {EMOJI_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatarEmoji(emoji)}
                    className={`h-10 w-10 shrink-0 text-xl rounded-2xl flex items-center justify-center transition ${
                      avatarEmoji === emoji
                        ? 'bg-cyan-500/25 border-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)] scale-105'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">{t('fleetos.roster.driverNameZh')}</label>
                <input
                  type="text"
                  required
                  value={nameZh}
                  onChange={(e) => setNameZh(e.target.value)}
                  placeholder="例如: 陳志豪"
                  data-testid="add-driver-namezh-input"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">{t('fleetos.roster.driverNameEn')}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Zhi-Hao Chen"
                  data-testid="add-driver-name-input"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">{t('fleetos.roster.phone')}</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912-345-678"
                  data-testid="add-driver-phone-input"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">{t('fleetos.roster.tier')}</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as DriverTier)}
                  data-testid="add-driver-tier-select"
                  className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  {DRIVER_TIERS.map((dt) => (
                    <option key={dt.tier} value={dt.tier}>
                      {t(dt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vehicle Assignment */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 space-y-3">
              <p className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" /> {t('fleetos.roster.assignedVehicleSection')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">{t('fleetos.roster.vehicleCategory')}</label>
                  <select
                    value={vehicleCategory}
                    onChange={(e) => setVehicleCategory(e.target.value as VehicleCategory)}
                    data-testid="add-driver-category-select"
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    {Object.values(VEHICLE_CATEGORY_CATALOG).map((vc) => (
                      <option key={vc.category} value={vc.category}>
                        {vc.nameZh} ({vc.brand} {vc.model} · {vc.maxPassengers}pax)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">{t('fleetos.roster.licensePlate')}</label>
                  <input
                    type="text"
                    required
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="ABC-1234"
                    data-testid="add-driver-plate-input"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">{t('fleetos.roster.serviceRegion')}</label>
                <select
                  value={serviceRegion}
                  onChange={(e) => setServiceRegion(e.target.value as TaiwanRegion)}
                  data-testid="add-driver-region-select"
                  className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r.key} value={r.key}>
                      {lang === 'zh' ? r.labelZh : r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* License & Insurance Upload Verification Mock */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 space-y-3">
              <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> {t('fleetos.roster.complianceDocSection')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">{t('fleetos.roster.driverLicenseNo')}</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="TPE-DL-88219"
                    data-testid="add-driver-license-input"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">{t('fleetos.roster.insurancePolicyNo')}</label>
                  <input
                    type="text"
                    value={insuranceNumber}
                    onChange={(e) => setInsuranceNumber(e.target.value)}
                    placeholder="INS-9921-X"
                    data-testid="add-driver-insurance-input"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2 text-[11px] text-emerald-300 border border-emerald-500/20">
                <FileCheck className="h-4 w-4 shrink-0" />
                <span>{t('fleetos.roster.autoOcrVerified')}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="submit-add-driver-btn"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t('fleetos.roster.saveDriverBtn')}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
