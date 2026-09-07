import { chromium } from 'playwright'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const ARTIFACTS_DIR = '/opt/cursor/artifacts'
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

async function captureDynamicArtifacts() {
  console.log('Starting preview server for dynamic features artifact capture...')

  const preview = spawn('npx', ['vite', 'preview', '--port', '5196', '--host'], {
    cwd: '/workspace/apps/fleet-os',
    stdio: 'ignore',
  })

  await new Promise((r) => setTimeout(r, 2500))

  const browser = await chromium.launch({ headless: true })
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const mobileContext = await browser.newContext({ viewport: { width: 412, height: 890 } })

  await desktopContext.addInitScript(() => {
    try {
      localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
      localStorage.setItem('fleet_lang', 'zh')
    } catch {}
  })

  await mobileContext.addInitScript(() => {
    try {
      localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
      localStorage.setItem('fleet_lang', 'zh')
    } catch {}
  })

  const BASE = 'http://localhost:5196'

  try {
    const page = await desktopContext.newPage()

    // 1. Artifact: Interactive 30-Day Capacity Forecast & Day Breakdown Modal
    console.log('Capturing interactive 30-Day Capacity Forecast modal...')
    await page.goto(`${BASE}/fleet-os/reports`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const datePill = page.locator('[data-testid^="capacity-pill-"]').nth(6)
    await datePill.click()
    await page.waitForTimeout(600)
    await page.waitForSelector('[data-testid="day-capacity-modal"]', { state: 'visible' })
    await page.screenshot({ path: `${ARTIFACTS_DIR}/day_capacity_breakdown_modal.png` })
    console.log('✓ Saved /opt/cursor/artifacts/day_capacity_breakdown_modal.png')

    // Close modal
    await page.click('[data-testid="close-day-capacity-modal"]')
    await page.waitForTimeout(500)

    // 2. Artifact: Hourly Volume Chart Breakdown
    console.log('Capturing hourly volume chart 1-hour breakdown...')
    const hourlyBar = page.locator('[data-testid^="hourly-bar-"]').nth(15)
    await hourlyBar.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/hourly_volume_breakdown_chart.png` })
    console.log('✓ Saved /opt/cursor/artifacts/hourly_volume_breakdown_chart.png')

    // 3. Artifact: Driver Hub Clickable KPI Cards Active State
    console.log('Capturing Driver Hub clickable KPI cards...')
    await page.goto(`${BASE}/fleet-os/roster`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    await page.click('[data-testid="kpi-filter-available"]')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/driver_hub_kpi_filter_active.png` })
    console.log('✓ Saved /opt/cursor/artifacts/driver_hub_kpi_filter_active.png')

    // 4. Artifact: Dispatcher Future Orders Pipeline & Channel Horizon
    console.log('Capturing Dispatcher Future Orders Pipeline...')
    await page.goto(`${BASE}/fleet-os/dispatch`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    await page.click('[data-testid="dispatch-horizon-filter-tomorrow"]')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/future_orders_pipeline_dispatch.png` })
    console.log('✓ Saved /opt/cursor/artifacts/future_orders_pipeline_dispatch.png')

    // 5. Artifact: Driver App Upcoming Scheduled Trips
    console.log('Capturing Driver App upcoming scheduled trips (Mobile)...')
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(`${BASE}/driver`, { waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(1000)

    const futureTripsBanner = mobilePage.locator('[data-testid="driver-home-future-trips-banner"]')
    await futureTripsBanner.click()
    await mobilePage.waitForTimeout(800)
    await mobilePage.screenshot({ path: `${ARTIFACTS_DIR}/driver_app_upcoming_trips.png` })
    console.log('✓ Saved /opt/cursor/artifacts/driver_app_upcoming_trips.png')

    console.log('\nAll dynamic artifacts captured successfully!')
  } catch (err) {
    console.error('Artifact capture error:', err)
  } finally {
    await browser.close()
    preview.kill()
  }
}

captureDynamicArtifacts()
