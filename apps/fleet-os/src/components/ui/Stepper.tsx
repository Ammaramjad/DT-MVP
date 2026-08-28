import { Minus, Plus } from 'lucide-react'

export function Stepper({
  label,
  value,
  min = 0,
  max = 20,
  onChange,
  light = false,
  testId,
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
  light?: boolean
  testId?: string
}) {
  return (
    <div>
      <label className={`mb-1.5 block text-xs font-medium ${light ? 'text-slate-600' : 'text-slate-400'}`}>{label}</label>
      <div className={`flex items-center justify-between rounded-xl ${light ? 'bg-slate-100' : 'bg-white/5'} p-1`} data-testid={testId}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          data-testid={testId ? `${testId}-minus` : undefined}
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${light ? 'bg-white text-slate-700 hover:bg-slate-50' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className={`text-sm font-semibold ${light ? 'text-slate-800' : 'text-white'}`} data-testid={testId ? `${testId}-value` : undefined}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          data-testid={testId ? `${testId}-plus` : undefined}
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${light ? 'bg-white text-slate-700 hover:bg-slate-50' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
