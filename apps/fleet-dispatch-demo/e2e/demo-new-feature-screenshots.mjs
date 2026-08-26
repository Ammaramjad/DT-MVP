// Captures static screenshots (headless) of this round's key new UI surfaces:
// the vehicle catalog cards in the Booking panel, the Chinese-language
// Control Center, the QR-code e-voucher, and the status audit timeline.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/demo-new-feature-screenshots.mjs [port]
import { chromium } from 'playwright'

const PORT = process.argv[2] || 5183
const BASE = `http://localhost:${PORT}`
const OUT = '/opt/cursor/artifacts'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
const wait = (ms) => page.waitForTimeout(ms)
const nav = async (label) => {
  await page.getByRole('link', { name: label, exact: false }).first().click()
  await wait(700)
}

console.log('1. Booking panel — vehicle catalog cards (EN)…')
await page.goto(BASE + '/booking', { waitUntil: 'networkidle' })
await wait(1200)
await page.locator('[data-testid="vehicle-card-SUV"]').click()
await wait(400)
await page.screenshot({ path: `${OUT}/screenshot_booking_vehicle_catalog_cards.png` })

console.log('2. Switching to 繁體中文, Control Center dashboard…')
await page.locator('[data-testid="lang-option-zh"]').click()
await wait(800)
await nav('調度中心')
await wait(1500)
await page.screenshot({ path: `${OUT}/screenshot_control_center_chinese.png` })

console.log('3. Chinese Fleet Roster tab (vehicle cards)…')
await page.evaluate(() => window.scrollTo({ top: 560, behavior: 'instant' }))
await wait(500)
await page.click('text=車隊名冊')
await wait(1200)
await page.screenshot({ path: `${OUT}/screenshot_fleet_roster_vehicle_cards_chinese.png` })

console.log('4. Booking a ride to capture the QR e-voucher (English)…')
await page.locator('[data-testid="lang-option-en"]').click()
await wait(600)
await nav('Booking')
await wait(1000)
await page.selectOption('select >> nth=1', 'tpe-airport')
await page.selectOption('select >> nth=2', 'grand-hyatt')
await page.locator('[data-testid="vehicle-card-LUXURY"]').click()
await wait(400)
await page.fill('input[placeholder="Jane Doe"]', 'Marco Chen')
await page.fill('input[placeholder="+886 912-345-678"]', '+886 933-111-222')
await page.fill('input[placeholder="jane@example.com"]', 'marco@example.com')
await wait(400)
await page.click('button:has-text("Confirm Booking")')
await page.waitForSelector('text=Created!')
await wait(1200)
await page.screenshot({ path: `${OUT}/screenshot_qr_evoucher.png` })

console.log('5. Status audit timeline in Control Center…')
const heading = await page.textContent('h2')
const orderNo = heading.match(/(FP-\d+)/)?.[1]
await page.click('button:has-text("View in Control Center")')
await wait(1000)
const card = page.locator(`[data-testid="order-card"][data-order-no="${orderNo}"]`)
await card.waitFor({ state: 'visible' })
await card.scrollIntoViewIfNeeded()
const historyToggle = card.locator('[data-testid="status-history"] button').first()
await historyToggle.click()
await wait(800)
await card.scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/screenshot_status_audit_timeline.png` })

console.log('Done.')
await browser.close()
