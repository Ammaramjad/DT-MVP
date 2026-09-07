import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const ARG = process.argv[2]
const isUrl = ARG && ARG.startsWith('http')
const PORT = isUrl ? '5194' : (ARG || process.env.PORT || '5194')
const BASE = isUrl ? ARG : `http://localhost:${PORT}`
const ARTIFACTS_DIR = '/opt/cursor/artifacts'

if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

let preview = null
if (!isUrl) {
  console.log(`Starting Vite Preview server on port ${PORT}...`)
  preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host'], {
    cwd: '/workspace/apps/fleet-os',
    stdio: 'ignore',
  })
  // Give the server 1.5s to start
  await new Promise((r) => setTimeout(r, 1500))
} else {
  console.log(`Running against remote endpoint: ${BASE}`)
}

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
})
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(err.message))

const log = (msg) => console.log(`\n=== ${msg} ===`)

const checkZeroLeakage = async () => {
  const appSelectors = [
    '[data-testid="fleetos-nav"]',
    '.leaflet-container',
    'a[href="/booking"]',
    'a[href="/fleet-os"]',
    '[data-testid="today-roster-board"]',
    '[data-testid="dispatch-board-panel"]',
  ]

  for (const selector of appSelectors) {
    const count = await page.locator(selector).count()
    if (count > 0) {
      throw new Error(`Zero-leakage check failed: DOM element "${selector}" was mounted while system is locked!`)
    }
  }
}

try {
  log('1. Initial visit to root route: Verify Cyber-Luxe Login Screen appears with 3 Tabs')
  // Clear any existing localStorage
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })

  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 8000 })
  await page.waitForSelector('[data-testid="gatekeeper-modal"]', { timeout: 8000 })
  await page.waitForSelector('[data-testid="gatekeeper-tab-staff"]', { timeout: 5000 })
  await page.waitForSelector('[data-testid="gatekeeper-tab-guest"]', { timeout: 5000 })
  await page.waitForSelector('[data-testid="gatekeeper-tab-line"]', { timeout: 5000 })

  console.log('✓ Access Gatekeeper correctly intercepted visit and displayed 3 Auth Tabs')
  await checkZeroLeakage()
  console.log('✓ Zero-Leakage verified: No background DOM leaked')

  // Capture Login Screen Walkthrough Screenshot
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/login_portal_cyber_luxe.png`,
    fullPage: false,
  })
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/login_portal_cyber_luxe.png`)

  log('2. Test Permanent Admin Credentials Login (admin / FleetAdmin2026!)')
  await page.click('[data-testid="gatekeeper-tab-staff"]')
  await page.fill('[data-testid="gatekeeper-staff-username-input"]', 'admin')
  await page.fill('[data-testid="gatekeeper-staff-password-input"]', 'FleetAdmin2026!')
  await page.click('[data-testid="gatekeeper-staff-submit-btn"]')

  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 8000 })
  console.log('✓ Admin login successfully unlocked the platform')

  // Navigate to /fleet-os to verify Header Session Indicator & Countdown
  await page.goto(BASE + '/fleet-os', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="header-session-indicator"]', { timeout: 8000 })
  await page.waitForSelector('[data-testid="header-user-badge"]', { timeout: 8000 })
  await page.waitForSelector('[data-testid="header-session-countdown"]', { timeout: 8000 })
  await page.waitForSelector('[data-testid="header-logout-btn"]', { timeout: 8000 })

  const userBadgeText = await page.locator('[data-testid="header-user-badge"]').textContent()
  console.log(`✓ Header user profile badge verified: "${userBadgeText}"`)
  if (!userBadgeText.includes('admin')) {
    throw new Error('Header badge should display admin username')
  }

  // Capture Header Session Indicator Walkthrough Screenshot
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/header_session_indicator_logout.png`,
    fullPage: false,
  })
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/header_session_indicator_logout.png`)

  log('3. Test Logout as Admin — Platform Re-locks')
  await page.click('[data-testid="header-logout-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 8000 })
  await checkZeroLeakage()
  console.log('✓ Logout button returned to Login Gatekeeper and locked portal')

  log('4. Test Single-Use VIP Guest Pass Login (guest_demo / ONE-TIME-2026)')
  await page.click('[data-testid="gatekeeper-tab-guest"]')
  await page.fill('[data-testid="gatekeeper-guest-username-input"]', 'guest_demo')
  await page.fill('[data-testid="gatekeeper-guest-passcode-input"]', 'ONE-TIME-2026')
  await page.click('[data-testid="gatekeeper-guest-submit-btn"]')

  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 8000 })
  console.log('✓ 1-time guest credentials successfully authenticated')

  // Verify guest badge in header
  await page.goto(BASE + '/fleet-os', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="header-user-badge"]', { timeout: 8000 })
  const guestBadgeText = await page.locator('[data-testid="header-user-badge"]').textContent()
  console.log(`✓ Guest user profile badge: "${guestBadgeText}"`)
  if (!guestBadgeText.includes('guest_demo') && !guestBadgeText.includes('Guest Pass') && !guestBadgeText.includes('單次免洗貴賓')) {
    throw new Error('Header badge should display Guest Pass badge')
  }

  log('5. Logout Guest User — Token Must Be Marked BURNED / EXPIRED')
  await page.click('[data-testid="header-logout-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 8000 })
  console.log('✓ Guest session logged out and token burned in storage')

  log('6. Attempt Re-Login With The SAME Burned 1-Time Pass — Verify Rejection & Warning Message')
  await page.click('[data-testid="gatekeeper-tab-guest"]')
  await page.fill('[data-testid="gatekeeper-guest-username-input"]', 'guest_demo')
  await page.fill('[data-testid="gatekeeper-guest-passcode-input"]', 'ONE-TIME-2026')
  await page.click('[data-testid="gatekeeper-guest-submit-btn"]')

  await page.waitForSelector('[data-testid="gatekeeper-guest-burned-error"]', { timeout: 8000 })
  const burnedErrorText = await page.locator('[data-testid="gatekeeper-guest-burned-error"]').textContent()
  console.log(`✓ Burned token error displayed: "${burnedErrorText.trim()}"`)

  if (!burnedErrorText.includes('already been used and expired') && !burnedErrorText.includes('已作廢銷毀')) {
    throw new Error('Expected exact burned warning message on second login attempt')
  }

  await checkZeroLeakage()
  console.log('✓ App remains strictly unmounted and locked')

  // Capture Burned Token Warning Screenshot
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/login_burned_token_error.png`,
    fullPage: false,
  })
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/login_burned_token_error.png`)

  log('7. Admin Generates New 1-Time Guest Pass in Admin Hub (/fleet-os/admin & /fleet-os/access-logs)')
  // Login as admin
  await page.click('[data-testid="gatekeeper-tab-staff"]')
  await page.fill('[data-testid="gatekeeper-staff-username-input"]', 'admin')
  await page.fill('[data-testid="gatekeeper-staff-password-input"]', 'FleetAdmin2026!')
  await page.click('[data-testid="gatekeeper-staff-submit-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 8000 })

  // Navigate to /fleet-os/admin
  await page.goto(BASE + '/fleet-os/admin', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="admin-tab-VAULT"]', { timeout: 8000 })
  await page.click('[data-testid="admin-tab-VAULT"]')
  await page.waitForSelector('[data-testid="guest-pass-vault-container"]', { timeout: 8000 })

  // Capture Admin Guest Pass Generator & Vault Screenshot
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/admin_guest_pass_generator_vault.png`,
    fullPage: false,
  })
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/admin_guest_pass_generator_vault.png`)

  // Click 1-Click "Generate New 1-Time Guest Pass"
  await page.click('[data-testid="generate-guest-pass-btn"]')
  await page.waitForSelector('[data-testid="vault-toast-msg"]', { timeout: 8000 })
  console.log('✓ Admin successfully clicked "Generate New 1-Time Guest Pass"')

  // Retrieve the newest pass from list
  const firstPassItem = page.locator('[data-testid^="vault-pass-item-"]').first()
  const firstPassText = await firstPassItem.textContent()
  console.log(`✓ Newest generated pass in vault: ${firstPassText}`)

  // Extract username and passcode using DOM evaluation
  const newPassData = await page.evaluate(() => {
    const raw = localStorage.getItem('fleet_guest_passes')
    if (raw) {
      const passes = JSON.parse(raw)
      const active = passes.find((p) => p.status === 'ACTIVE')
      if (active) return { username: active.username, passcode: active.passcode }
    }
    return null
  })

  if (!newPassData) {
    throw new Error('Failed to find active generated pass in localStorage')
  }
  console.log(`✓ Extracted newly generated credentials: ${newPassData.username} / ${newPassData.passcode}`)

  log('8. Test Logging In With Newly Generated Disposable Guest Pass')
  // Logout admin
  await page.click('[data-testid="header-logout-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 8000 })

  // Enter new disposable pass
  await page.click('[data-testid="gatekeeper-tab-guest"]')
  await page.fill('[data-testid="gatekeeper-guest-username-input"]', newPassData.username)
  await page.fill('[data-testid="gatekeeper-guest-passcode-input"]', newPassData.passcode)
  await page.click('[data-testid="gatekeeper-guest-submit-btn"]')

  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 8000 })
  console.log(`✓ Successfully authenticated with newly generated pass: ${newPassData.username}`)

  log('9. Test Chief Dispatcher Permanent Account (dispatcher / TaiwanDispatch2026!)')
  await page.click('[data-testid="header-logout-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 8000 })

  await page.click('[data-testid="gatekeeper-tab-staff"]')
  await page.fill('[data-testid="gatekeeper-staff-username-input"]', 'dispatcher')
  await page.fill('[data-testid="gatekeeper-staff-password-input"]', 'TaiwanDispatch2026!')
  await page.click('[data-testid="gatekeeper-staff-submit-btn"]')

  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 8000 })
  console.log('✓ Chief Dispatcher successfully logged in')

  log('ALL LOGIN PORTAL & CREDENTIAL ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🎉')
} catch (err) {
  console.error('\n❌ Test execution failed:', err)
  process.exitCode = 1
} finally {
  await browser.close()
  if (preview) preview.kill()
}
