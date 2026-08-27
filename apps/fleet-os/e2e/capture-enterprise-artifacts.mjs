import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const PORT = process.argv[2] || process.env.PORT || 5184
const BASE = `http://localhost:${PORT}`
const ARTIFACTS_DIR = '/opt/cursor/artifacts'

async function captureArtifacts() {
  console.log(`Capturing high-resolution enterprise walkthrough artifacts on ${BASE}...`)
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
  }

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    try {
      localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
    } catch {}
  })
  const page = await context.newPage()

  // 1. Landing Page with Guided Presentation Tour Trigger
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_landing_tour_mode.png'), fullPage: false })
  console.log('✓ Captured 01_landing_tour_mode.png')

  // 2. Interactive Demo Tour Floating Dock active on /booking
  await page.click('[data-testid="landing-start-tour-hero-btn"]')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_demo_tour_dock_booking.png'), fullPage: false })
  console.log('✓ Captured 02_demo_tour_dock_booking.png')

  // 3. Multi-Currency Live Converter in Marketplace
  await page.goto(`${BASE}/marketplace`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.click('[data-testid="marketplace-currency-selector-btn"]')
  await page.waitForSelector('[data-testid="currency-option-USD"]')
  await page.click('[data-testid="currency-option-USD"]')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_marketplace_usd_dual_currency.png'), fullPage: false })
  console.log('✓ Captured 03_marketplace_usd_dual_currency.png')

  // 4. AI Predictive Fleet Demand & Weather Forecasting module
  await page.goto(`${BASE}/fleet-os/forecast`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.click('[data-testid="execute-rebalance-btn-reb-1"]')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_fleetos_ai_demand_forecast.png'), fullPage: false })
  console.log('✓ Captured 04_fleetos_ai_demand_forecast.png')

  // 5. Taiwan Electronic Invoice (e-GUI) Center & Thermal Receipt Modal
  await page.goto(`${BASE}/fleet-os/invoices`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.click('[data-testid="view-invoice-modal-btn-inv-tw-202608-001"]')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_taiwan_egui_invoice_proof.png'), fullPage: false })
  console.log('✓ Captured 05_taiwan_egui_invoice_proof.png')

  // 6. Corporate B2B & Group Travel Portal
  await page.goto(`${BASE}/fleet-os/corporate`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_corporate_b2b_travel_portal.png'), fullPage: false })
  console.log('✓ Captured 06_corporate_b2b_travel_portal.png')

  // 7. Customer AI Travel Concierge Assistant Drawer
  await page.goto(`${BASE}/customer`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.click('[data-testid="customer-ai-concierge-btn"]')
  await page.waitForTimeout(600)
  await page.click('[data-testid="quick-prompt-btn-prompt-tpe-meeting-point"]')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_customer_ai_concierge_assistant.png'), fullPage: false })
  console.log('✓ Captured 07_customer_ai_concierge_assistant.png')

  await browser.close()
  console.log('All walkthrough artifacts captured successfully!')
}

captureArtifacts()
