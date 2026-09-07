import { webkit, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5183'
const SCREENSHOT_PATH = process.env.SCREENSHOT_PATH || '/opt/cursor/artifacts/safari_login_fixed.png'

async function main() {
  mkdirSync(dirname(SCREENSHOT_PATH), { recursive: true })

  const browser = await webkit.launch({ headless: true })
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    locale: 'zh-TW',
  })

  // Simulate Safari private browsing where localStorage throws on access.
  await context.addInitScript(() => {
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
  })

  const page = await context.newPage()
  const consoleErrors = []
  page.on('pageerror', (err) => consoleErrors.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })

  const overlay = page.locator('[data-testid="client-gatekeeper-overlay"]')
  await overlay.waitFor({ state: 'visible', timeout: 15000 })

  const title = await page.locator('[data-testid="gatekeeper-modal"]').innerText()
  const usernameVisible = await page.locator('[data-testid="gatekeeper-username-input"]').isVisible()
  const passwordVisible = await page.locator('[data-testid="gatekeeper-password-input"]').isVisible()
  const submitVisible = await page.locator('[data-testid="gatekeeper-submit-btn"]').isVisible()

  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true })

  const box = await overlay.boundingBox()
  if (!box || box.height < 200) {
    throw new Error(`Gatekeeper overlay has invalid height: ${JSON.stringify(box)}`)
  }

  if (!usernameVisible || !passwordVisible || !submitVisible) {
    throw new Error('Login form controls are not visible in WebKit')
  }

  if (consoleErrors.length > 0) {
    console.warn('Console errors (non-fatal if UI rendered):', consoleErrors)
  }

  console.log('WebKit login gatekeeper OK')
  console.log('Title snippet:', title.slice(0, 120).replace(/\s+/g, ' '))
  console.log('Screenshot:', SCREENSHOT_PATH)

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
