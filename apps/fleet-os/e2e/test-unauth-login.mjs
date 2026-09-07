/**
 * Unauthenticated gatekeeper smoke test — Chromium + WebKit.
 * Fresh context, no storage → login form visible.
 * Blocked localStorage → login form still visible.
 * Login / logout round-trip.
 *
 * Usage:
 *   node e2e/test-unauth-login.mjs [port|url]
 */
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const ARG = process.argv[2]
const isUrl = ARG && ARG.startsWith('http')
const PORT = isUrl ? '5195' : (ARG || process.env.PORT || '5195')
const BASE = isUrl ? ARG : `http://localhost:${PORT}`
const ARTIFACTS_DIR = '/opt/cursor/artifacts'

if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

const BLOCKED_STORAGE_SCRIPT = () => {
  const blocked = {
    getItem() {
      throw new DOMException('QuotaExceededError', 'SecurityError')
    },
    setItem() {
      throw new DOMException('QuotaExceededError', 'SecurityError')
    },
    removeItem() {
      throw new DOMException('QuotaExceededError', 'SecurityError')
    },
    clear() {
      throw new DOMException('QuotaExceededError', 'SecurityError')
    },
    key() {
      throw new DOMException('QuotaExceededError', 'SecurityError')
    },
    get length() {
      throw new DOMException('QuotaExceededError', 'SecurityError')
    },
  }
  Object.defineProperty(window, 'localStorage', { configurable: true, value: blocked })
  Object.defineProperty(window, 'sessionStorage', { configurable: true, value: blocked })
}

let preview = null
if (!isUrl) {
  console.log(`Starting Vite Preview server on port ${PORT}...`)
  preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host'], {
    cwd: '/workspace/apps/fleet-os',
    stdio: 'ignore',
  })
  await new Promise((r) => setTimeout(r, 2000))
} else {
  console.log(`Running against remote endpoint: ${BASE}`)
}

async function runSuite(browserType, label, screenshotPath, blockStorage = false) {
  const browser = await browserType.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })

  if (blockStorage) {
    await context.addInitScript(BLOCKED_STORAGE_SCRIPT)
  }

  const page = await context.newPage()
  const consoleErrors = []
  page.on('pageerror', (err) => consoleErrors.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  console.log(`\n=== ${label}: fresh context, no auth token ===`)
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 15000 })
  await page.waitForSelector('[data-testid="gatekeeper-login-form"]', { timeout: 10000 })
  await page.waitForSelector('[data-testid="gatekeeper-username-input"]', { timeout: 5000 })
  await page.waitForSelector('[data-testid="gatekeeper-password-input"]', { timeout: 5000 })
  await page.waitForSelector('[data-testid="gatekeeper-submit-btn"]', { timeout: 5000 })

  const tabCount = await page.locator('[data-testid^="gatekeeper-tab-"]').count()
  if (tabCount !== 0) {
    throw new Error(`${label}: login page must not have separate tabs`)
  }

  const leaked = await page.locator('[data-testid="gatekeeper-modal"]').textContent()
  if (leaked.includes('FleetAdmin2026!') || leaked.includes('ONE-TIME-2026')) {
    throw new Error(`${label}: credentials leaked on login UI`)
  }

  const appLeak = await page.locator('[data-testid="demo-switcher-toggle"]').count()
  if (appLeak > 0) {
    throw new Error(`${label}: app DOM leaked while locked`)
  }

  await page.screenshot({ path: screenshotPath, fullPage: false })
  console.log(`✓ ${label}: login form visible — screenshot ${screenshotPath}`)

  console.log(`\n=== ${label}: admin login ===`)
  await page.fill('[data-testid="gatekeeper-username-input"]', 'admin')
  await page.fill('[data-testid="gatekeeper-password-input"]', 'FleetAdmin2026!')
  await page.click('[data-testid="gatekeeper-submit-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 10000 })
  console.log(`✓ ${label}: admin login successful`)

  console.log(`\n=== ${label}: logout returns to login ===`)
  await page.goto(BASE + '/fleet-os', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="header-logout-btn"]', { timeout: 10000 })
  await page.click('[data-testid="header-logout-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 10000 })
  console.log(`✓ ${label}: logout returned to gatekeeper`)

  if (consoleErrors.length > 0) {
    console.warn(`${label} console errors (non-fatal if UI OK):`, consoleErrors.slice(0, 5))
  }

  await browser.close()
}

try {
  await runSuite(chromium, 'Chromium', `${ARTIFACTS_DIR}/unauth_login_chromium.png`, false)

  const browser = await webkit.launch({ headless: true })
  const blockedCtx = await browser.newContext({
    ...webkit.devices?.['iPhone 13'] ? undefined : undefined,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    locale: 'zh-TW',
  })
  await blockedCtx.addInitScript(BLOCKED_STORAGE_SCRIPT)
  const blockedPage = await blockedCtx.newPage()

  console.log('\n=== WebKit: blocked localStorage → login form still visible ===')
  await blockedPage.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 })
  await blockedPage.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 15000 })
  await blockedPage.waitForSelector('[data-testid="gatekeeper-login-form"]', { timeout: 10000 })
  await blockedPage.screenshot({ path: `${ARTIFACTS_DIR}/unauth_login_webkit.png`, fullPage: true })
  console.log(`✓ WebKit blocked-storage: login form visible — screenshot ${ARTIFACTS_DIR}/unauth_login_webkit.png`)
  await browser.close()

  await runSuite(webkit, 'WebKit', `${ARTIFACTS_DIR}/unauth_login_webkit.png`, false)

  console.log('\n🎉 ALL UNAUTHENTICATED LOGIN TESTS PASSED')
} catch (err) {
  console.error('\n❌ Test failed:', err)
  process.exitCode = 1
} finally {
  if (preview) preview.kill()
}
