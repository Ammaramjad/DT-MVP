import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createAccessLogEntry, saveStoredAccessLogs, loadStoredAccessLogs } from './geoTracker'
import type { AccessAuthMethod, AccessAttemptStatus } from '../types'

const AUTH_STORAGE_KEY = 'fleet_preview_auth_token'
export const MASTER_PASSCODES = ['8888', 'FLEET2026', 'fleet2026', '8899']
export const LINE_DEMO_OTP = '8899'

interface GatekeeperContextType {
  isLocked: boolean
  lock: () => void
  unlockWithPasscode: (passcode: string) => boolean
  unlockWithLineOtp: (otp: string, identifier?: string) => boolean
  unlockDemoOneClick: () => void
  logAccessAttempt: (method: AccessAuthMethod, status: AccessAttemptStatus, identifier?: string) => void
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

  const logAccessAttempt = (method: AccessAuthMethod, status: AccessAttemptStatus, identifier?: string) => {
    createAccessLogEntry(method, status, identifier).then((entry) => {
      const current = loadStoredAccessLogs()
      const updated = [entry, ...current.filter((c) => c.id !== entry.id)].slice(0, 500)
      saveStoredAccessLogs(updated)
    })
  }

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
      logAccessAttempt('PASSCODE', 'SUCCESS', trimmed)
      unlock(`token_passcode_${trimmed}_${Date.now()}`)
      return true
    }
    logAccessAttempt('PASSCODE', 'FAILED_INVALID_PASSCODE', code ? '••••' : '')
    return false
  }

  const unlockWithLineOtp = (otp: string, identifier: string = 'line_user') => {
    const trimmed = otp.trim()
    if (trimmed === LINE_DEMO_OTP || trimmed === '8888') {
      logAccessAttempt('LINE_2FA', 'SUCCESS', identifier)
      unlock(`token_line2fa_${Date.now()}`)
      return true
    }
    logAccessAttempt('LINE_2FA', 'FAILED_INVALID_OTP', identifier)
    return false
  }

  const unlockDemoOneClick = () => {
    logAccessAttempt('DEMO_1CLICK', 'SUCCESS', '1-click-demo')
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
        logAccessAttempt,
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
