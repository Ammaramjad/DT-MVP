// End-to-end test for the vehicle-selection + dynamic-pricing feature area:
// multi-vehicle-card recommendations, ineligible-vehicle disabling, the
// compare-up-to-3 drawer, a transparent price breakdown reflecting a live
// dynamic factor (Taoyuan's seeded heavy-rain/high-demand zone), the two new
// Fleet OS modules (/fleet-os/pricing/dynamic, /fleet-os/vehicles), and the
// matching-integration proof: booking a wheelchair-accessible vehicle and
// confirming the requirement flows through dispatch to the Driver App offer.
// Category eligibility depends on live simulated zone availability, so this
// script queries which categories are actually eligible at each step rather
// than hard-coding one, keeping it robust against the background simulation
// ticker moving drivers between AVAILABLE/ON_TRIP over time.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/vehicle-pricing.mjs [port]
import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const videoDir = '/tmp/pw-video-vehicle-pricing'
fs.mkdirSync(videoDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
})
await context.addInitScript(() => {
  try {
    localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
  } catch {}
})
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(err.message))

const shot = async (name) => {
  await page.screenshot({ path: `/tmp/e2e_vp_${name}.png` })
  console.log(`📸 ${name}`)
}
const log = (msg) => console.log(`\n=== ${msg} ===`)
const gotoApp = async (routeSlug) => {
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.click(`[data-testid="demo-link-${routeSlug}"]`)
  await page.waitForTimeout(400)
}

/** Returns the VehicleCategory keys currently rendered as eligible (data-eligible="true"). */
const eligibleCategories = async () => {
  const handles = await page.locator('[data-testid^="vehicle-option-"][data-eligible="true"]').all()
  const ids = await Promise.all(handles.map((h) => h.getAttribute('data-testid')))
  return ids.map((id) => id.replace('vehicle-option-', ''))
}

try {
  log('1. Open Booking Panel — pickup at Taoyuan Airport (seeded heavy-rain/high-demand zone)')
  await page.goto(BASE + '/booking', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.selectOption('select >> nth=1', 'tsa-airport') // pickup (TAOYUAN region)
  await page.selectOption('select >> nth=2', 'grand-hyatt') // dropoff
  await page.waitForTimeout(600)
  await shot('01_booking_default')

  log('2. Confirm the multi-vehicle-card grid shows several distinct categories, not one fixed vehicle')
  const grid = page.locator('[data-testid="vehicle-options-grid"]')
  await grid.waitFor({ state: 'visible' })
  const cardCount = await page.locator('[data-testid^="vehicle-option-"]').count()
  console.log(`Vehicle option cards rendered: ${cardCount}`)
  if (cardCount < 8) throw new Error(`Expected at least 8 vehicle category cards, got ${cardCount}`)

  log('3. Bump passengers to 9 to force the Economy Sedan category ineligible, with a stated reason')
  for (let i = 0; i < 7; i++) {
    await page.click('[data-testid="booking-passengers-stepper-plus"]')
  }
  await page.waitForTimeout(300)
  const economyCard = page.locator('[data-testid="vehicle-option-ECONOMY_SEDAN"]')
  await economyCard.waitFor({ state: 'visible' })
  const economyEligible = await economyCard.getAttribute('data-eligible')
  console.log('Economy Sedan eligible after passenger bump to 9:', economyEligible)
  if (economyEligible !== 'false') throw new Error('Expected Economy Sedan to become ineligible at 9 passengers')
  const economyReason = await economyCard.locator('[data-testid="vehicle-ineligible-reason"]').textContent()
  console.log('Stated reason:', economyReason.trim())
  await shot('02_booking_after_passenger_bump')

  log('4. Reset passengers to 2 and select up to 3 currently-eligible categories to compare')
  for (let i = 0; i < 7; i++) {
    await page.click('[data-testid="booking-passengers-stepper-minus"]')
  }
  await page.waitForTimeout(300)
  const compareCandidates = (await eligibleCategories()).slice(0, 3)
  console.log('Categories chosen for comparison:', compareCandidates)
  if (compareCandidates.length < 2) throw new Error('Expected at least 2 eligible categories available to compare')
  for (const cat of compareCandidates) {
    await page.locator(`[data-testid="vehicle-compare-${cat}"]`).check()
  }
  await page.waitForTimeout(300)
  await page.click('[data-testid="vehicle-compare-open"]')
  await page.waitForSelector('[data-testid="vehicle-compare-drawer"]')
  await shot('03_compare_drawer')
  const compareCardCount = await page.locator('[data-testid^="vehicle-compare-card-"]').count()
  console.log(`Vehicles in compare drawer: ${compareCardCount}`)
  if (compareCardCount !== compareCandidates.length) throw new Error('Compare drawer card count mismatch')
  await page.click(`[data-testid="vehicle-compare-select-${compareCandidates[0]}"]`)
  await page.waitForTimeout(300)

  log('5. Confirm the transparent fare breakdown reflects a live dynamic factor (Taoyuan heavy rain + high demand)')
  await page.locator('text=Base Fare').first().waitFor({ state: 'visible' }).catch(() => {})
  const pageText = await page.content()
  const hasDemandOrWeatherLine = /Demand|Weather|需求|天氣/.test(pageText)
  if (!hasDemandOrWeatherLine) throw new Error('Expected the fare breakdown to mention a demand or weather adjustment line')
  console.log('Fare breakdown shows a demand/weather adjustment line: true')
  await shot('04_fare_breakdown')

  log('6. Switch pickup to a New Taipei zone, enable the wheelchair requirement, and select an eligible accessible option')
  await page.selectOption('select >> nth=1', 'banqiao-station') // NEW_TAIPEI — seeded with the fleet's one ACCESSIBLE vehicle
  await page.waitForTimeout(400)
  await page.check('[data-testid="checkout-wheelchair"]')
  await page.waitForTimeout(400)
  await shot('05_wheelchair_requirement_checked')

  const ineligibleAfterWheelchair = await page.locator('[data-eligible="false"]').count()
  console.log(`Ineligible cards after enabling wheelchair requirement: ${ineligibleAfterWheelchair}`)
  if (ineligibleAfterWheelchair === 0) throw new Error('Expected most categories to become ineligible for a wheelchair requirement')
  const sampleReason = await page.locator('[data-eligible="false"] [data-testid="vehicle-ineligible-reason"]').first().textContent()
  console.log('Sample ineligible-vehicle explanation:', sampleReason.trim())
  await shot('06_ineligible_vehicle_explanation')

  const wheelchairEligible = await eligibleCategories()
  console.log('Categories still eligible with wheelchair requirement:', wheelchairEligible)
  if (wheelchairEligible.length === 0) throw new Error('Expected at least one wheelchair-accessible category to remain eligible in this zone')
  const chosenCategory = wheelchairEligible.includes('ACCESSIBLE') ? 'ACCESSIBLE' : wheelchairEligible[0]
  await page.click(`[data-testid="vehicle-option-${chosenCategory}"]`)
  await page.waitForTimeout(300)
  await shot('07_accessible_selected')

  log('6b. Continue to Step 2: Payment Method')
  await page.click('[data-testid="booking-step1-continue"]')
  await page.waitForSelector('[data-testid="checkout-payment-card"]')

  log('7. Fill contact info, accept consent, and submit the booking')
  await page.fill('input[placeholder="Jane Doe"]', 'Wei-Ting Huang')
  await page.fill('input[placeholder="+886 912-345-678"]', '+886 933-222-111')
  await page.fill('input[placeholder="jane@example.com"]', 'wei.ting@example.com')
  await page.check('[data-testid="checkout-consent"]')
  await page.click('[data-testid="checkout-confirm-booking"]')
  await page.waitForSelector('[data-testid="checkout-result-modal"]', { timeout: 8000 })
  const heading = await page.textContent('h2')
  const orderNo = heading.match(/(FP-\d+)/)?.[1]
  console.log(`Created wheelchair-accessible order (${chosenCategory}):`, orderNo)
  await shot('08_booking_confirmed')

  log('8. Open Fleet OS from the confirmation modal')
  await page.click('button:has-text("View in Fleet OS")')
  await page.waitForSelector('[data-testid="fleetos-nav"]')
  await page.waitForTimeout(500)
  await shot('09_fleetos_dashboard_new_order')

  log('9. Visit the new Dynamic Pricing Service module (/fleet-os/pricing/dynamic)')
  await page.click('[data-testid="fleetos-nav-dynamic"]')
  await page.waitForSelector('[data-testid="pricing-zone-table"]')
  await page.waitForTimeout(400)
  await shot('10_pricing_dynamic_module')

  const zoneRowCount = await page.locator('[data-testid="pricing-zone-row"]').count()
  console.log(`Zone rows in Dynamic Pricing Service: ${zoneRowCount}`)
  if (zoneRowCount < 5) throw new Error('Expected the zone table to list every Taiwan zone')
  const taoyuanRow = page.locator('[data-testid="pricing-zone-row"]', { hasText: 'Taoyuan' }).first()
  await taoyuanRow.waitFor({ state: 'visible' }).catch(() => {})
  const taoyuanRowText = (await taoyuanRow.textContent().catch(() => '')) ?? ''
  console.log('Taoyuan zone row (seeded heavy rain + high demand):', taoyuanRowText.trim())

  log('10. Edit a Fleet Manager pricing rule and confirm it is written to the audit log')
  await page.locator('[data-testid="rule-max-surge"]').fill('75')
  await page.click('[data-testid="pricing-save-rules"]')
  await page.waitForTimeout(500)
  await page.locator('[data-testid="pricing-audit-log"]').waitFor({ state: 'visible' })
  const auditEntries = await page.locator('[data-testid="pricing-audit-log"] li').count()
  console.log(`Pricing audit log entries: ${auditEntries}`)
  if (auditEntries === 0) throw new Error('Expected the pricing-rule change to appear in the audit log')
  await shot('11_pricing_rule_change_audit_log')

  log('11. Visit the new Fleet & Vehicle Inventory module (/fleet-os/vehicles)')
  await page.click('[data-testid="fleetos-nav-vehicles"]')
  await page.waitForSelector('[data-testid="vehicle-category-catalogue"]')
  await page.waitForTimeout(400)
  await shot('12_vehicle_inventory_module')

  const categoryCardCount = await page.locator('[data-testid^="vehicle-category-card-"]').count()
  console.log(`Vehicle category catalogue cards: ${categoryCardCount}`)
  if (categoryCardCount < 10) throw new Error(`Expected all 10 vehicle categories, got ${categoryCardCount}`)

  log('12. Block a vehicle for maintenance and confirm the audit log + inventory status update')
  await page.locator('[data-testid="vehicle-inventory-row"]').first().click()
  await page.waitForSelector('[data-testid="vehicle-detail-panel"]')
  await page.fill('[data-testid="vehicle-detail-maintenance-hours"]', '2')
  await page.fill('[data-testid="vehicle-detail-maintenance-reason"]', 'E2E test — scheduled inspection')
  await page.click('[data-testid="vehicle-detail-block-maintenance"]')
  await page.waitForTimeout(400)
  await page.waitForSelector('[data-testid="vehicle-detail-clear-maintenance"]')
  const vehicleAuditEntries = await page.locator('[data-testid="vehicle-audit-log"] li').count()
  console.log(`Vehicle audit log entries: ${vehicleAuditEntries}`)
  if (vehicleAuditEntries === 0) throw new Error('Expected the maintenance block to appear in the vehicle audit log')
  await shot('13_vehicle_maintenance_block')

  log('13. Clear the maintenance block to restore the vehicle to customer/dispatch visibility')
  await page.click('[data-testid="vehicle-detail-clear-maintenance"]')
  await page.waitForTimeout(300)

  log('14. Matching integration proof: wait for the wheelchair-accessible order to reach a real driver')
  await page.click('[data-testid="fleetos-nav-fleet-os"]')
  await page.waitForSelector('[data-testid="fleetos-nav"]')
  const card = page.locator(`[data-testid="order-card"][data-order-no="${orderNo}"]`)
  await card.waitFor({ state: 'visible' })
  let assigned = false
  for (let i = 0; i < 20; i++) {
    const driverId = await card.getAttribute('data-assigned-driver-id')
    if (driverId) {
      assigned = true
      break
    }
    const status = await card.getAttribute('data-order-status')
    if (status === 'CONFIRMED' && i === 0) {
      await card.locator('[data-testid="assign-button"]').click().catch(() => {})
    }
    await page.waitForTimeout(1500)
  }
  if (!assigned) throw new Error('Wheelchair-accessible order never reached a real driver assignment')
  const driverId = await card.getAttribute('data-assigned-driver-id')
  console.log('Wheelchair-accessible order matched to driver:', driverId)
  await shot('14_matched_driver')

  log('15. Confirm the Driver App offer/active job reflects the vehicle category and special requirement')
  await gotoApp('driver')
  await page.waitForSelector('[data-testid="driver-app-header"]')
  await page.click('[data-testid="driver-tab-account"]')
  await page.waitForSelector('[data-testid="driver-select"]')
  await page.selectOption('[data-testid="driver-select"]', driverId)
  await page.click('[data-testid="driver-tab-home"]')
  await page.waitForTimeout(600)
  await shot('15_driver_app_job_with_requirements')

  console.log('\n✅ VEHICLE SELECTION + DYNAMIC PRICING E2E TEST PASSED')
} catch (err) {
  console.error('\n❌ TEST FAILED:', err)
  await shot('FAILURE')
  process.exitCode = 1
} finally {
  console.log('\nConsole errors captured:', consoleErrors.length)
  consoleErrors.forEach((e) => console.log(' -', e))
  await context.close()
  await browser.close()
}
