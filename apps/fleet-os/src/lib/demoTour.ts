import { create } from 'zustand'
import type { DemoTourStep } from '../types'

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    id: 'STEP_1_BOOKING',
    stepNumber: 1,
    titleKey: 'demoTour.step1.title',
    descKey: 'demoTour.step1.desc',
    route: '/booking',
    badgeKey: 'demoTour.step1.badge',
    tipsKey: 'demoTour.step1.tips',
  },
  {
    id: 'STEP_2_DISPATCH',
    stepNumber: 2,
    titleKey: 'demoTour.step2.title',
    descKey: 'demoTour.step2.desc',
    route: '/fleet-os',
    badgeKey: 'demoTour.step2.badge',
    tipsKey: 'demoTour.step2.tips',
  },
  {
    id: 'STEP_3_DRIVER',
    stepNumber: 3,
    titleKey: 'demoTour.step3.title',
    descKey: 'demoTour.step3.desc',
    route: '/driver',
    badgeKey: 'demoTour.step3.badge',
    tipsKey: 'demoTour.step3.tips',
  },
  {
    id: 'STEP_4_CUSTOMER',
    stepNumber: 4,
    titleKey: 'demoTour.step4.title',
    descKey: 'demoTour.step4.desc',
    route: '/customer',
    badgeKey: 'demoTour.step4.badge',
    tipsKey: 'demoTour.step4.tips',
  },
  {
    id: 'STEP_5_EMERGENCY',
    stepNumber: 5,
    titleKey: 'demoTour.step5.title',
    descKey: 'demoTour.step5.desc',
    route: '/fleet-os',
    badgeKey: 'demoTour.step5.badge',
    tipsKey: 'demoTour.step5.tips',
  },
  {
    id: 'STEP_6_SECURITY',
    stepNumber: 6,
    titleKey: 'demoTour.step6.title',
    descKey: 'demoTour.step6.desc',
    route: '/fleet-os/access-logs',
    badgeKey: 'demoTour.step6.badge',
    tipsKey: 'demoTour.step6.tips',
  },
]

interface DemoTourState {
  isActive: boolean
  currentStepIndex: number
  isAutoPlaying: boolean
  autoPlayIntervalSec: number
  startTour: (stepIndex?: number) => void
  exitTour: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  toggleAutoPlay: () => void
  setAutoPlay: (v: boolean) => void
}

export const useDemoTourStore = create<DemoTourState>((set, get) => ({
  isActive: false,
  currentStepIndex: 0,
  isAutoPlaying: false,
  autoPlayIntervalSec: 10,

  startTour: (stepIndex = 0) =>
    set({
      isActive: true,
      currentStepIndex: Math.max(0, Math.min(stepIndex, DEMO_TOUR_STEPS.length - 1)),
      isAutoPlaying: false,
    }),

  exitTour: () => set({ isActive: false, isAutoPlaying: false }),

  nextStep: () => {
    const { currentStepIndex } = get()
    if (currentStepIndex < DEMO_TOUR_STEPS.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 })
    } else {
      // Loop or stop
      set({ currentStepIndex: 0 })
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get()
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 })
    }
  },

  goToStep: (index: number) => {
    if (index >= 0 && index < DEMO_TOUR_STEPS.length) {
      set({ currentStepIndex: index })
    }
  },

  toggleAutoPlay: () => set((state) => ({ isAutoPlaying: !state.isAutoPlaying })),

  setAutoPlay: (v: boolean) => set({ isAutoPlaying: v }),
}))
