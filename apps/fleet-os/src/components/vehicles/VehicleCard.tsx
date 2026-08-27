import clsx from 'clsx'
import { Users } from 'lucide-react'
import type { VehicleType } from '../../types'
import { VEHICLE_CATALOG } from '../../data/vehicleCatalog'
import { useLang } from '../../i18n'

interface VehicleCardProps {
  type: VehicleType
  selected?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  plate?: string
  className?: string
  light?: boolean
}

// Every catalog photo is a 3:2 studio shot (see src/assets/vehicles/*.jpg). The
// container must share that exact aspect ratio so `object-cover` never has to
// crop into the roof or lower body to fill a mismatched box — previously these
// used a fixed height regardless of card width, which cropped the car badly
// on any card wider than 1.5x its height.
const SIZE_PHOTO: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'aspect-[3/2]',
  md: 'aspect-[3/2]',
  lg: 'aspect-[3/2]',
}

export function VehicleCard({ type, selected = false, onClick, size = 'md', plate, className, light = false }: VehicleCardProps) {
  const { t } = useLang()
  const entry = VEHICLE_CATALOG[type]
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      data-testid={`vehicle-card-${type}`}
      className={clsx(
        'flex flex-col overflow-hidden rounded-xl border text-left transition',
        light
          ? selected
            ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100'
            : 'border-slate-200 bg-white hover:bg-slate-50'
          : selected
            ? 'border-cyan-400/60 bg-cyan-400/[0.08] ring-2 ring-cyan-400/20'
            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
        className,
      )}
    >
      <div className={clsx('flex items-center justify-center overflow-hidden bg-white', SIZE_PHOTO[size])}>
        <img src={entry.photo} alt={`${entry.brand} ${entry.model}`} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="p-2.5">
        <div className="flex items-center justify-between gap-1">
          <span className={clsx('text-[11px] font-bold uppercase tracking-wide', light ? 'text-slate-800' : 'text-slate-100')}>
            {t(`vehicle.type.${type}`)}
          </span>
          {plate && <span className={clsx('font-mono text-[10px]', light ? 'text-slate-400' : 'text-slate-500')}>{plate}</span>}
        </div>
        <p className={clsx('mt-0.5 truncate text-[11px]', light ? 'text-slate-500' : 'text-slate-400')}>
          {entry.brand} {entry.model}
        </p>
        <p className={clsx('mt-1 flex items-center gap-1 text-[10.5px]', light ? 'text-slate-400' : 'text-slate-500')}>
          <Users className="h-3 w-3" /> {t('vehicle.seats', { n: entry.seatingMax })}
        </p>
      </div>
    </Tag>
  )
}
