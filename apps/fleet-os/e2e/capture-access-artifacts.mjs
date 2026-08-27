// Capture demo walkthrough artifacts for Access Audit & Visitor Security Dashboard
import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.env.PORT || '5183'
const BASE = `http://localhost:${PORT}`

const artifactsDir = '/opt/cursor/artifacts'
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true })
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

try {
  // 1. Screenshot of Gatekeeper modal with IP logging active
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 6000 })
  await page.click('[data-testid="gatekeeper-tab-passcode"]')
  await page.fill('[data-testid="gatekeeper-passcode-input"]', 'FLEET2026')
  await page.screenshot({ path: `${artifactsDir}/access_gatekeeper_passcode_entry.png`, fullPage: false })
  console.log('✓ Saved access_gatekeeper_passcode_entry.png')

  // Unlock
  await page.click('[data-testid="gatekeeper-passcode-unlock-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 6000 })

  // 2. Navigate to Access Logs & Security Dashboard
  await page.goto(BASE + '/fleet-os/access-logs', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="access-kpi-summary"]', { timeout: 6000 })
  await page.waitForSelector('[data-testid="access-region-breakdown"]', { timeout: 6000 })
  await page.waitForSelector('[data-testid="access-logs-table"]', { timeout: 6000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${artifactsDir}/security_access_logs_dashboard.png`, fullPage: false })
  console.log('✓ Saved security_access_logs_dashboard.png')

  // 3. Filtered view: Traditional Chinese language
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.waitForSelector('[data-testid="demo-switcher-menu"]')
  await page.click('[data-testid="lang-option-zh"]')
  await page.click('[data-testid="demo-switcher-toggle"]') // close menu
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${artifactsDir}/security_access_logs_zh.png`, fullPage: false })
  console.log('✓ Saved security_access_logs_zh.png')

} catch (err) {
  console.error('Failed to capture artifacts:', err)
} finally {
  await context.close()
  await browser.close()
}
