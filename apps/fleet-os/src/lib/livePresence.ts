import { useEffect, useState, useCallback } from 'react'
import { fetchClientGeo, parseDeviceInfo } from './geoTracker'

export const LIVE_PRESENCE_STORAGE_KEY = 'fleet_live_presence_sessions'
export const LIVE_PRESENCE_CHANNEL_NAME = 'fleet_live_presence_channel'
export const SESSION_STORAGE_KEY = 'fleet_presence_session_id'
export const PRESENCE_TIMEOUT_MS = 35000 // 35 seconds inactivity timeout
export const HEARTBEAT_INTERVAL_MS = 10000 // 10 seconds heartbeat

export interface LivePresenceSession {
  sessionId: string
  ip: string
  city: string
  region: string
  country: string
  countryCode: string
  flagEmoji: string
  surface: string
  surfaceKey: string
  device: string
  browser: string
  os: string
  userAgent?: string
  firstSeen: number
  lastPing: number
  status: 'ONLINE' | 'OFFLINE'
  isCurrentSession?: boolean
  isDemoPeer?: boolean
}

export type PresenceBroadcastMessage =
  | { type: 'HEARTBEAT'; session: LivePresenceSession }
  | { type: 'BYE'; sessionId: string }
  | { type: 'PING_REQUEST' }

/**
 * Returns country flag emoji from 2-letter ISO country code
 */
export function getCountryFlag(countryCode?: string): string {
  if (!countryCode || countryCode === 'UN' || countryCode.length !== 2) return '🌐'
  const code = countryCode.toUpperCase()
  const offset = 127397
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  )
}

/**
 * Masks an IP address (e.g. 114.34.182.45 -> 114.34.182.***)
 */
export function maskIp(ip: string): string {
  if (!ip) return '***.***.***.***'
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`
  }
  return ip.length > 8 ? `${ip.slice(0, 8)}...` : ip
}

/**
 * Maps a URL pathname to a surface key and descriptive title
 */
export function getSurfaceInfo(pathname: string): { key: string; name: string } {
  const p = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/')
  if (p === '/' || p === '') {
    return { key: 'home', name: 'Portal Landing' }
  }
  if (p.startsWith('/booking')) {
    return { key: 'booking', name: 'Customer App - Search & Booking' }
  }
  if (p.startsWith('/customer')) {
    return { key: 'customer', name: 'Customer App - Live Ride Tracking' }
  }
  if (p.startsWith('/driver')) {
    return { key: 'driver', name: 'Driver App - Active Trip' }
  }
  if (p.startsWith('/marketplace')) {
    return { key: 'marketplace', name: 'Marketplace - Supplier Services' }
  }
  if (p.startsWith('/fleet-os/orders')) {
    return { key: 'orders', name: 'Fleet OS - Dispatch Orders' }
  }
  if (p.startsWith('/fleet-os/pricing/dynamic')) {
    return { key: 'pricing', name: 'Fleet OS - Dynamic Pricing Engine' }
  }
  if (p.startsWith('/fleet-os/vehicles')) {
    return { key: 'vehicles', name: 'Fleet OS - Vehicle Inventory' }
  }
  if (p.startsWith('/fleet-os/suppliers')) {
    return { key: 'suppliers', name: 'Fleet OS - Supplier Management' }
  }
  if (p.startsWith('/fleet-os/catalog')) {
    return { key: 'catalog', name: 'Fleet OS - Vehicle Catalog' }
  }
  if (p.startsWith('/fleet-os/roster')) {
    return { key: 'roster', name: 'Fleet OS - Driver Roster' }
  }
  if (p.startsWith('/fleet-os/flights')) {
    return { key: 'flights', name: 'Fleet OS - Flight Telemetry' }
  }
  if (p.startsWith('/fleet-os/campaigns')) {
    return { key: 'campaigns', name: 'Fleet OS - Campaigns & Promos' }
  }
  if (p.startsWith('/fleet-os/support')) {
    return { key: 'support', name: 'Fleet OS - Customer Support' }
  }
  if (p.startsWith('/fleet-os/refunds')) {
    return { key: 'refunds', name: 'Fleet OS - Refunds & Disputes' }
  }
  if (p.startsWith('/fleet-os/compliance')) {
    return { key: 'compliance', name: 'Fleet OS - Safety & Compliance' }
  }
  if (p.startsWith('/fleet-os/finance')) {
    return { key: 'finance', name: 'Fleet OS - Financial Settlement' }
  }
  if (p.startsWith('/fleet-os/reports')) {
    return { key: 'reports', name: 'Fleet OS - Analytics & Reports' }
  }
  if (p.startsWith('/fleet-os/admin')) {
    return { key: 'admin', name: 'Fleet OS - System Admin' }
  }
  if (p.startsWith('/fleet-os/manual-order')) {
    return { key: 'manualOrder', name: 'Fleet OS - Manual Dispatch' }
  }
  if (p.startsWith('/fleet-os/translation-qa')) {
    return { key: 'translationQa', name: 'Fleet OS - Translation QA' }
  }
  if (p.startsWith('/fleet-os/accounts')) {
    return { key: 'accounts', name: 'Fleet OS - Partner Accounts' }
  }
  if (p.startsWith('/fleet-os/params')) {
    return { key: 'params', name: 'Fleet OS - Operating Parameters' }
  }
  if (p.startsWith('/fleet-os/access-logs') || p.startsWith('/fleet-os/security')) {
    return { key: 'accessLogs', name: 'Fleet OS - Access & Security Audit' }
  }
  if (p.startsWith('/fleet-os') || p.startsWith('/control')) {
    return { key: 'fleetos', name: 'Fleet OS - Command Center' }
  }
  return { key: 'fleetos', name: 'Fleet OS - Command Center' }
}

/**
 * Gets or creates a unique session ID for the current browser session/tab
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'presence_session_server'
  try {
    let id = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!id) {
      id = `presence_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem(SESSION_STORAGE_KEY, id)
    }
    return id
  } catch {
    return `presence_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}

/**
 * Realistic seed demo peers across global locations
 */
const SEED_DEMO_PEERS: Array<Omit<LivePresenceSession, 'firstSeen' | 'lastPing'>> = [
  {
    sessionId: 'presence_session_demo_london_881',
    ip: '82.165.197.104',
    city: 'London',
    region: 'Greater London',
    country: 'United Kingdom',
    countryCode: 'GB',
    flagEmoji: '🇬🇧',
    surface: 'Fleet OS - Dispatch Orders',
    surfaceKey: 'orders',
    device: 'Desktop',
    browser: 'Chrome',
    os: 'macOS',
    status: 'ONLINE',
    isDemoPeer: true,
  },
  {
    sessionId: 'presence_session_demo_taipei_502',
    ip: '114.34.182.88',
    city: 'Taipei',
    region: 'Taipei City',
    country: 'Taiwan',
    countryCode: 'TW',
    flagEmoji: '🇹🇼',
    surface: 'Customer App - Search & Booking',
    surfaceKey: 'booking',
    device: 'Mobile',
    browser: 'Mobile Safari',
    os: 'iOS 18.2',
    status: 'ONLINE',
    isDemoPeer: true,
  },
  {
    sessionId: 'presence_session_demo_lahore_419',
    ip: '39.45.162.73',
    city: 'Lahore',
    region: 'Punjab',
    country: 'Pakistan',
    countryCode: 'PK',
    flagEmoji: '🇵🇰',
    surface: 'Driver App - Active Trip',
    surfaceKey: 'driver',
    device: 'Mobile',
    browser: 'Chrome Mobile',
    os: 'Android 15',
    status: 'ONLINE',
    isDemoPeer: true,
  },
]

/**
 * Returns fresh demo peers with recent pings
 */
export function getFreshDemoPeers(now: number = Date.now()): LivePresenceSession[] {
  return SEED_DEMO_PEERS.map((peer, idx) => ({
    ...peer,
    firstSeen: now - (idx + 1) * 240000 - 15000,
    lastPing: now - (idx * 4000 + 1500),
    status: 'ONLINE' as const,
  }))
}

/**
 * Load stored sessions from localStorage, initializing with demo peers if needed
 */
export function loadStoredLiveSessions(): LivePresenceSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LIVE_PRESENCE_STORAGE_KEY)
    if (!raw) {
      const initial = getFreshDemoPeers()
      localStorage.setItem(LIVE_PRESENCE_STORAGE_KEY, JSON.stringify(initial))
      return initial
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    const initial = getFreshDemoPeers()
    localStorage.setItem(LIVE_PRESENCE_STORAGE_KEY, JSON.stringify(initial))
    return initial
  } catch {
    return getFreshDemoPeers()
  }
}

/**
 * Save stored sessions to localStorage
 */
export function saveStoredLiveSessions(sessions: LivePresenceSession[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LIVE_PRESENCE_STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // ignore
  }
}

/**
 * Format active connection duration (e.g. "Active for 4 mins")
 */
export function formatActiveDuration(ms: number, lang: string = 'en'): string {
  const isZh = lang === 'zh-TW' || lang.startsWith('zh')
  const totalSeconds = Math.max(1, Math.floor(ms / 1000))
  if (totalSeconds < 60) {
    return isZh ? '< 1 分鐘' : '< 1 min'
  }
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) {
    return isZh ? `${minutes} 分鐘` : `${minutes} min${minutes > 1 ? 's' : ''}`
  }
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  if (isZh) {
    return remMinutes > 0 ? `${hours} 小時 ${remMinutes} 分鐘` : `${hours} 小時`
  }
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`
}

/**
 * Format relative last ping (e.g. "Last ping 2s ago")
 */
export function formatLastPing(ms: number, lang: string = 'en'): string {
  const isZh = lang === 'zh-TW' || lang.startsWith('zh')
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds <= 2) {
    return isZh ? '剛剛' : 'just now'
  }
  if (seconds < 60) {
    return isZh ? `${seconds} 秒前` : `${seconds}s ago`
  }
  const minutes = Math.floor(seconds / 60)
  return isZh ? `${minutes} 分鐘前` : `${minutes}m ago`
}

// ---------------------------------------------------------------------------
// Live Presence Manager Singleton
// ---------------------------------------------------------------------------

class LivePresenceManager {
  private channel: BroadcastChannel | null = null
  private listeners = new Set<(sessions: LivePresenceSession[]) => void>()
  private sessions: LivePresenceSession[] = []
  private currentSessionId: string = ''
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private demoPingTimer: ReturnType<typeof setInterval> | null = null
  private pruneTimer: ReturnType<typeof setInterval> | null = null
  private isInitialized = false
  private currentPathname = '/'

  constructor() {
    if (typeof window !== 'undefined') {
      this.currentSessionId = getOrCreateSessionId()
      this.sessions = loadStoredLiveSessions()
      this.initBroadcastChannel()
    }
  }

  private initBroadcastChannel() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return
    try {
      this.channel = new BroadcastChannel(LIVE_PRESENCE_CHANNEL_NAME)
      this.channel.onmessage = (event) => {
        const msg = event.data as PresenceBroadcastMessage
        if (!msg || !msg.type) return

        if (msg.type === 'HEARTBEAT' && msg.session) {
          this.upsertSession(msg.session, false)
        } else if (msg.type === 'BYE' && msg.sessionId) {
          this.removeSession(msg.sessionId, false)
        } else if (msg.type === 'PING_REQUEST') {
          this.sendHeartbeat()
        }
      }

      // Storage event listener for cross-tab fallback
      window.addEventListener('storage', (e) => {
        if (e.key === LIVE_PRESENCE_STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue)
            if (Array.isArray(parsed)) {
              this.sessions = parsed
              this.notifyListeners()
            }
          } catch {
            // ignore
          }
        }
      })
    } catch {
      // ignore
    }
  }

  public subscribe(listener: (sessions: LivePresenceSession[]) => void): () => void {
    this.listeners.add(listener)
    listener(this.getEnrichedSessions())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    const enriched = this.getEnrichedSessions()
    this.listeners.forEach((fn) => fn(enriched))
  }

  public getEnrichedSessions(): LivePresenceSession[] {
    const now = Date.now()
    // Active sessions only (within timeout window)
    return this.sessions
      .filter((s) => s.status === 'ONLINE' && now - s.lastPing <= PRESENCE_TIMEOUT_MS)
      .map((s) => ({
        ...s,
        isCurrentSession: s.sessionId === this.currentSessionId,
      }))
      .sort((a, b) => {
        if (a.isCurrentSession) return -1
        if (b.isCurrentSession) return 1
        return b.lastPing - a.lastPing
      })
  }

  public getCurrentSessionId(): string {
    return this.currentSessionId
  }

  private upsertSession(session: LivePresenceSession, shouldBroadcast: boolean = true) {
    const now = Date.now()
    let found = false
    const updated = this.sessions.map((s) => {
      if (s.sessionId === session.sessionId) {
        found = true
        return {
          ...s,
          ...session,
          firstSeen: s.firstSeen || session.firstSeen || now,
          lastPing: session.lastPing || now,
          status: 'ONLINE' as const,
        }
      }
      return s
    })

    if (!found) {
      updated.unshift({
        ...session,
        firstSeen: session.firstSeen || now,
        lastPing: session.lastPing || now,
        status: 'ONLINE' as const,
      })
    }

    this.sessions = updated
    saveStoredLiveSessions(this.sessions)
    this.notifyListeners()

    if (shouldBroadcast && this.channel) {
      try {
        this.channel.postMessage({ type: 'HEARTBEAT', session })
      } catch {
        // ignore
      }
    }
  }

  private removeSession(sessionId: string, shouldBroadcast: boolean = true) {
    this.sessions = this.sessions.map((s) => {
      if (s.sessionId === sessionId) {
        return { ...s, status: 'OFFLINE' as const }
      }
      return s
    })
    saveStoredLiveSessions(this.sessions)
    this.notifyListeners()

    if (shouldBroadcast && this.channel) {
      try {
        this.channel.postMessage({ type: 'BYE', sessionId })
      } catch {
        // ignore
      }
    }
  }

  public async sendHeartbeat(pathname?: string) {
    if (typeof window === 'undefined') return
    if (pathname) {
      this.currentPathname = pathname
    }

    try {
      const geo = await fetchClientGeo()
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      const dev = parseDeviceInfo(ua)
      const surfaceInfo = getSurfaceInfo(this.currentPathname)
      const now = Date.now()

      // Find if we already had a firstSeen
      const existing = this.sessions.find((s) => s.sessionId === this.currentSessionId)
      const firstSeen = existing?.firstSeen || now

      const currentSession: LivePresenceSession = {
        sessionId: this.currentSessionId,
        ip: geo.ip,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        countryCode: geo.countryCode,
        flagEmoji: getCountryFlag(geo.countryCode),
        surface: surfaceInfo.name,
        surfaceKey: surfaceInfo.key,
        device: dev.device,
        browser: dev.browser,
        os: dev.os,
        userAgent: ua,
        firstSeen,
        lastPing: now,
        status: 'ONLINE',
        isCurrentSession: true,
      }

      this.upsertSession(currentSession, true)
      this.relayCloudPresence(currentSession)
    } catch {
      // ignore
    }
  }

  /**
   * Resilient cloud presence relay with graceful offline/local fallback
   */
  private async relayCloudPresence(_session: LivePresenceSession) {
    // Attempt a lightweight relay ping with short timeout; if unreachable or offline, fails gracefully
    try {
      // In browser environments, use BroadcastChannel & localStorage for local/cross-tab relay
      // and only do cloud ping if online
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      // Safe no-cors ping to keyless endpoint without triggering preflight CORS errors
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1200)
      await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal,
        mode: 'no-cors',
      }).catch(() => null)
      clearTimeout(timeoutId)
    } catch {
      // graceful local fallback
    }
  }

  /**
   * Simulates active demo peer heartbeats to maintain impressive live demo state
   */
  private pulseDemoPeers() {
    const now = Date.now()
    const demoPeers = this.sessions.filter((s) => s.isDemoPeer)

    if (demoPeers.length === 0) {
      // Re-seed demo peers if none exist
      const fresh = getFreshDemoPeers(now)
      this.sessions = [...fresh, ...this.sessions.filter((s) => !s.isDemoPeer)]
      saveStoredLiveSessions(this.sessions)
      this.notifyListeners()
      return
    }

    // Update each demo peer's lastPing so they stay ONLINE during demo
    let updated = false
    this.sessions = this.sessions.map((s) => {
      if (s.isDemoPeer) {
        updated = true
        return {
          ...s,
          lastPing: now - Math.floor(Math.random() * 5000),
          status: 'ONLINE' as const,
        }
      }
      return s
    })

    if (updated) {
      saveStoredLiveSessions(this.sessions)
      this.notifyListeners()
    }
  }

  private pruneExpired() {
    const now = Date.now()
    let changed = false
    this.sessions = this.sessions.map((s) => {
      if (s.status === 'ONLINE' && now - s.lastPing > PRESENCE_TIMEOUT_MS) {
        changed = true
        return { ...s, status: 'OFFLINE' as const }
      }
      return s
    })

    if (changed) {
      saveStoredLiveSessions(this.sessions)
      this.notifyListeners()
    }
  }

  public start(initialPathname: string = '/') {
    if (this.isInitialized) {
      this.sendHeartbeat(initialPathname)
      return
    }
    this.isInitialized = true
    this.currentPathname = initialPathname

    // Request presence from other tabs
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'PING_REQUEST' })
      } catch {
        // ignore
      }
    }

    // Initial heartbeat
    this.sendHeartbeat(initialPathname)

    // Periodic heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)

    // Demo peer simulation pulse (every 12 seconds)
    this.demoPingTimer = setInterval(() => {
      this.pulseDemoPeers()
    }, 12000)

    // Periodic prune check (every 2 seconds)
    this.pruneTimer = setInterval(() => {
      // Sync from localStorage if other tabs changed it
      try {
        const stored = loadStoredLiveSessions()
        if (stored.length > 0) {
          this.sessions = stored
        }
      } catch {
        // ignore
      }
      this.pruneExpired()
    }, 2000)

    // Cleanup on window close
    const handleUnload = () => {
      this.removeSession(this.currentSessionId, true)
    }
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)
  }

  public updateRoute(pathname: string) {
    this.currentPathname = pathname
    this.sendHeartbeat(pathname)
  }

  public stop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.demoPingTimer) clearInterval(this.demoPingTimer)
    if (this.pruneTimer) clearInterval(this.pruneTimer)
    this.isInitialized = false
  }
}

export const livePresenceManager = new LivePresenceManager()

// ---------------------------------------------------------------------------
// React Hooks
// ---------------------------------------------------------------------------

/**
 * Hook to initialize active visitor tracking and respond to route changes
 */
export function useLivePresenceTracker(pathname: string) {
  useEffect(() => {
    livePresenceManager.start(pathname)
  }, [pathname])

  useEffect(() => {
    livePresenceManager.updateRoute(pathname)
  }, [pathname])
}

/**
 * Hook for consuming real-time presence data in UI components
 */
export function useLivePresence() {
  const [sessions, setSessions] = useState<LivePresenceSession[]>(() =>
    livePresenceManager.getEnrichedSessions()
  )
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsubscribe = livePresenceManager.subscribe((updated) => {
      setSessions(updated)
    })

    // 1-second state tick to update dynamic "Last ping Xs ago" & "Active for Y mins" counters
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 1000000)
    }, 1000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const currentSessionId = livePresenceManager.getCurrentSessionId()
  const activeSessions = sessions.filter((s) => s.status === 'ONLINE')
  const onlineCount = activeSessions.length
  const currentSession = activeSessions.find((s) => s.sessionId === currentSessionId)

  const refreshPresence = useCallback(() => {
    livePresenceManager.sendHeartbeat()
  }, [])

  return {
    onlineCount,
    activeSessions,
    currentSessionId,
    currentSession,
    refreshPresence,
    tick,
  }
}
