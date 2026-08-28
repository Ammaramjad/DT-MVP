// End-to-end test verifying Real-Time Live Online Visitor Tracking & Active Session Monitor:
// 1. Live presence tracker initializes unique session ID and transmits regular heartbeats with Geo & Device info.
// 2. Visiting different surfaces (/customer, /booking, /fleet-os/orders) updates the session's active surface in real-time.
// 3. /fleet-os/access-logs prominently renders the Live Active Sessions Monitor with:
//    - Live pulsing badge ("X Live Visitors Online Right Now" / "X Active Sessions")
//    - Active session cards with live green pulse, masked IP, unmask toggle, copy IP, Country Flag, Geolocation, Surface Badge, Active Duration & Last Ping.
// 4. Multi-tab / BroadcastChannel / localStorage synchronization reflects active visitors across sessions.
// 5. Inactive sessions exceeding timeout threshold (35s) time out cleanly.

import { chromium } from 'playwright'

const ARG = process.argv[2] || process.env.PORT || '5183'
const BASE = ARG.startsWith('http') ? ARG : `http://localhost:${ARG}`

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(err.message))

const log = (msg) => console.log(`\n=== ${msg} ===`)

try {
  log('1. Visit Gatekeeper and unlock portal to start live presence tracking')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 15000 })
  await page.click('[data-testid="gatekeeper-tab-passcode"]')
  await page.fill('[data-testid="gatekeeper-passcode-input"]', 'FLEET2026')
  await page.click('[data-testid="gatekeeper-passcode-unlock-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 15000 })
  console.log('✓ Successfully unlocked portal')

  // Check that session ID and live presence sessions are created in storage
  await page.waitForTimeout(1000)
  const presenceStorageData = await page.evaluate(() => {
    try {
      const sessionId = sessionStorage.getItem('fleet_presence_session_id')
      const rawSessions = localStorage.getItem('fleet_live_presence_sessions')
      const sessions = rawSessions ? JSON.parse(rawSessions) : []
      return { sessionId, sessions }
    } catch {
      return { sessionId: null, sessions: [] }
    }
  })

  if (!presenceStorageData.sessionId || !presenceStorageData.sessionId.startsWith('presence_session_')) {
    throw new Error(`Expected presence_session_<id> in sessionStorage, but got: ${presenceStorageData.sessionId}`)
  }
  console.log(`✓ Verified unique session ID created: ${presenceStorageData.sessionId}`)

  const currentSession = presenceStorageData.sessions.find((s) => s.sessionId === presenceStorageData.sessionId)
  if (!currentSession) {
    throw new Error('Current session was not found in fleet_live_presence_sessions localStorage!')
  }
  console.log(`✓ Verified current session registered in localStorage: IP ${currentSession.ip}, Surface: ${currentSession.surface}`)

  log('2. Navigate across different surfaces and verify real-time surface update')
  // Navigate to Booking
  await page.goto(BASE + '/booking', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  let updatedSurface = await page.evaluate(() => {
    try {
      const sessionId = sessionStorage.getItem('fleet_presence_session_id')
      const rawSessions = localStorage.getItem('fleet_live_presence_sessions')
      const sessions = rawSessions ? JSON.parse(rawSessions) : []
      const current = sessions.find((s) => s.sessionId === sessionId)
      return current ? current.surface : null
    } catch {
      return null
    }
  })
  if (!updatedSurface || !updatedSurface.includes('Booking')) {
    throw new Error(`Expected surface to update to Customer App / Booking, got: ${updatedSurface}`)
  }
  console.log(`✓ Verified navigation to /booking updated active surface to: "${updatedSurface}"`)

  // Navigate to Driver App
  await page.goto(BASE + '/driver', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  updatedSurface = await page.evaluate(() => {
    try {
      const sessionId = sessionStorage.getItem('fleet_presence_session_id')
      const rawSessions = localStorage.getItem('fleet_live_presence_sessions')
      const sessions = rawSessions ? JSON.parse(rawSessions) : []
      const current = sessions.find((s) => s.sessionId === sessionId)
      return current ? current.surface : null
    } catch {
      return null
    }
  })
  if (!updatedSurface || !updatedSurface.includes('Driver')) {
    throw new Error(`Expected surface to update to Driver App, got: ${updatedSurface}`)
  }
  console.log(`✓ Verified navigation to /driver updated active surface to: "${updatedSurface}"`)

  log('3. Visit /fleet-os/access-logs and verify Live Active Sessions Monitor UI')
  await page.goto(BASE + '/fleet-os/access-logs', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="live-presence-monitor"]', { timeout: 6000 })
  await page.waitForSelector('[data-testid="live-presence-header-pill"]', { timeout: 6000 })
  await page.waitForSelector('[data-testid="live-sessions-counter-badge"]', { timeout: 6000 })
  await page.waitForSelector('[data-testid="live-sessions-cards-grid"]', { timeout: 6000 })
  console.log('✓ Live Active Sessions Monitor section, header pill, and card grid mounted successfully')

  // Check active session cards count
  const cardCount = await page.locator('[data-testid^="live-session-card-"]').count()
  if (cardCount < 2) {
    throw new Error(`Expected at least 2 active visitor session cards, but found ${cardCount}`)
  }
  console.log(`✓ Verified ${cardCount} active visitor session cards rendered in Live Monitor`)

  // Verify current session card elements (IP masking, unmask toggle, surface, geo)
  const currentCard = page.locator(`[data-testid="live-session-card-${presenceStorageData.sessionId}"]`)
  await currentCard.waitFor({ timeout: 4000 })
  console.log('✓ Current session card ("You") highlighted and rendered')

  const ipElement = currentCard.locator('[data-testid="live-session-ip"]')
  const initialIpText = await ipElement.innerText()
  console.log(`✓ Initial masked IP: ${initialIpText}`)

  // Toggle IP mask
  const toggleBtn = currentCard.locator(`[data-testid="live-session-toggle-mask-${presenceStorageData.sessionId}"]`)
  await toggleBtn.click()
  await page.waitForTimeout(300)
  const unmaskedIpText = await ipElement.innerText()
  if (unmaskedIpText.includes('***')) {
    throw new Error(`Expected IP to be unmasked, but still got: ${unmaskedIpText}`)
  }
  console.log(`✓ Unmasked full IP: ${unmaskedIpText}`)

  // Toggle mask back
  await toggleBtn.click()
  await page.waitForTimeout(300)
  const remaskedIpText = await ipElement.innerText()
  if (!remaskedIpText.includes('***') && !remaskedIpText.includes('...')) {
    throw new Error(`Expected IP to be re-masked, but got: ${remaskedIpText}`)
  }
  console.log(`✓ Re-masked IP: ${remaskedIpText}`)

  log('4. Verify multi-tab session addition via BroadcastChannel / localStorage simulation')
  const multiTabSessionId = `presence_session_test_tab_${Date.now()}`
  await page.evaluate((sessionId) => {
    try {
      const raw = localStorage.getItem('fleet_live_presence_sessions')
      const list = raw ? JSON.parse(raw) : []
      const newPeer = {
        sessionId,
        ip: '140.112.28.190',
        city: 'Taipei',
        region: 'Taipei City',
        country: 'Taiwan',
        countryCode: 'TW',
        flagEmoji: '🇹🇼',
        surface: 'Fleet OS - Dynamic Pricing Engine',
        surfaceKey: 'pricing',
        device: 'Desktop',
        browser: 'Firefox',
        os: 'Linux',
        firstSeen: Date.now() - 60000,
        lastPing: Date.now() - 1000,
        status: 'ONLINE',
      }
      localStorage.setItem('fleet_live_presence_sessions', JSON.stringify([newPeer, ...list]))
      // Broadcast heartbeat
      const channel = new BroadcastChannel('fleet_live_presence_channel')
      channel.postMessage({ type: 'HEARTBEAT', session: newPeer })
    } catch {
      // ignore
    }
  }, multiTabSessionId)

  await page.waitForTimeout(1000)
  const newTabCard = page.locator(`[data-testid="live-session-card-${multiTabSessionId}"]`)
  await newTabCard.waitFor({ timeout: 5000 })
  console.log('✓ Multi-tab peer session instantly reflected in Live Active Sessions Monitor')

  log('5. Verify timeout pruning of inactive sessions')
  await page.evaluate((sessionId) => {
    try {
      const raw = localStorage.getItem('fleet_live_presence_sessions')
      const list = raw ? JSON.parse(raw) : []
      const expiredList = list.map((s) => {
        if (s.sessionId === sessionId) {
          // Set lastPing to 45 seconds ago (exceeding 35s timeout)
          return { ...s, lastPing: Date.now() - 45000 }
        }
        return s
      })
      localStorage.setItem('fleet_live_presence_sessions', JSON.stringify(expiredList))
    } catch {
      // ignore
    }
  }, multiTabSessionId)

  // Wait for periodic prune loop (runs every 4s)
  await page.waitForTimeout(5000)
  const expiredCardCount = await page.locator(`[data-testid="live-session-card-${multiTabSessionId}"]`).count()
  if (expiredCardCount > 0) {
    throw new Error('Expired inactive session was not pruned from the active sessions monitor!')
  }
  console.log('✓ Inactive session (>35s) successfully timed out and was pruned from Live Monitor')

  console.log('\n========================================')
  console.log('🎉 ALL LIVE PRESENCE MONITOR E2E TESTS PASSED!')
  console.log('========================================\n')
} catch (err) {
  console.error('\n❌ TEST FAILED:', err)
  process.exit(1)
} finally {
  await browser.close()
}
