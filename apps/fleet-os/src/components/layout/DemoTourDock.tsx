import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
} from 'lucide-react'
import { DEMO_TOUR_STEPS, useDemoTourStore } from '../../lib/demoTour'
import { useLang } from '../../i18n'
import { useFleetStore } from '../../store/useFleetStore'
import clsx from 'clsx'

export function DemoTourDock() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    isActive,
    currentStepIndex,
    isAutoPlaying,
    autoPlayIntervalSec,
    exitTour,
    nextStep,
    prevStep,
    goToStep,
    toggleAutoPlay,
  } = useDemoTourStore()

  const orders = useFleetStore((s) => s.orders)
  const reportDriverEmergency = useFleetStore((s) => s.reportDriverEmergency)
  const setFocusOrder = useFleetStore((s) => s.setFocusOrder)

  const currentStep = DEMO_TOUR_STEPS[currentStepIndex]

  // Synchronize route navigation when step changes
  useEffect(() => {
    if (!isActive || !currentStep) return

    // Execute relevant demo side effects for specific steps to create an authentic live presentation
    if (currentStep.id === 'STEP_1_BOOKING') {
      if (location.pathname !== '/booking') {
        navigate('/booking')
      }
    } else if (currentStep.id === 'STEP_2_DISPATCH') {
      if (!location.pathname.startsWith('/fleet-os') && location.pathname !== '/control') {
        navigate('/fleet-os')
      }
    } else if (currentStep.id === 'STEP_3_DRIVER') {
      if (location.pathname !== '/driver') {
        navigate('/driver')
      }
    } else if (currentStep.id === 'STEP_4_CUSTOMER') {
      if (location.pathname !== '/customer') {
        navigate('/customer')
      }
    } else if (currentStep.id === 'STEP_5_EMERGENCY') {
      if (location.pathname !== '/fleet-os') {
        navigate('/fleet-os')
      }
      // Ensure there's an active incident if none exists so emergency rescue drawer opens
      const activeIncident = orders.find((o) => o.incidentDetails)
      if (!activeIncident) {
        const targetOrder = orders.find((o) => o.status === 'DRIVER_EN_ROUTE' || o.status === 'ARRIVED' || o.status === 'PASSENGER_ONBOARD') || orders[0]
        if (targetOrder) {
          reportDriverEmergency(targetOrder.id, 'ACCIDENT', {
            note: 'Demo presentation: Minor tire burst / vehicle breakdown on Freeway 1 southbound near Taoyuan Interchange.',
            passengerSafe: true,
            needsAmbulance: false,
            vehicleTowed: true,
          })
          setFocusOrder(targetOrder.id)
        }
      }
    } else if (currentStep.id === 'STEP_6_SECURITY') {
      if (location.pathname !== '/fleet-os/access-logs') {
        navigate('/fleet-os/access-logs')
      }
    }
  }, [isActive, currentStepIndex, currentStep, location.pathname, navigate, orders, reportDriverEmergency, setFocusOrder])

  // Auto-play timer loop
  useEffect(() => {
    if (!isActive || !isAutoPlaying) return

    const timer = setInterval(() => {
      nextStep()
    }, autoPlayIntervalSec * 1000)

    return () => clearInterval(timer)
  }, [isActive, isAutoPlaying, autoPlayIntervalSec, nextStep])

  if (!isActive || !currentStep) return null

  const progressPct = ((currentStepIndex + 1) / DEMO_TOUR_STEPS.length) * 100

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed bottom-4 left-1/2 z-[1500] w-[95%] max-w-2xl -translate-x-1/2 overflow-hidden rounded-3xl border border-cyan-400/40 bg-slate-950/95 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-2xl text-white"
        data-testid="demo-tour-dock"
      >
        {/* Animated Neon Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Header Bar */}
        <div className="mt-1 flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-md shadow-cyan-500/30">
              <Compass className="h-4 w-4 animate-spin-slow" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                {lang === 'zh' ? '客戶展示導覽模式' : 'Interactive Client Demo Tour'}
              </span>
              <span className="ml-2 rounded-full bg-cyan-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 border border-cyan-400/30">
                STEP {currentStep.stepNumber} / {DEMO_TOUR_STEPS.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleAutoPlay}
              data-testid="demo-tour-autoplay-btn"
              className={clsx(
                'flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition shadow-sm',
                isAutoPlaying
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10',
              )}
            >
              {isAutoPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>{lang === 'zh' ? '暫停自動播 (10s)' : 'Pause (10s)'}</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{lang === 'zh' ? '自動播放' : 'Auto-Play'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={exitTour}
              data-testid="demo-tour-exit-btn"
              className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              title={lang === 'zh' ? '退出導覽' : 'Exit Tour'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Step Content */}
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] font-bold text-cyan-300 border border-cyan-400/40">
                  {currentStep.stepNumber}
                </span>
                {t(currentStep.titleKey)}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{t(currentStep.descKey)}</p>
            </div>
            <span className="shrink-0 rounded-xl bg-purple-500/15 border border-purple-400/30 px-2.5 py-1 text-[11px] font-bold text-purple-300 shadow-sm">
              {t(currentStep.badgeKey)}
            </span>
          </div>

          <div className="rounded-xl bg-cyan-950/30 border border-cyan-500/20 p-2 text-[11px] text-cyan-200 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
            <span>
              <strong>{lang === 'zh' ? '演示亮點: ' : 'Demo Tip: '}</strong>
              {t(currentStep.tipsKey)}
            </span>
          </div>
        </div>

        {/* Step Navigation Dots & Action Buttons */}
        <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-2.5">
          <div className="flex items-center gap-1.5" data-testid="demo-tour-step-indicators">
            {DEMO_TOUR_STEPS.map((step, idx) => {
              const isCurrent = idx === currentStepIndex
              const isPast = idx < currentStepIndex
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(idx)}
                  data-testid={`demo-tour-step-dot-${idx + 1}`}
                  className={clsx(
                    'h-2.5 rounded-full transition-all duration-300',
                    isCurrent
                      ? 'w-7 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                      : isPast
                        ? 'w-2.5 bg-cyan-600/60 hover:bg-cyan-500'
                        : 'w-2.5 bg-slate-700 hover:bg-slate-600',
                  )}
                  title={`Step ${idx + 1}: ${t(step.titleKey)}`}
                />
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={prevStep}
              data-testid="demo-tour-prev-btn"
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>{lang === 'zh' ? '上一步' : 'Prev'}</span>
            </button>

            <button
              type="button"
              onClick={nextStep}
              data-testid="demo-tour-next-btn"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/30 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{currentStepIndex === DEMO_TOUR_STEPS.length - 1 ? (lang === 'zh' ? '重頭開始' : 'Restart Tour') : (lang === 'zh' ? '下一步' : 'Next Step')}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
