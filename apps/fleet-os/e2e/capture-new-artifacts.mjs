import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const ARTIFACTS_DIR = '/opt/cursor/artifacts'
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

async function captureWalkthroughArtifacts() {
  console.log(`Capturing walkthrough artifacts on ${BASE}...`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  await context.addInitScript(() => {
    try {
      localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
      localStorage.setItem('fleet_lang', 'zh')
    } catch {}
  })

  const page = await context.newPage()

  // 1. Capture Multi-Screen Command Wall (Dual layout)
  await page.goto(`${BASE}/fleet-os/multiscreen`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${ARTIFACTS_DIR}/multiscreen_dual_command_wall.png`, fullPage: false })
  console.log('✓ Captured multiscreen_dual_command_wall.png')

  // 2. Capture Multi-Screen Command Wall (Quad layout)
  await page.click('[data-testid="preset-quad-btn"]')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${ARTIFACTS_DIR}/multiscreen_quad_command_wall.png`, fullPage: false })
  console.log('✓ Captured multiscreen_quad_command_wall.png')

  // 3. Capture Add Driver Modal in Roster Panel
  await page.goto(`${BASE}/fleet-os/roster`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.click('[data-testid="open-add-driver-modal-btn"]')
  await page.waitForSelector('[data-testid="add-driver-modal"]')
  await page.fill('[data-testid="add-driver-namezh-input"]', '張冠宇')
  await page.fill('[data-testid="add-driver-name-input"]', 'Kuan-Yu Chang')
  await page.screenshot({ path: `${ARTIFACTS_DIR}/driver_onboarding_add_driver_modal.png`, fullPage: false })
  console.log('✓ Captured driver_onboarding_add_driver_modal.png')
  await page.click('[data-testid="close-add-driver-modal"]')

  // 4. Capture Multi-Stop Booking Itinerary in Customer Booking Panel
  await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.fill('[data-testid="booking-waypoint-input"]', '板橋車站 (接送朋友同行)')
  await page.click('[data-testid="booking-waypoint-add"]')
  await page.waitForSelector('[data-testid="booking-waypoint-list"]')
  await page.screenshot({ path: `${ARTIFACTS_DIR}/customer_multi_stop_booking.png`, fullPage: false })
  console.log('✓ Captured customer_multi_stop_booking.png')

  // 5. Capture Driver App Fatigue Tracker & Instant Cashout Modal
  await page.goto(`${BASE}/driver`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${ARTIFACTS_DIR}/driver_cockpit_fatigue_inspection.png`, fullPage: false })
  console.log('✓ Captured driver_cockpit_fatigue_inspection.png')

  await page.click('[data-testid="driver-tab-earnings"]')
  await page.waitForSelector('[data-testid="instant-cashout-trigger-btn"]')
  await page.click('[data-testid="instant-cashout-trigger-btn"]')
  await page.waitForSelector('[data-testid="instant-cashout-modal"]')
  await page.screenshot({ path: `${ARTIFACTS_DIR}/driver_fatigue_and_instant_cashout.png`, fullPage: false })
  console.log('✓ Captured driver_fatigue_and_instant_cashout.png')

  await browser.close()
  console.log('All walkthrough artifacts captured successfully!')
}

captureWalkthroughArtifacts()
