// Scripted walkthrough of the enriched Control Center + driver stats/accept
// flow + customer booking history: tours the capacity forecast / driver
// schedule / fleet roster tabs, books a ride and dispatches it, accepts the
// incoming request from the Driver App (showing stats header + countdown +
// channel badges), then tours Customer Tracking's live view and "My
// Bookings" tab for both a brand-new customer and a repeat customer with
// booking-frequency analytics. Opens a real (non-headless) browser window so
// it can be paired with the RecordScreen tool for a demo video.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/demo-features.mjs [port]
import { chromium } from 'playwright'

const PORT = process.argv[2] || 5183
const BASE = `http://localhost:${PORT}`

const browser = await chromium.launch({ headless: false, args: ['--window-position=0,0', '--window-size=1600,1000'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })

const wait = (ms) => page.waitForTimeout(ms)
const nav = async (label) => {
  await page.getByRole('link', { name: label, exact: false }).first().click()
  await wait(700)
}

console.log('0. Loading app once, pausing auto-dispatch for a deterministic demo…')
await page.goto(BASE + '/control', { waitUntil: 'networkidle' })
await wait(1000)
const autoDispatchChip = page.locator('button:has-text("Auto-Dispatch")').first()
if (await autoDispatchChip.count()) await autoDispatchChip.click()
await wait(500)

console.log('1. Control Center — enriched Fleet OS dashboard (KPIs)…')
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
await wait(2000)

console.log('2. Capacity Forecast (30-day calendar heatmap)…')
await page.evaluate(() => window.scrollTo({ top: 560, behavior: 'instant' }))
await wait(2200)

console.log('3. Driver Schedule matrix…')
await page.click('text=Driver Schedule')
await wait(2200)

console.log('4. Fleet Roster breakdown + unresponsive alerts…')
await page.click('text=Fleet Roster')
await wait(2500)

console.log('5. Booking a ride…')
await nav('Booking')
await wait(1000)
await page.selectOption('select >> nth=1', 'tsa-airport')
await page.selectOption('select >> nth=2', 'grand-hyatt')
await page.click('button:has-text("SUV")')
await wait(300)
await page.fill('input[placeholder="Jane Doe"]', 'Priya Shah')
await page.fill('input[placeholder="+886 912-345-678"]', '+1 555-9081')
await page.fill('input[placeholder="jane@example.com"]', 'priya.shah@example.com')
await wait(500)
await page.click('button:has-text("Confirm Booking")')
await page.waitForSelector('text=Created!')
const heading = await page.textContent('h2')
const orderNo = heading.match(/(FP-\d+)/)?.[1]
console.log('Created order', orderNo)
await wait(1500)

console.log('6. Handoff into Control Center queue (animated arrival)…')
await page.click('button:has-text("View in Control Center")')
await wait(600)
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
const card = page.locator(`[data-testid="order-card"][data-order-no="${orderNo}"]`)
await card.waitFor({ state: 'visible' })
await card.scrollIntoViewIfNeeded()
await wait(2400)

const cardText = await card.innerText()
const driverMatch = cardText.match(/Suggested:\s*([A-Za-z .'-]+)/)
const suggestedDriverName = driverMatch ? driverMatch[1].trim() : null
console.log('Suggested driver:', suggestedDriverName)

console.log('6b. Holding the request open (demo toggle) so we can accept it manually in the Driver App…')
await card.locator('[data-testid="demo-no-response-toggle"]').click()
await wait(400)

console.log('7. Dispatching to the suggested driver (multi-channel push notification)…')
await card.locator('[data-testid="assign-button"]').click()
await wait(1800)
await card.scrollIntoViewIfNeeded()
await wait(2200)

console.log('8. Switching to Driver App to accept the live incoming request…')
await nav('Driver App')
await wait(800)
if (suggestedDriverName) {
  const select = page.locator('[data-testid="driver-select"]')
  const value = await select.locator('option', { hasText: suggestedDriverName }).first().getAttribute('value')
  if (value) await select.selectOption(value)
}
await wait(1200)

console.log('9. Driver stats header + incoming request card (countdown + channel badges)…')
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
await wait(2600)

const acceptBtn = page.locator('[data-testid="accept-request-button"]')
if (await acceptBtn.count()) {
  console.log('10. Accepting the incoming request…')
  await acceptBtn.click()
  await wait(2200)
} else {
  console.log('10. (No pending request found — showing active job/stats instead)')
  await wait(1200)
}

console.log("11. Today's job list + updated stats…")
await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }))
await wait(2200)

console.log('12. Customer Tracking — live tracking view…')
await nav('Track Ride')
await wait(1000)
const orderSelect = page.locator('[data-testid="customer-order-select"]')
if (await orderSelect.count()) {
  const optValue = await orderSelect.locator('option', { hasText: orderNo }).first().getAttribute('value')
  if (optValue) await orderSelect.selectOption(optValue)
}
await wait(2400)

console.log('13. Customer booking history / profile tab (new customer — first booking)…')
await page.click('[data-testid="customer-tab-history"]')
await wait(2400)

console.log('14. Switching to a repeat customer to show booking-frequency analytics…')
const isabelleValue = await orderSelect.locator('option', { hasText: 'Isabelle Laurent' }).first().getAttribute('value')
if (isabelleValue) await orderSelect.selectOption(isabelleValue)
await wait(3000)

console.log('Done recording enriched features flow.')
await wait(1000)
await browser.close()
