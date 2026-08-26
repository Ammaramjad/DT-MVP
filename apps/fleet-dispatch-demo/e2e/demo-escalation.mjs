// Scripted walkthrough of the multi-channel notification + escalation ladder:
// books a ride, forces the "driver won't respond" demo toggle, dispatches it,
// and watches stage-1 (In-App Push) time out, escalate to stage-2 (LINE +
// Phone Call), time out again, and finally flag the driver unresponsive with
// a reassignment prompt. Opens a real (non-headless) browser window so it can
// be paired with the RecordScreen tool for a demo video.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/demo-escalation.mjs [port]
import { chromium } from 'playwright'

const PORT = process.argv[2] || 5183
const BASE = `http://localhost:${PORT}`

const browser = await chromium.launch({ headless: false, args: ['--window-position=0,0', '--window-size=1600,1000'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })

const wait = (ms) => page.waitForTimeout(ms)
// Cross-app links now live inside the collapsed DemoModeSwitcher menu, so
// open it first — it auto-closes again once a link is clicked.
const nav = async (label) => {
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.getByRole('link', { name: label, exact: false }).first().click()
  await wait(600)
}

console.log('0. Loading app once, then pausing auto-dispatch + ambient orders for a deterministic demo…')
await page.goto(BASE + '/control', { waitUntil: 'networkidle' })
await wait(1000)
const autoDispatchChip = page.locator('button:has-text("Auto-Dispatch")').first()
if (await autoDispatchChip.count()) await autoDispatchChip.click()
const ambientChip = page.locator('button:has-text("Live Demo Orders"), button:has-text("Live Orders")').first()
if (await ambientChip.count()) await ambientChip.click()
await wait(500)

console.log('1. Booking a new ride (in-app navigation to preserve store state)…')
await nav('Booking')
await wait(1000)
await page.selectOption('select >> nth=1', 'tpe-airport')
await page.selectOption('select >> nth=2', 'w-hotel')
await page.click('button:has-text("LUXURY")')
await wait(300)
await page.fill('input[placeholder="Jane Doe"]', 'Demo Client')
await page.fill('input[placeholder="+886 912-345-678"]', '+1 555-2026')
await page.fill('input[placeholder="jane@example.com"]', 'demo.client@example.com')
await wait(600)
await page.click('button:has-text("Confirm Booking")')
await page.waitForSelector('text=Created!')
const heading = await page.textContent('h2')
const orderNo = heading.match(/(FP-\d+)/)?.[1]
console.log('Created order', orderNo)
await wait(1800)

console.log('2. Handing off to Control Center…')
await page.click('button:has-text("View in Control Center")')
await page.waitForTimeout(1200)

const card = page.locator(`[data-testid="order-card"][data-order-no="${orderNo}"]`)
await card.waitFor({ state: 'visible' })
await card.scrollIntoViewIfNeeded()
await wait(2200)

console.log('3. Enabling "driver will not respond" demo toggle before dispatch…')
await card.locator('[data-testid="demo-no-response-toggle"]').click()
await wait(1000)

console.log('4. Dispatching order to first suggested driver…')
const assignBtn = card.locator('[data-testid="assign-button"]')
if (await assignBtn.count()) await assignBtn.click()
await wait(1500)
await card.scrollIntoViewIfNeeded()

async function waitForStatus(predicate, timeoutMs, label) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const status = await card.getAttribute('data-order-status')
    if (predicate(status)) {
      console.log(`   -> reached (${label}): ${status}`)
      return status
    }
    await wait(500)
  }
  console.log(`   -> timed out waiting for ${label}`)
  return null
}

console.log('5. Watching stage-1 (In-App Push) countdown tick down live…')
await waitForStatus((s) => s !== 'PENDING_DRIVER_RESPONSE', 18000, 'escalation-or-resolution')
await wait(1200)

console.log('6. Watching escalation to stage-2 (LINE + Phone Call)…')
await card.scrollIntoViewIfNeeded()
await waitForStatus((s) => s === 'NEW', 20000, 'unresponsive-requeue')
await wait(2000)

console.log('7. Unresponsive + reassignment banner should now be visible on the card…')
await card.scrollIntoViewIfNeeded()
await wait(3500)

console.log('8. Panning to the Fleet Roster tab to show the red unresponsive alert…')
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await wait(500)
const rosterTab = page.locator('text=Fleet Roster')
if (await rosterTab.count()) await rosterTab.click()
await wait(3500)

console.log('Done recording escalation flow.')
await wait(1000)
await browser.close()
