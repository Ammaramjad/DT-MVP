import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const AUTH_STORAGE_KEY = 'fleet_preview_auth_token'
export const MASTER_PASSCODES = ['8888', 'FLEET2026', 'fleet2026', '8899']
export const LINE_DEMO_OTP = '8899'

interface GatekeeperContextType {
  isLocked: boolean
  lock: () => void
  unlockWithPasscode: (passcode: string) => boolean
  unlockWithLineOtp: (otp: string) => boolean
  unlockDemoOneClick: () => void
}

const GatekeeperContext = createContext<GatekeeperContextType | null>(null)

export function GatekeeperProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false
      const token = localStorage.getItem(AUTH_STORAGE_KEY)
      return !token
    } catch {
      return false
    }
  })

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY) {
        setIsLocked(!e.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const unlock = (tokenValue: string = 'token_preview_granted_' + Date.now()) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, tokenValue)
    } catch {
      // ignore
    }
    setIsLocked(false)
  }

  const lock = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // ignore
    }
    setIsLocked(true)
  }

  const unlockWithPasscode = (code: string) => {
    const trimmed = code.trim().toUpperCase()
    if (MASTER_PASSCODES.map((c) => c.toUpperCase()).includes(trimmed)) {
      unlock(`token_passcode_${trimmed}_${Date.now()}`)
      return true
    }
    return false
  }

  const unlockWithLineOtp = (otp: string) => {
    const trimmed = otp.trim()
    if (trimmed === LINE_DEMO_OTP || trimmed === '8888') {
      unlock(`token_line2fa_${Date.now()}`)
      return true
    }
    return false
  }

  const unlockDemoOneClick = () => {
    unlock(`token_demo_1click_${Date.now()}`)
  }

  return (
    <GatekeeperContext.Provider
      value={{
        isLocked,
        lock,
        unlockWithPasscode,
        unlockWithLineOtp,
        unlockDemoOneClick,
      }}
    >
      {children}
    </GatekeeperContext.Provider>
  )
}

export function useGatekeeper() {
  const ctx = useContext(GatekeeperContext)
  if (!ctx) {
    throw new Error('useGatekeeper must be used within a GatekeeperProvider')
  }
  return ctx
}
