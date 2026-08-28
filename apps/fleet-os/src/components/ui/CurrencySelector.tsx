import { useState } from 'react'
import { Coins, ChevronDown, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ALL_CURRENCIES, CURRENCIES, useCurrencyStore } from '../../lib/currency'
import { useLang } from '../../i18n'
import type { CurrencyCode } from '../../types'
import clsx from 'clsx'

interface CurrencySelectorProps {
  compact?: boolean
  className?: string
  testId?: string
}

export function CurrencySelector({ compact = false, className, testId = 'currency-selector' }: CurrencySelectorProps) {
  const { lang } = useLang()
  const { currency, setCurrency } = useCurrencyStore()
  const [open, setOpen] = useState(false)
  const currentConfig = CURRENCIES[currency]

  return (
    <div className={clsx('relative inline-block text-left', className)} data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid={`${testId}-btn`}
        className={clsx(
          'flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/80 px-2.5 py-1.5 font-semibold text-slate-200 shadow-md backdrop-blur-md transition hover:border-cyan-400/40 hover:bg-slate-850',
          compact ? 'text-[11px]' : 'text-xs',
        )}
      >
        <Coins className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-bold text-amber-300">{currentConfig.code}</span>
        <span className="text-slate-400">({currentConfig.symbol})</span>
        <ChevronDown className="h-3 w-3 text-slate-400 transition-transform duration-200" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl"
              data-testid={`${testId}-menu`}
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10 mb-1">
                {lang === 'zh' ? '選擇結算幣別 · 即時匯率' : 'Select Currency · Live Rate'}
              </div>
              <div className="space-y-0.5">
                {ALL_CURRENCIES.map((code) => {
                  const cfg = CURRENCIES[code]
                  const isSelected = currency === code
                  return (
                    <button
                      key={code}
                      type="button"
                      data-testid={`currency-option-${code}`}
                      onClick={() => {
                        setCurrency(code as CurrencyCode)
                        setOpen(false)
                      }}
                      className={clsx(
                        'flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition',
                        isSelected
                          ? 'bg-amber-400/15 text-amber-200 font-bold border border-amber-400/30'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">{cfg.code}</span>
                        <span className="text-slate-400 text-[11px]">{lang === 'zh' ? cfg.nameZh : cfg.name}</span>
                      </div>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-amber-400" />
                      ) : (
                        <span className="font-mono text-[10px] text-slate-500">{cfg.symbol}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
