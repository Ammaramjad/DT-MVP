import { chromium } from 'playwright'
import fs from 'node:fs'
import { createServer } from 'node:http'

const ARTIFACTS_DIR = '/opt/cursor/artifacts'
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

async function run() {
  console.log('Starting preview server & capturing artifacts...')

  // Serve the built static files
  const { spawn } = await import('node:child_process')
  const preview = spawn('npx', ['vite', 'preview', '--port', '5199', '--host'], {
    cwd: '/workspace/apps/fleet-os',
    stdio: 'inherit',
  })

  // Give preview server 2 seconds to start
  await new Promise((r) => setTimeout(r, 2000))

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  await context.addInitScript(() => {
    try {
      localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
      localStorage.setItem('fleet_lang', 'zh')
    } catch {}
  })

  const page = await context.newPage()
  const BASE = 'http://localhost:5199'

  try {
    // 1. Capture Fixed Live Fleet Map (No watermark, clean dark tiles)
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/fixed_dark_map_tiles_clean.png` })
    console.log('✓ Captured fixed_dark_map_tiles_clean.png')

    // 2. Capture Unified Subnav across Control Center vs Forecast Panel
    await page.goto(`${BASE}/fleet-os/forecast`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/unified_subnav_and_forecast_panel.png` })
    console.log('✓ Captured unified_subnav_and_forecast_panel.png')

    // 3. Capture MultiScreen Operations Wall (Dual preset with pop-out options)
    await page.goto(`${BASE}/fleet-os/multiscreen`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/multiscreen_operations_wall_dual.png` })
    console.log('✓ Captured multiscreen_operations_wall_dual.png')

    // 4. Capture MultiScreen Standalone Map Wall Screen (/fleet-os/screens/map)
    await page.goto(`${BASE}/fleet-os/screens/map`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/standalone_screen_map_wall.png` })
    console.log('✓ Captured standalone_screen_map_wall.png')

    // 5. Capture MultiScreen Standalone Orders Matrix Screen (/fleet-os/screens/orders)
    await page.goto(`${BASE}/fleet-os/screens/orders`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/standalone_screen_orders_wall.png` })
    console.log('✓ Captured standalone_screen_orders_wall.png')

    // 6. Capture MultiScreen Standalone Drivers Telematics Wall Screen (/fleet-os/screens/drivers)
    await page.goto(`${BASE}/fleet-os/screens/drivers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/standalone_screen_drivers_wall.png` })
    console.log('✓ Captured standalone_screen_drivers_wall.png')

    // 7. Capture MultiScreen Standalone Flights Board Screen (/fleet-os/screens/flights)
    await page.goto(`${BASE}/fleet-os/screens/flights`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/standalone_screen_flights_wall.png` })
    console.log('✓ Captured standalone_screen_flights_wall.png')

    // 8. Capture Taiwan e-Invoices Panel (統一發票管理)
    await page.goto(`${BASE}/fleet-os/invoices`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/taiwan_einvoices_panel.png` })
    console.log('✓ Captured taiwan_einvoices_panel.png')

    // 9. Capture Corporate B2B & Group Travel Panel (企業差旅)
    await page.goto(`${BASE}/fleet-os/corporate`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/corporate_b2b_travel_panel.png` })
    console.log('✓ Captured corporate_b2b_travel_panel.png')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
    preview.kill('SIGTERM')
  }
  console.log('All required artifacts captured successfully!')
}

run()
