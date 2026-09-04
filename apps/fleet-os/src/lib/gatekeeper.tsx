import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createAccessLogEntry, saveStoredAccessLogs, loadStoredAccessLogs } from './geoTracker'
import type { AccessAuthMethod, AccessAttemptStatus, GuestPass, LoggedInUser } from '../types'

export const AUTH_STORAGE_KEY = 'fleet_preview_auth_token'
export const USER_STORAGE_KEY = 'fleet_current_user'
export const GUEST_PASSES_STORAGE_KEY = 'fleet_guest_passes'
export const USED_TOKENS_STORAGE_KEY = 'used_one_time_tokens'
export const SESSION_START_KEY = 'fleet_session_start'

export const MASTER_PASSCODES = ['8888', 'FLEET2026', 'fleet2026', '8899']
export const LINE_DEMO_OTP = '8899'
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours standard session

// Permanent Enterprise Accounts
export const PERMANENT_ACCOUNTS = [
  {
    username: 'admin',
    password: 'FleetAdmin2026!',
    role: 'admin' as const,
    roleTitleEn: 'System Admin',
    roleTitleZh: '系統管理員',
    displayName: 'admin',
  },
  {
    username: 'dispatcher',
    password: 'TaiwanDispatch2026!',
    role: 'dispatcher' as const,
    roleTitleEn: 'Chief Dispatcher',
    roleTitleZh: '首席調度員',
    displayName: 'dispatcher',
  },
]

// Initial seed guest passes
const INITIAL_GUEST_PASSES: GuestPass[] = [
  {
    id: 'pass_init_demo',
    username: 'guest_demo',
    passcode: 'ONE-TIME-2026',
    createdAt: Date.now() - 3600000 * 2,
    status: 'ACTIVE',
    ip: '210.61.47.102 (Taipei)',
    notes: 'Default single-use VIP demo pass',
  },
  {
    id: 'pass_vip_9821',
    username: 'guest_vip_9821',
    passcode: 'PASS-8842',
    createdAt: Date.now() - 3600000 * 5,
    status: 'ACTIVE',
    ip: '114.34.120.45 (New Taipei)',
    notes: 'Enterprise VIP guest pass',
  },
  {
    id: 'pass_vip_1002',
    username: 'guest_vip_1002',
    passcode: 'PASS-1002',
    createdAt: Date.now() - 3600000 * 24,
    status: 'BURNED',
    burnedAt: Date.now() - 3600000 * 22,
    burnedReason: 'Session ended (Burn-After-Reading)',
    ip: '140.112.25.10 (Taipei)',
    notes: 'Previous partner review pass',
  },
]

const INITIAL_BURNED_TOKENS = ['guest_vip_1002', 'pass-1002', 'PASS-1002']

export function loadStoredGuestPasses(): GuestPass[] {
  if (typeof window === 'undefined') return INITIAL_GUEST_PASSES
  try {
    const raw = localStorage.getItem(GUEST_PASSES_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(GUEST_PASSES_STORAGE_KEY, JSON.stringify(INITIAL_GUEST_PASSES))
      return INITIAL_GUEST_PASSES
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_GUEST_PASSES
  } catch {
    return INITIAL_GUEST_PASSES
  }
}

export function saveStoredGuestPasses(passes: GuestPass[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(GUEST_PASSES_STORAGE_KEY, JSON.stringify(passes))
  } catch {
    // ignore
  }
}

export function loadStoredBurnedTokens(): string[] {
  if (typeof window === 'undefined') return INITIAL_BURNED_TOKENS
  try {
    const raw = localStorage.getItem(USED_TOKENS_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(USED_TOKENS_STORAGE_KEY, JSON.stringify(INITIAL_BURNED_TOKENS))
      return INITIAL_BURNED_TOKENS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : INITIAL_BURNED_TOKENS
  } catch {
    return INITIAL_BURNED_TOKENS
  }
}

export function saveStoredBurnedTokens(tokens: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USED_TOKENS_STORAGE_KEY, JSON.stringify(tokens))
  } catch {
    // ignore
  }
}

export function loadStoredCurrentUser(): LoggedInUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as LoggedInUser
    }
    const token = localStorage.getItem(AUTH_STORAGE_KEY)
    if (token) {
      // Fallback synthesizer if only token existed
      return {
        username: 'admin',
        role: 'admin',
        roleTitleEn: 'System Admin',
        roleTitleZh: '系統管理員',
        displayName: 'admin',
        authMethod: 'STAFF_PERMANENT',
        loginAt: Date.now(),
        tokenValue: token,
      }
    }
    return null
  } catch {
    return null
  }
}

export interface LoginResult {
  success: boolean
  isBurned?: boolean
  error?: string
}

export interface GatekeeperContextType {
  isLocked: boolean
  currentUser: LoggedInUser | null
  sessionRemainingMs: number
  lock: () => void
  logout: () => void
  login: (username: string, password: string) => LoginResult
  loginStaff: (username: string, password: string) => LoginResult
  loginGuestPass: (identifier: string, passcode?: string) => LoginResult
  unlockWithPasscode: (passcode: string) => boolean
  unlockWithLineOtp: (otp: string, identifier?: string) => boolean
  unlockDemoOneClick: () => void
  logAccessAttempt: (method: AccessAuthMethod, status: AccessAttemptStatus, identifier?: string) => void
  guestPasses: GuestPass[]
  generateGuestPass: (customUsername?: string, notes?: string) => GuestPass
  revokeGuestPass: (passIdOrToken: string, reason?: string) => void
  getBurnedTokens: () => string[]
  refreshPasses: () => void
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

  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(() => loadStoredCurrentUser())
  const [guestPasses, setGuestPasses] = useState<GuestPass[]>(() => loadStoredGuestPasses())
  const [sessionRemainingMs, setSessionRemainingMs] = useState<number>(SESSION_DURATION_MS)

  // Real-time countdown timer updater
  useEffect(() => {
    if (isLocked || !currentUser) {
      setSessionRemainingMs(SESSION_DURATION_MS)
      return
    }

    const updateCountdown = () => {
      const loginTime = currentUser.loginAt || Date.now()
      const elapsed = Date.now() - loginTime
      const remaining = Math.max(0, SESSION_DURATION_MS - elapsed)
      setSessionRemainingMs(remaining)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [isLocked, currentUser])

  // Cross-tab synchronization via storage events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY) {
        setIsLocked(!e.newValue)
      }
      if (e.key === USER_STORAGE_KEY) {
        setCurrentUser(loadStoredCurrentUser())
      }
      if (e.key === GUEST_PASSES_STORAGE_KEY) {
        setGuestPasses(loadStoredGuestPasses())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const logAccessAttempt = useCallback(
    (method: AccessAuthMethod, status: AccessAttemptStatus, identifier?: string) => {
      createAccessLogEntry(method, status, identifier).then((entry) => {
        const current = loadStoredAccessLogs()
        const updated = [entry, ...current.filter((c) => c.id !== entry.id)].slice(0, 500)
        saveStoredAccessLogs(updated)
      })
    },
    [],
  )

  const refreshPasses = useCallback(() => {
    setGuestPasses(loadStoredGuestPasses())
  }, [])

  const getBurnedTokens = useCallback((): string[] => {
    return loadStoredBurnedTokens()
  }, [])

  const unlock = (tokenValue: string, user: LoggedInUser) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, tokenValue)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      localStorage.setItem(SESSION_START_KEY, String(user.loginAt))
    } catch {
      // ignore
    }
    setCurrentUser(user)
    setIsLocked(false)
  }

  // Logout ends session and performs Burn-After-Reading if one-time pass was used
  const logout = useCallback(() => {
    const activeUser = currentUser || loadStoredCurrentUser()
    if (activeUser) {
      if (activeUser.authMethod === 'GUEST_ONE_TIME' || activeUser.guestPasscode || activeUser.guestPassId) {
        // Mark token as permanently BURNED / EXPIRED
        const burnedList = loadStoredBurnedTokens()
        const tokenIdentifiers = [
          activeUser.username,
          activeUser.guestPasscode,
          activeUser.guestPassId,
        ].filter(Boolean) as string[]

        const newBurnedList = Array.from(new Set([...burnedList, ...tokenIdentifiers]))
        saveStoredBurnedTokens(newBurnedList)

        // Update in guest passes list
        const currentPasses = loadStoredGuestPasses()
        const updatedPasses = currentPasses.map((p) => {
          if (
            (activeUser.guestPassId && p.id === activeUser.guestPassId) ||
            p.username.toLowerCase() === activeUser.username.toLowerCase() ||
            (activeUser.guestPasscode && p.passcode.toLowerCase() === activeUser.guestPasscode.toLowerCase())
          ) {
            return {
              ...p,
              status: 'BURNED' as const,
              burnedAt: Date.now(),
              burnedReason: 'Session logged out (Burn-After-Reading)',
            }
          }
          return p
        })
        saveStoredGuestPasses(updatedPasses)
        setGuestPasses(updatedPasses)
      }
    }

    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem(USER_STORAGE_KEY)
      localStorage.removeItem(SESSION_START_KEY)
    } catch {
      // ignore
    }
    setCurrentUser(null)
    setIsLocked(true)
  }, [currentUser])

  const lock = logout

  // 1. Enterprise Staff Login (Username & Password)
  const loginStaff = useCallback(
    (usernameInput: string, passwordInput: string): { success: boolean; error?: string } => {
      const u = usernameInput.trim()
      const p = passwordInput.trim()

      const account = PERMANENT_ACCOUNTS.find(
        (a) => a.username.toLowerCase() === u.toLowerCase() && a.password === p,
      )

      if (account) {
        const token = `token_staff_${account.username}_${Date.now()}`
        const user: LoggedInUser = {
          username: account.username,
          role: account.role,
          roleTitleEn: account.roleTitleEn,
          roleTitleZh: account.roleTitleZh,
          displayName: account.username,
          authMethod: 'STAFF_PERMANENT',
          loginAt: Date.now(),
          tokenValue: token,
        }
        logAccessAttempt('STAFF_PERMANENT', 'SUCCESS', account.username)
        unlock(token, user)
        return { success: true }
      }

      logAccessAttempt('STAFF_PERMANENT', 'FAILED_INVALID_CREDENTIALS', u || 'unknown_staff')
      return { success: false, error: '⚠️ Invalid username or password. Please verify and try again.' }
    },
    [logAccessAttempt],
  )

  // 2. Single-Use VIP Guest Pass Login (Burn-After-Reading)
  const loginGuestPass = useCallback(
    (
      identifierInput: string,
      passcodeInput?: string,
    ): { success: boolean; isBurned?: boolean; error?: string } => {
      const ident = identifierInput.trim()
      const code = passcodeInput ? passcodeInput.trim() : ''

      const burnedList = loadStoredBurnedTokens().map((t) => t.trim().toLowerCase())
      const passes = loadStoredGuestPasses()

      // Check if this credential was already burned / used
      const isIdentBurned = ident ? burnedList.includes(ident.toLowerCase()) : false
      const isCodeBurned = code ? burnedList.includes(code.toLowerCase()) : false

      // Check if vault pass is already marked BURNED
      const matchingPass = passes.find((p) => {
        if (ident && code) {
          return (
            (p.username.toLowerCase() === ident.toLowerCase() || p.id.toLowerCase() === ident.toLowerCase()) &&
            p.passcode.toLowerCase() === code.toLowerCase()
          )
        }
        if (code) {
          return p.passcode.toLowerCase() === code.toLowerCase()
        }
        if (ident) {
          return (
            p.username.toLowerCase() === ident.toLowerCase() ||
            p.passcode.toLowerCase() === ident.toLowerCase() ||
            p.id.toLowerCase() === ident.toLowerCase()
          )
        }
        return false
      })

      if (isIdentBurned || isCodeBurned || matchingPass?.status === 'BURNED') {
        logAccessAttempt('GUEST_ONE_TIME', 'FAILED_BURNED_TOKEN', ident || code)
        return {
          success: false,
          isBurned: true,
          error:
            '⚠️ This one-time access pass has already been used and expired. Please contact the administrator for a new pass.',
        }
      }

      // Check if default initial demo pass (guest_demo / ONE-TIME-2026) or matches active vault pass
      let validPass = matchingPass

      if (!validPass) {
        const isDefaultMatch =
          (ident.toLowerCase() === 'guest_demo' && (!code || code.toUpperCase() === 'ONE-TIME-2026')) ||
          (ident.toUpperCase() === 'ONE-TIME-2026' && !code) ||
          (!ident && code.toUpperCase() === 'ONE-TIME-2026')

        if (isDefaultMatch) {
          validPass = {
            id: 'pass_init_demo',
            username: 'guest_demo',
            passcode: 'ONE-TIME-2026',
            createdAt: Date.now() - 3600000,
            status: 'ACTIVE',
            ip: '210.61.47.102 (Taipei)',
            notes: 'Default single-use VIP demo pass',
          }
        }
      }

      // Check if matches master passcode
      const candidateCode = (code || ident).trim().toUpperCase()
      if (MASTER_PASSCODES.map((c) => c.toUpperCase()).includes(candidateCode)) {
        logAccessAttempt('PASSCODE', 'SUCCESS', candidateCode)
        const token = `token_passcode_${candidateCode}_${Date.now()}`
        const user: LoggedInUser = {
          username: `vip_${candidateCode.toLowerCase()}`,
          role: 'vip',
          roleTitleEn: 'VIP Passcode Access',
          roleTitleZh: 'VIP 通關密碼存取',
          displayName: `VIP-${candidateCode}`,
          authMethod: 'PASSCODE',
          loginAt: Date.now(),
          tokenValue: token,
        }
        unlock(token, user)
        return { success: true }
      }

      if (validPass && validPass.status !== 'BURNED') {
        // Mark pass as IN_USE in vault
        const updatedPasses = passes.map((p) =>
          p.id === validPass!.id
            ? { ...p, status: 'IN_USE' as const, usedAt: Date.now() }
            : p,
        )
        if (!passes.some((p) => p.id === validPass!.id)) {
          updatedPasses.unshift({ ...validPass, status: 'IN_USE', usedAt: Date.now() })
        }
        saveStoredGuestPasses(updatedPasses)
        setGuestPasses(updatedPasses)

        const token = `token_guest_${validPass.username}_${Date.now()}`
        const user: LoggedInUser = {
          username: validPass.username,
          role: 'guest',
          roleTitleEn: 'Single-Use VIP Guest Pass',
          roleTitleZh: '單次免洗貴賓通行證',
          displayName: validPass.username,
          authMethod: 'GUEST_ONE_TIME',
          loginAt: Date.now(),
          tokenValue: token,
          guestPassId: validPass.id,
          guestPasscode: validPass.passcode,
        }

        logAccessAttempt('GUEST_ONE_TIME', 'SUCCESS', validPass.username)
        unlock(token, user)
        return { success: true }
      }

      logAccessAttempt('GUEST_ONE_TIME', 'FAILED_INVALID_CREDENTIALS', ident || code)
      return {
        success: false,
        error: '⚠️ Invalid username or password. Please verify and try again.',
      }
    },
    [logAccessAttempt],
  )

  // Unified login: tries permanent staff first, then one-time guest pass
  const login = useCallback(
    (usernameInput: string, passwordInput: string): LoginResult => {
      const staffResult = loginStaff(usernameInput, passwordInput)
      if (staffResult.success) return staffResult
      const guestResult = loginGuestPass(usernameInput, passwordInput)
      if (guestResult.success) return guestResult
      if (guestResult.isBurned) return guestResult
      return { success: false, error: '⚠️ Invalid username or password. Please verify and try again.' }
    },
    [loginStaff, loginGuestPass],
  )

  // 3. LINE 2FA Push verification
  const unlockWithLineOtp = useCallback(
    (otp: string, identifier: string = 'line_vip_client') => {
      const trimmed = otp.trim()
      if (trimmed === LINE_DEMO_OTP || trimmed === '8888') {
        logAccessAttempt('LINE_2FA', 'SUCCESS', identifier)
        const token = `token_line2fa_${Date.now()}`
        const user: LoggedInUser = {
          username: identifier || 'line_vip_client',
          role: 'vip',
          roleTitleEn: 'LINE 2FA VIP',
          roleTitleZh: 'LINE 2FA 尊榮客戶',
          displayName: identifier || 'LINE VIP',
          authMethod: 'LINE_2FA',
          loginAt: Date.now(),
          tokenValue: token,
        }
        unlock(token, user)
        return true
      }
      logAccessAttempt('LINE_2FA', 'FAILED_INVALID_OTP', identifier)
      return false
    },
    [logAccessAttempt],
  )

  // Master Passcode Unlock
  const unlockWithPasscode = useCallback(
    (code: string) => {
      const trimmed = code.trim().toUpperCase()
      if (MASTER_PASSCODES.map((c) => c.toUpperCase()).includes(trimmed)) {
        logAccessAttempt('PASSCODE', 'SUCCESS', trimmed)
        const token = `token_passcode_${trimmed}_${Date.now()}`
        const user: LoggedInUser = {
          username: `vip_${trimmed.toLowerCase()}`,
          role: 'vip',
          roleTitleEn: 'VIP Passcode Access',
          roleTitleZh: 'VIP 通關密碼存取',
          displayName: `VIP-${trimmed}`,
          authMethod: 'PASSCODE',
          loginAt: Date.now(),
          tokenValue: token,
        }
        unlock(token, user)
        return true
      }
      logAccessAttempt('PASSCODE', 'FAILED_INVALID_PASSCODE', code ? '••••' : '')
      return false
    },
    [logAccessAttempt],
  )

  const unlockDemoOneClick = useCallback(() => {
    logAccessAttempt('DEMO_1CLICK', 'SUCCESS', '1-click-demo')
    const token = `token_demo_1click_${Date.now()}`
    const user: LoggedInUser = {
      username: 'admin',
      role: 'admin',
      roleTitleEn: 'System Admin',
      roleTitleZh: '系統管理員',
      displayName: 'admin',
      authMethod: 'STAFF_PERMANENT',
      loginAt: Date.now(),
      tokenValue: token,
    }
    unlock(token, user)
  }, [logAccessAttempt])

  // Admin Vault Operations: Generate New 1-Time Guest Pass (Super Admin only)
  const generateGuestPass = useCallback(
    (customUsername?: string, notes?: string): GuestPass => {
      const activeUser = currentUser || loadStoredCurrentUser()
      if (!activeUser || activeUser.role !== 'admin') {
        throw new Error('Only Super Admin can generate one-time guest passes')
      }

      const currentPasses = loadStoredGuestPasses()
      const randNum = Math.floor(1000 + Math.random() * 9000)
      const passNum = Math.floor(1000 + Math.random() * 9000)

      const username = customUsername || `guest_vip_${randNum}`
      const passcode = `PASS-${passNum}`

      const newPass: GuestPass = {
        id: `pass_${Date.now()}_${randNum}`,
        username,
        passcode,
        createdAt: Date.now(),
        status: 'ACTIVE',
        ip: '210.61.47.102 (Taipei)',
        notes: notes || 'Admin generated 1-time guest pass',
      }

      const updated = [newPass, ...currentPasses]
      saveStoredGuestPasses(updated)
      setGuestPasses(updated)
      return newPass
    },
    [currentUser],
  )

  // Admin Vault Operations: Revoke / Burn Token (Super Admin only)
  const revokeGuestPass = useCallback((passIdOrToken: string, reason?: string) => {
    const activeUser = currentUser || loadStoredCurrentUser()
    if (!activeUser || activeUser.role !== 'admin') {
      throw new Error('Only Super Admin can revoke one-time guest passes')
    }

    const currentPasses = loadStoredGuestPasses()
    let revokedUsername = ''
    let revokedPasscode = ''

    const updated = currentPasses.map((p) => {
      if (
        p.id === passIdOrToken ||
        p.username.toLowerCase() === passIdOrToken.toLowerCase() ||
        p.passcode.toLowerCase() === passIdOrToken.toLowerCase()
      ) {
        revokedUsername = p.username
        revokedPasscode = p.passcode
        return {
          ...p,
          status: 'BURNED' as const,
          burnedAt: Date.now(),
          burnedReason: reason || 'Manually revoked by administrator',
        }
      }
      return p
    })

    saveStoredGuestPasses(updated)
    setGuestPasses(updated)

    const burnedList = loadStoredBurnedTokens()
    const toBurn = [passIdOrToken, revokedUsername, revokedPasscode].filter(Boolean)
    const newBurned = Array.from(new Set([...burnedList, ...toBurn]))
    saveStoredBurnedTokens(newBurned)
  }, [currentUser])

  return (
    <GatekeeperContext.Provider
      value={{
        isLocked,
        currentUser,
        sessionRemainingMs,
        lock,
        logout,
        login,
        loginStaff,
        loginGuestPass,
        unlockWithPasscode,
        unlockWithLineOtp,
        unlockDemoOneClick,
        logAccessAttempt,
        guestPasses,
        generateGuestPass,
        revokeGuestPass,
        getBurnedTokens,
        refreshPasses,
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
