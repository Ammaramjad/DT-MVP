import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const PORT = process.env.PORT || '5183'
const BASE = `http://localhost:${PORT}`
const OUT_DIR = '/opt/cursor/artifacts'
mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

try {
  // Unlock Gatekeeper
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 6000 })
  await page.click('[data-testid="gatekeeper-tab-passcode"]')
  await page.fill('[data-testid="gatekeeper-passcode-input"]', 'FLEET2026')
  await page.click('[data-testid="gatekeeper-passcode-unlock-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 6000 })

  // Navigate to Access Logs & Live Presence Monitor
  await page.goto(BASE + '/fleet-os/access-logs', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="live-presence-monitor"]', { timeout: 6000 })
  await page.waitForTimeout(1000)

  // Capture Live Presence & Access Logs Overview
  await page.screenshot({ path: `${OUT_DIR}/live_online_visitor_presence_monitor.png`, fullPage: false })
  console.log('✓ Captured live_online_visitor_presence_monitor.png')

  // Switch language to 繁體中文 and take screenshot
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.waitForTimeout(300)
  await page.click('[data-testid="lang-option-zh"]')
  await page.waitForTimeout(800)
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT_DIR}/live_presence_monitor_zh_tw.png`, fullPage: false })
  console.log('✓ Captured live_presence_monitor_zh_tw.png')

} catch (err) {
  console.error('Artifact capture failed:', err)
} finally {
  await browser.close()
}
