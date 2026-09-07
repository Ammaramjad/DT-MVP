import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'

const url = process.argv[2] || 'https://ammaramjad.github.io/DT-MVP/'
const ARTIFACTS_DIR = '/opt/cursor/artifacts'

if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

console.log(`Opening ${url}`)
const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
console.log(`HTTP status: ${response?.status()}`)

await page.waitForSelector('[data-testid="gatekeeper-modal"]', { timeout: 30000 })
await page.screenshot({ path: `${ARTIFACTS_DIR}/working_host_login.png`, fullPage: false })
console.log(`Saved ${ARTIFACTS_DIR}/working_host_login.png`)

await page.fill('[data-testid="gatekeeper-username-input"]', 'admin')
await page.fill('[data-testid="gatekeeper-password-input"]', 'FleetAdmin2026!')
await page.click('[data-testid="gatekeeper-submit-btn"]')
await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 15000 })
await page.goto(new URL('/fleet-os', url).href, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="header-user-badge"]', { timeout: 15000 })
const badge = await page.locator('[data-testid="header-user-badge"]').textContent()
console.log(`Logged in as: ${badge?.trim()}`)

await browser.close()
