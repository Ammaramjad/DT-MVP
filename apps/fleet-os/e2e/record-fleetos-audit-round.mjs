// Records a walkthrough video of every Fleet OS module added/enhanced during
// the workhive.uk (排班總覽) reference-site gap-analysis audit round: Manual
// Order Entry, Translation Proofreading, Flight Board, Account Management,
// Operating Parameters, the new "Today's Roster" tab, and the Fleet Map's
// legend/filter + Big Screen mode.
// Usage: node e2e/record-fleetos-audit-round.mjs [port]
import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const videoDir = '/tmp/pw-video-fleetos-audit'
fs.mkdirSync(videoDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
})
const page = await context.newPage()
const wait = (ms) => page.waitForTimeout(ms)

try {
  // 1. Manual Order Entry (手動開單) — key in a phone booking, confirmed immediately.
  await page.goto(BASE + '/fleet-os/manual-order', { waitUntil: 'networkidle' })
  await wait(1400)
  await page.fill('[data-testid="manual-order-name"]', 'Chih-Ming Chen')
  await wait(250)
  await page.fill('[data-testid="manual-order-phone"]', '+886 912 345 678')
  await wait(250)
  await page.selectOption('[data-testid="manual-order-vehicle"]', 'SUV')
  await wait(500)
  await page.click('[data-testid="manual-order-submit"]')
  await page.waitForSelector('[data-testid="manual-order-success"]')
  await wait(1800)

  // 2. Translation Proofreading (翻譯校對) — AI-pretranslated note review queue.
  await page.goto(BASE + '/fleet-os/translation-qa', { waitUntil: 'networkidle' })
  await wait(1000)
  await page.click('[data-testid="translation-qa-queue-item"] >> nth=0')
  await wait(2200)

  // 3. Flight Board (航班看板) — live aggregation of today's flights linked to orders.
  await page.goto(BASE + '/fleet-os/flights', { waitUntil: 'networkidle' })
  await wait(2200)

  // 4. Account Management (帳號管理) — staff accounts + driver login toggle.
  await page.goto(BASE + '/fleet-os/accounts', { waitUntil: 'networkidle' })
  await wait(1400)
  await page.click('[data-testid="accounts-tab-DRIVERS"]')
  await wait(900)
  await page.click('[data-testid="accounts-driver-toggle-login"] >> nth=0')
  await wait(1400)

  // 5. Operating Parameters (營運參數) — editable, audit-logged scheduling config.
  await page.goto(BASE + '/fleet-os/params', { waitUntil: 'networkidle' })
  await wait(1400)
  await page.fill('[data-testid="params-flight-refresh"]', '20')
  await wait(400)
  await page.click('[data-testid="params-save-button"]')
  await page.waitForSelector('[data-testid="params-saved-toast"]')
  await wait(2000)

  // 6. Today's Roster (本日班表) — per-driver job list with shift/status filters.
  await page.goto(BASE + '/fleet-os/roster', { waitUntil: 'networkidle' })
  await wait(1200)
  await page.click("button:has-text(\"Today's Roster\")")
  await wait(1000)
  await page.click('[data-testid="today-roster-driver-row"] >> nth=0')
  await wait(2000)

  // 7. Fleet Map — tier legend as filter, unresponsive isolate toggle, Big Screen mode.
  await page.goto(BASE + '/fleet-os', { waitUntil: 'networkidle' })
  await wait(1800)
  await page.click('[data-testid="fleetmap-legend-unresponsive"]')
  await wait(1100)
  await page.click('[data-testid="fleetmap-legend-unresponsive"]')
  await wait(500)
  await page.click('[data-testid="fleetmap-bigscreen-open"]')
  await wait(2400)
  await page.click('[data-testid="fleetmap-bigscreen-close"]')
  await wait(900)

  console.log('✅ Fleet OS audit-round walkthrough recorded')
} catch (err) {
  console.error('❌ Recording failed:', err)
  process.exitCode = 1
} finally {
  await context.close()
  await browser.close()
  const files = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'))
  console.log('Video file:', files[0] ? `${videoDir}/${files[0]}` : 'NONE')
}
