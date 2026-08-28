// Records a walkthrough video of this round's booking-flow realism features:
// urgency tiers (guaranteed vs. last-minute/best-effort), the 3-step
// fare -> payment -> confirmation flow, cash-on-arrival, and the Hourly
// Charter (計時包車) product with its mountain-route surcharge.
// Usage: node e2e/record-booking-realism.mjs [port]
import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const videoDir = '/tmp/pw-video-booking'
fs.mkdirSync(videoDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
})
const page = await context.newPage()
const wait = (ms) => page.waitForTimeout(ms)

try {
  await page.goto(BASE + '/booking', { waitUntil: 'networkidle' })
  await wait(1200)

  // 1. Urgency tiers — Airport Express's "guaranteed" vs. "best-effort, NOT guaranteed" last-minute tier.
  await page.selectOption('select >> nth=1', 'tpe-airport')
  await page.selectOption('select >> nth=2', 'taipei-101')
  await wait(600)
  await page.click('[data-testid="booking-urgency-last-minute"]')
  await page.waitForSelector('[data-testid="booking-urgency-not-guaranteed-notice"]')
  await wait(1800)

  await page.click('button:has-text("Random")')
  await page.click('button:has-text("Look up")')
  await page.waitForTimeout(1300)
  await wait(1400)

  // 2. Trust badges (free-cancellation window, multi-stop, insured, 24h support).
  await page.locator('[data-testid="booking-trust-badges"]').scrollIntoViewIfNeeded()
  await wait(1600)

  // 3. Multi-stop support.
  await page.fill('[data-testid="booking-waypoint-input"]', 'Grand Hyatt Taipei')
  await page.click('[data-testid="booking-waypoint-add"]')
  await wait(1000)

  // 4. Hourly Charter (計時包車) toggle with mountain-route surcharge.
  await page.click('[data-testid="booking-charter-toggle"]')
  await wait(700)
  await page.selectOption('[data-testid="booking-charter-hours-select"]', '8')
  await page.check('[data-testid="booking-charter-mountain-route"]')
  await wait(1800)
  await page.locator('[data-testid="booking-charter-section"]').scrollIntoViewIfNeeded()
  await wait(1200)
  // Turn charter back off so the remaining vehicle-grid/step flow shows the
  // usual distance-based fare breakdown for this walkthrough.
  await page.click('[data-testid="booking-charter-toggle"]')
  await wait(800)

  // 5. Vehicle grid + fare breakdown, then Step 1 -> Step 2.
  await page.locator('[data-testid="booking-trust-badges"]').scrollIntoViewIfNeeded()
  await wait(600)
  await page.click('[data-testid="booking-step1-continue"]')
  await page.waitForSelector('[data-testid="checkout-payment-card"]')
  await wait(1000)

  // 6. Step 2: Payment Method — cash on arrival + a note.
  await page.fill('input[placeholder="Jane Doe"]', 'Chen Yu-Ting')
  await page.fill('input[placeholder="+886 912-345-678"]', '+886 966-111-222')
  await page.fill('input[placeholder="jane@example.com"]', 'yuting.chen@example.com')
  await wait(500)
  await page.click('[data-testid="checkout-payment-cash"]')
  await page.waitForSelector('[data-testid="checkout-cash-notice"]')
  await wait(1000)
  await page.fill('[data-testid="checkout-notes-input"]', 'Please call on arrival — walkthrough note')
  await wait(800)
  await page.check('[data-testid="checkout-consent"]')
  await wait(1000)

  // 7. Step 3: Booking Confirmation with an order number.
  await page.click('[data-testid="checkout-confirm-booking"]')
  await page.waitForSelector('[data-testid="checkout-booking-confirmed"]', { timeout: 8000 })
  await wait(2600)

  console.log('✅ Booking-realism walkthrough recorded')
} catch (err) {
  console.error('❌ Recording failed:', err)
  process.exitCode = 1
} finally {
  await context.close()
  await browser.close()
  const files = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'))
  console.log('Video file:', files[0] ? `${videoDir}/${files[0]}` : 'NONE')
}
