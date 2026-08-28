// Comprehensive Walkthrough-Artifact Generator for the Ultra-Premium Visual Overhaul:
// 1. Landing Page Showcase with 3D Cyber showroom platform & 4-surface glass tiles
// 2. Cyber-Cartography: CartoDB Dark Matter map with pulsing vehicle markers & neon animated routes
// 3. Driver Cockpit & HUD: Radar pulse incoming request, high-vis navigation, luminous earnings
// 4. Customer App: Luxury dark glass cards, live tracking ETA ring, fluid tab bar
// 5. Fleet OS Command Center & Emergency Rescue banner
// Produces high-resolution screenshots and video demo artifacts in /opt/cursor/artifacts

import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const OUT = '/opt/cursor/artifacts'
const VIDEO_DIR = '/tmp/pw-overhaul-video'
fs.mkdirSync(VIDEO_DIR, { recursive: true })
fs.mkdirSync(OUT, { recursive: true })

const wait = (page, ms) => page.waitForTimeout(ms)

function toMp4(webmPath, mp4Name) {
  const outPath = `${OUT}/${mp4Name}`
  try {
    execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${outPath}"`, { stdio: 'ignore' })
    console.log('   -> wrote', outPath)
  } catch (err) {
    console.error('   -> ffmpeg conversion failed:', err.message)
  }
}

async function withRecordedContext(browser, viewport, fn) {
  const context = await browser.newContext({ viewport, recordVideo: { dir: VIDEO_DIR, size: viewport } })
  await context.addInitScript(() => {
    try {
      localStorage.setItem('fleet_preview_auth_token', 'vip_preview_auth_token_2026')
    } catch {}
  })
  const page = await context.newPage()
  await fn(page)
  const video = page.video()
  await context.close()
  const videoPath = video ? await video.path() : null
  return videoPath
}

const browser = await chromium.launch()
const viewport = { width: 1440, height: 900 }

console.log('Recording Ultra-Premium Design System Overhaul Artifacts…')

const video1 = await withRecordedContext(browser, viewport, async (page) => {
  console.log('1. Capturing Landing Page with 3D Cyber Showroom Platform…')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await wait(page, 2000)
  await page.screenshot({ path: `${OUT}/screenshot_overhaul_01_landing_hero.png` })

  await page.evaluate(() => window.scrollTo({ top: 650, behavior: 'smooth' }))
  await wait(page, 1500)
  await page.screenshot({ path: `${OUT}/screenshot_overhaul_02_landing_showcase_cards.png` })

  console.log('2. Capturing Luxury Marketplace & Dynamic Filters…')
  await page.goto(BASE + '/marketplace', { waitUntil: 'networkidle' })
  await wait(page, 1500)
  await page.screenshot({ path: `${OUT}/screenshot_overhaul_03_marketplace_glass.png` })

  console.log('3. Capturing Luxury Customer App…')
  await page.goto(BASE + '/customer', { waitUntil: 'networkidle' })
  await wait(page, 1500)
  await page.screenshot({ path: `${OUT}/screenshot_overhaul_04_customer_home.png` })
  
  await page.click('[data-testid="customer-tab-trips"]')
  await wait(page, 1500)
  await page.screenshot({ path: `${OUT}/screenshot_overhaul_05_customer_live_tracking.png` })

  console.log('4. Capturing Driver Cockpit & HUD…')
  await page.goto(BASE + '/driver', { waitUntil: 'networkidle' })
  await wait(page, 1500)
  await page.screenshot({ path: `${OUT}/screenshot_overhaul_06_driver_cockpit_home.png` })

  await page.click('[data-testid="driver-tab-earnings"]')
  await wait(page, 1500)
  await page.screenshot({ path: `${OUT}/screenshot_overhaul_07_driver_earnings_charts.png` })

  console.log('5. Capturing Fleet OS Command Center & Cyber Cartography Map…')
  await page.goto(BASE + '/fleet-os', { waitUntil: 'networkidle' })
  await wait(page, 2000)
  await page.screenshot({ path: `${OUT}/screenshot_overhaul_08_command_center_map.png` })

  console.log('6. Capturing Dynamic Pricing Service & Vehicle Inventory…')
  await page.goto(BASE + '/fleet-os/pricing/dynamic', { waitUntil: 'networkidle' })
  await wait(page, 1500)
  await page.screenshot({ path: `${OUT}/screenshot_overhaul_09_dynamic_pricing_rules.png` })

  await page.goto(BASE + '/fleet-os/vehicles', { waitUntil: 'networkidle' })
  await wait(page, 1500)
  await page.screenshot({ path: `${OUT}/screenshot_overhaul_10_vehicle_inventory_matrix.png` })
})

if (video1) {
  toMp4(video1, 'fleet_os_ultra_premium_design_overhaul.mp4')
}

await browser.close()
console.log('Artifacts generated successfully.')
