// Scripted walkthrough of the OTA-inspired booking depth: itemized fare
// breakdown, quotation expiry countdown, a demo coupon code, the dynamic
// OSRM road-snapped route (with the RouteSourceBadge confirming which path
// source is active), and the QR-code e-voucher shown after booking — then
// tours the Control Center status-history audit timeline for that order.
// Opens a real (non-headless) browser window so it can be paired with the
// RecordScreen tool for a demo video.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/demo-booking-ota.mjs [port]
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

const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))

const requests = []
page.on('request', (req) => {
  if (req.url().includes('router.project-osrm.org')) requests.push(req.url())
})

console.log('1. Opening Booking panel…')
await page.goto(BASE + '/booking', { waitUntil: 'networkidle' })
await wait(1000)

console.log('2. Selecting Songshan Airport -> W Hotel Taipei, SUV…')
await page.selectOption('select >> nth=1', 'tpe-airport')
await page.selectOption('select >> nth=2', 'w-hotel')
await page.locator('[data-testid="vehicle-card-SUV"]').click()
await wait(800)

console.log('3. Confirming the OSRM live-route badge is showing on the static preview map…')
const badge = page.locator('[data-testid="route-source-badge"]')
await badge.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
const source = await badge.getAttribute('data-source').catch(() => null)
console.log('   route-source-badge data-source =', source, '| OSRM network requests seen:', requests.length)
await wait(1000)

console.log('4. Reviewing the itemized fare breakdown + quotation countdown…')
await page.locator('text=Trip Estimate, text=行程預估').first().scrollIntoViewIfNeeded().catch(() => {})
await wait(1200)

console.log('5. Applying a demo coupon code (FLYHIGH10)…')
await page.fill('input[placeholder="e.g. FLYHIGH10"], input[placeholder="例如 FLYHIGH10"]', 'FLYHIGH10')
await page.click('button:has-text("Apply"), button:has-text("套用")')
await wait(1000)

console.log('6. Filling passenger details and confirming booking…')
await page.fill('input[placeholder="Jane Doe"]', 'Isabelle Laurent')
await page.fill('input[placeholder="+886 912-345-678"]', '+886 987-654-321')
await page.fill('input[placeholder="jane@example.com"]', 'isabelle@example.com')
await wait(400)
await page.click('button:has-text("Confirm Booking"), button:has-text("確認預訂")')
await page.waitForSelector('text=Created!, text=已建立', { timeout: 8000 }).catch(() => {})
const heading = await page.textContent('h2')
const orderNo = heading.match(/(FP-\d+)/)?.[1]
console.log('   Created order', orderNo)
await wait(1200)

console.log('7. QR e-voucher is now visible on the confirmation modal…')
await wait(1500)

console.log('8. Jumping into Control Center to inspect the status audit timeline…')
await page.click('button:has-text("View in Control Center"), button:has-text("在調度中心查看")')
await wait(1200)
const card = page.locator(`[data-testid="order-card"][data-order-no="${orderNo}"]`)
await card.waitFor({ state: 'visible' })
await card.scrollIntoViewIfNeeded()
await wait(600)
const historyToggle = card.locator('[data-testid="status-history"] button').first()
if (await historyToggle.count()) await historyToggle.click()
await wait(1200)

console.log('9. Simulating the routing service being unreachable (synthetic fallback check)…')
await page.evaluate(() => window.__setRoutingOffline?.(true))
await nav('Booking')
await wait(600)
await page.selectOption('select >> nth=1', 'tsa-airport')
await page.selectOption('select >> nth=2', 'jiufen')
await wait(2500)
const badgeFallback = page.locator('[data-testid="route-source-badge"]')
const sourceFallback = await badgeFallback.getAttribute('data-source').catch(() => null)
console.log('   forced-offline route-source-badge data-source =', sourceFallback, '(expect SYNTHETIC)')
await page.evaluate(() => window.__setRoutingOffline?.(false))
await wait(800)

console.log('--- console/page errors:', errors.length, '---')
console.log(errors.slice(0, 20).join('\n'))
console.log('--- OSRM network requests total:', requests.length, '---')

await wait(800)
await browser.close()
