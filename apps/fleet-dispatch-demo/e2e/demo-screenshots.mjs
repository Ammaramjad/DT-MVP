// Captures a set of static screenshots (headless) of the key new UI surfaces:
// Control Center KPIs/capacity/schedule/roster tabs, the live dispatch
// countdown + escalation + unresponsive/reassign banner, the driver stats
// header, and the customer booking-history tab. Writes PNGs to OUT below.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/demo-screenshots.mjs [port]
import { chromium } from 'playwright'

const PORT = process.argv[2] || 5183
const BASE = `http://localhost:${PORT}`
const OUT = '/opt/cursor/artifacts'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
const wait = (ms) => page.waitForTimeout(ms)
// Cross-app links now live inside the collapsed DemoModeSwitcher menu, so
// open it first — it auto-closes again once a link is clicked.
const nav = async (label) => {
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.getByRole('link', { name: label, exact: false }).first().click()
  await wait(700)
}

console.log('Loading Control Center…')
await page.goto(BASE + '/control', { waitUntil: 'networkidle' })
await wait(1500)
await page.screenshot({ path: `${OUT}/screenshot_control_center_kpis_dashboard.png` })

console.log('Pausing auto-dispatch + ambient orders for deterministic screenshots…')
const autoDispatchChip = page.locator('button:has-text("Auto-Dispatch")').first()
if (await autoDispatchChip.count()) await autoDispatchChip.click()
const ambientChip = page.locator('button:has-text("Live Demo Orders"), button:has-text("Live Orders")').first()
if (await ambientChip.count()) await ambientChip.click()
await wait(400)

await page.evaluate(() => window.scrollTo({ top: 560, behavior: 'instant' }))
await wait(1000)
await page.screenshot({ path: `${OUT}/screenshot_control_center_capacity_forecast.png` })

await page.click('text=Driver Schedule')
await wait(1000)
await page.screenshot({ path: `${OUT}/screenshot_control_center_driver_schedule_matrix.png` })

await page.click('text=Fleet Roster')
await wait(1000)
await page.screenshot({ path: `${OUT}/screenshot_control_center_fleet_roster_breakdown.png` })

console.log('Booking a ride to capture dispatch/escalation UI…')
await nav('Booking')
await wait(1000)
await page.selectOption('select >> nth=1', 'tpe-airport')
await page.selectOption('select >> nth=2', 'w-hotel')
await page.click('button:has-text("LUXURY")')
await wait(300)
await page.fill('input[placeholder="Jane Doe"]', 'Demo Client')
await page.fill('input[placeholder="+886 912-345-678"]', '+1 555-2026')
await page.fill('input[placeholder="jane@example.com"]', 'demo.client@example.com')
await wait(400)
await page.click('button:has-text("Confirm Booking")')
await page.waitForSelector('text=Created!')
const heading = await page.textContent('h2')
const orderNo = heading.match(/(FP-\d+)/)?.[1]
console.log('order', orderNo)
await wait(1000)
await page.screenshot({ path: `${OUT}/screenshot_booking_confirmation.png` })

await page.click('button:has-text("View in Control Center")')
await wait(800)
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
const card = page.locator(`[data-testid="order-card"][data-order-no="${orderNo}"]`)
await card.waitFor({ state: 'visible' })
await card.locator('[data-testid="demo-no-response-toggle"]').click()
await card.locator('[data-testid="assign-button"]').click()
await wait(1200)
await card.scrollIntoViewIfNeeded()
await wait(400)
await page.screenshot({ path: `${OUT}/screenshot_control_center_dispatch_countdown_channels.png` })

console.log('Waiting for stage-2 escalation…')
const start = Date.now()
while (Date.now() - start < 17000) {
  const stage = await card.getAttribute('data-order-status')
  if (stage !== 'PENDING_DRIVER_RESPONSE') break
  const text = await card.innerText()
  if (text.includes('Escalated')) break
  await wait(400)
}
await card.scrollIntoViewIfNeeded()
await wait(300)
await page.screenshot({ path: `${OUT}/screenshot_control_center_escalation_stage2.png` })

console.log('Waiting for unresponsive requeue…')
const start2 = Date.now()
while (Date.now() - start2 < 20000) {
  const status = await card.getAttribute('data-order-status')
  if (status === 'NEW') break
  await wait(400)
}
await card.scrollIntoViewIfNeeded()
await wait(500)
await page.screenshot({ path: `${OUT}/screenshot_control_center_unresponsive_reassign_banner.png` })

console.log('Driver App screenshots…')
await nav('Driver App')
await wait(1000)
await page.screenshot({ path: `${OUT}/screenshot_driver_app_stats_header.png` })

console.log('Customer App — Activity tab booking history…')
await nav('Customer App')
await wait(1000)
await page.click('[data-testid="customer-tab-activity"]')
await wait(400)
const custOrderSelect = page.locator('[data-testid="customer-order-select"]')
const isabelleValue = await custOrderSelect.locator('option', { hasText: 'Isabelle Laurent' }).first().getAttribute('value')
if (isabelleValue) await custOrderSelect.selectOption(isabelleValue)
await wait(1000)
await page.screenshot({ path: `${OUT}/screenshot_customer_booking_history_profile.png` })

console.log('Done.')
await browser.close()
