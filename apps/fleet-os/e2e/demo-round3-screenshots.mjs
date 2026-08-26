// Headless screenshot tour of this round's new/expanded surfaces: the
// Marketplace OTA-style search, the new Fleet OS modules (Suppliers,
// Campaigns, Refunds, Driver Compliance), the expanded Customer App (Trips
// tabs, Safety, Account/Loyalty), and the expanded Driver App (Availability,
// Earnings breakdown, Profile & Compliance). Writes PNGs to OUT below.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/demo-round3-screenshots.mjs [port]
import { chromium } from 'playwright'

const PORT = process.argv[2] || 5183
const BASE = `http://localhost:${PORT}`
// Write to a local tmp dir first — the /opt/cursor/artifacts mount has shown
// intermittent EIO errors under Playwright's direct screenshot writes.
const OUT = '/tmp/demo-round3-screenshots'
import fs from 'node:fs'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
const wait = (ms) => page.waitForTimeout(ms)
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('📸', name)
}

console.log('Marketplace — OTA-style search with source badges…')
await page.goto(BASE + '/marketplace', { waitUntil: 'networkidle' })
await wait(1200)
await shot('screenshot_marketplace_search_source_badges')
await page.click('[data-testid="marketplace-view-detail"]')
await wait(500)
await shot('screenshot_marketplace_product_detail_modal')
await page.keyboard.press('Escape').catch(() => {})

console.log('Fleet OS — Suppliers module…')
await page.goto(BASE + '/fleet-os/suppliers', { waitUntil: 'networkidle' })
await wait(800)
await page.click('[data-testid="supplier-row"]')
await wait(400)
await shot('screenshot_fleetos_suppliers_module')

console.log('Fleet OS — Campaigns & Coupons module…')
await page.goto(BASE + '/fleet-os/campaigns', { waitUntil: 'networkidle' })
await wait(800)
await shot('screenshot_fleetos_campaigns_module')

console.log('Fleet OS — Refunds queue…')
await page.goto(BASE + '/fleet-os/refunds', { waitUntil: 'networkidle' })
await wait(800)
await shot('screenshot_fleetos_refunds_queue')

console.log('Fleet OS — Driver Compliance module…')
await page.goto(BASE + '/fleet-os/compliance', { waitUntil: 'networkidle' })
await wait(800)
await shot('screenshot_fleetos_driver_compliance_module')

console.log('Customer App — Trips tab (Upcoming/Active/Completed/Cancelled/Refund)…')
await page.goto(BASE + '/customer', { waitUntil: 'networkidle' })
await wait(800)
await page.click('[data-testid="customer-tab-trips"]')
await wait(500)
await shot('screenshot_customer_trips_tabs')
await page.click('[data-testid="trips-filter-completed"]')
await wait(400)
await shot('screenshot_customer_trips_completed_receipts')

console.log('Customer App — Safety tab…')
await page.click('[data-testid="customer-tab-safety"]')
await wait(500)
await shot('screenshot_customer_safety_screen')

console.log('Customer App — Account/Loyalty (passengers, payments, privacy)…')
await page.click('[data-testid="customer-tab-account"]')
await wait(500)
await shot('screenshot_customer_account_loyalty_privacy')

console.log('Driver App — Home/Availability card…')
await page.goto(BASE + '/driver', { waitUntil: 'networkidle' })
await wait(800)
await shot('screenshot_driver_availability_card')

console.log('Driver App — Earnings breakdown…')
await page.click('[data-testid="driver-tab-earnings"]')
await wait(700)
await shot('screenshot_driver_earnings_breakdown')

console.log('Driver App — Profile & Compliance (document center)…')
await page.click('[data-testid="driver-tab-account"]')
await wait(700)
await shot('screenshot_driver_profile_compliance_documents')

console.log('Done.')
await browser.close()
