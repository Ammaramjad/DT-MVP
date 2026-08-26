// Walkthrough-artifact generator for this round's changes: the two bug fixes
// (vehicle photo cropping + live booking preview), the Control Center
// analytics dashboard, the Uber-style Driver App redesign, and the
// Taiwan-ride-hailing-style Customer App redesign. Produces both static
// screenshots and three short screen-recording videos (webm, converted to
// mp4), written to /opt/cursor/artifacts.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/demo-redesign-tour.mjs [port]
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const OUT = '/opt/cursor/artifacts'
const VIDEO_DIR = '/tmp/pw-redesign-video'
fs.mkdirSync(VIDEO_DIR, { recursive: true })
fs.mkdirSync(OUT, { recursive: true })

const wait = (page, ms) => page.waitForTimeout(ms)

function toMp4(webmPath, mp4Name) {
  const outPath = `${OUT}/${mp4Name}`
  execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${outPath}"`, { stdio: 'ignore' })
  console.log('   -> wrote', outPath)
}

async function withRecordedContext(browser, viewport, fn) {
  const context = await browser.newContext({ viewport, recordVideo: { dir: VIDEO_DIR, size: viewport } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await fn(page)
  const video = page.video()
  await context.close()
  const videoPath = video ? await video.path() : null
  if (errors.length) console.log('   (console/page errors during this segment:', errors.length, ')')
  return videoPath
}

const browser = await chromium.launch()
const viewport = { width: 1440, height: 900 }

// Warm up the Vite dev server's on-demand module compilation for every route
// before recording anything — the *first* visit to a not-yet-requested route
// (e.g. /driver, with its recharts/leaflet-heavy bundle) can take several
// seconds to transform, which would otherwise eat into the short 8-15s
// simulated driver-response window used below.
console.log('Warming up routes…')
{
  const warmupPage = await browser.newPage()
  for (const path of ['/', '/booking', '/control', '/driver', '/customer']) {
    await warmupPage.goto(BASE + path, { waitUntil: 'networkidle' })
  }
  await warmupPage.close()
}

// ---------------------------------------------------------------------------
// Segment 1: Bug fixes — vehicle photo cropping + live booking preview
// ---------------------------------------------------------------------------
console.log('Segment 1: bug fixes (vehicle photo cropping + live preview)…')
const video1 = await withRecordedContext(browser, viewport, async (page) => {
  await page.goto(BASE + '/booking', { waitUntil: 'networkidle' })
  await wait(page, 1000)
  await page.screenshot({ path: `${OUT}/screenshot_v2_booking_preview_sedan.png` })

  for (const type of ['SUV', 'VAN', 'LUXURY', 'MINIBUS', 'SEDAN']) {
    await page.click(`[data-testid="vehicle-card-${type}"]`)
    await wait(page, 900)
    if (type === 'SUV' || type === 'LUXURY') {
      await page.screenshot({ path: `${OUT}/screenshot_v2_booking_preview_${type.toLowerCase()}.png` })
    }
  }

  console.log('  -> Driver App: uncropped vehicle photo on Account tab')
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.click('[data-testid="demo-link-driver"]')
  await wait(page, 800)
  await page.click('[data-testid="driver-tab-account"]')
  await wait(page, 800)
  await page.screenshot({ path: `${OUT}/screenshot_v2_driver_account_vehicle_uncropped.png` })

  console.log('  -> Control Center: uncropped vehicle photos in Fleet Roster')
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.click('[data-testid="demo-link-control"]')
  await wait(page, 800)
  await page.evaluate(() => window.scrollTo({ top: 560, behavior: 'instant' }))
  await wait(page, 300)
  await page.click('text=Fleet Roster')
  await wait(page, 1000)
  await page.screenshot({ path: `${OUT}/screenshot_v2_control_fleet_roster_uncropped.png` })
})
toMp4(video1, 'bugfixes_vehicle_photo_and_live_preview.mp4')

// ---------------------------------------------------------------------------
// Segment 2: Driver App — Uber-style redesign
// ---------------------------------------------------------------------------
console.log('Segment 2: Driver App Uber-style redesign…')
const video2 = await withRecordedContext(browser, viewport, async (page) => {
  // Deliberately stay on just the Driver App page for this whole segment —
  // hopping through the Booking form and Control Center first (as earlier
  // iterations of this script did) piles up enough charts/maps/animation
  // work on this single tab that, under this VM's constrained CPU, a simple
  // click can take 10s of seconds to land — comfortably blowing through the
  // short 8-15s simulated driver-response window and making the incoming-
  // request modal impossible to catch on camera. Driving the same store
  // action (`assignOrder`) directly, on an otherwise-idle page, reproduces
  // the exact same app state deterministically and reliably.
  await page.goto(BASE + '/driver', { waitUntil: 'networkidle' })
  await wait(page, 600)

  console.log('  -> Driver App: online toggle + incoming request modal')
  const assignResult = await page.evaluate(() => {
    const store = window.__fleetStore
    if (!store) return { error: 'no __fleetStore on window (dev-only hook missing)' }
    const s = store.getState()
    const order = s.orders.find((o) => o.status === 'NEW')
    const driver = s.drivers.find((d) => d.status === 'AVAILABLE')
    if (!order || !driver) return { error: 'no NEW order / AVAILABLE driver in seed data' }
    store.getState().toggleDemoNoResponse(order.id)
    store.getState().assignOrder(order.id, driver.id)
    const updated = store.getState().orders.find((o) => o.id === order.id)
    store.getState().setFocusDriver(driver.id)
    return { orderId: order.id, orderNo: order.orderNo, driverId: driver.id, status: updated?.status }
  })
  console.log('     assignResult =', JSON.stringify(assignResult))

  const modalAppeared = await page
    .waitForSelector('[data-testid="incoming-request-modal"]', { timeout: 4000 })
    .then(() => true)
    .catch(() => false)
  console.log('     modal appeared:', modalAppeared)
  await page.screenshot({ path: `${OUT}/screenshot_v2_driver_incoming_request_modal.png` })
  await wait(page, 300)

  const acceptBtn = page.locator('[data-testid="accept-request-button"]')
  if (await acceptBtn.count()) {
    await acceptBtn.click()
    await wait(page, 1200)
  }
  await page.screenshot({ path: `${OUT}/screenshot_v2_driver_trip_in_progress.png` })

  console.log('  -> Driver App: Earnings, Activity, Account tabs')
  await page.click('[data-testid="driver-tab-earnings"]')
  await wait(page, 900)
  await page.screenshot({ path: `${OUT}/screenshot_v2_driver_earnings_screen.png` })
  await page.click('[data-testid="driver-tab-activity"]')
  await wait(page, 700)
  await page.click('[data-testid="driver-tab-account"]')
  await wait(page, 700)
  await page.click('[data-testid="driver-tab-home"]')
  await wait(page, 500)

  console.log('  -> Driver App: front-and-center online/offline availability toggle')
  const onlineToggle = page.locator('[data-testid="driver-online-toggle"]')
  if (await onlineToggle.count()) {
    await onlineToggle.click()
    await wait(page, 600)
    await page.screenshot({ path: `${OUT}/screenshot_v2_driver_offline_toggle.png` })
    await onlineToggle.click()
    await wait(page, 400)
  }
})
toMp4(video2, 'driver_app_uber_style_redesign.mp4')

// ---------------------------------------------------------------------------
// Segment 3: Landing page + Control Center analytics + Customer App
// ---------------------------------------------------------------------------
console.log('Segment 3: landing + Control Center analytics + Customer App…')
const video3 = await withRecordedContext(browser, viewport, async (page) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await wait(page, 1200)
  await page.screenshot({ path: `${OUT}/screenshot_v2_landing_hero.png` })
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }))
  await wait(page, 900)
  await page.screenshot({ path: `${OUT}/screenshot_v2_landing_three_apps_showcase.png` })

  console.log('  -> Control Center: Analytics & Reports (daily/weekly/monthly)')
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.click('[data-testid="demo-link-control"]')
  await wait(page, 1000)
  await page.evaluate(() => window.scrollTo({ top: 560, behavior: 'instant' }))
  await wait(page, 600)
  await page.screenshot({ path: `${OUT}/screenshot_v2_control_analytics_daily.png` })
  await page.click('[data-testid="analytics-granularity-weekly"]')
  await wait(page, 700)
  await page.screenshot({ path: `${OUT}/screenshot_v2_control_analytics_weekly.png` })
  await page.click('[data-testid="analytics-granularity-monthly"]')
  await wait(page, 700)
  await page.screenshot({ path: `${OUT}/screenshot_v2_control_analytics_monthly.png` })

  console.log('  -> Customer App: Home / Activity / Account tabs')
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.click('[data-testid="demo-link-customer"]')
  await wait(page, 800)
  await page.screenshot({ path: `${OUT}/screenshot_v2_customer_home.png` })
  await page.click('[data-testid="customer-tab-activity"]')
  await wait(page, 800)
  await page.screenshot({ path: `${OUT}/screenshot_v2_customer_activity.png` })
  await page.click('[data-testid="customer-tab-account"]')
  await wait(page, 800)
  await page.screenshot({ path: `${OUT}/screenshot_v2_customer_account.png` })

  console.log('  -> Switching to 繁體中文 to confirm the redesign is fully bilingual')
  await page.click('[data-testid="customer-lang-zh"]')
  await wait(page, 800)
  await page.screenshot({ path: `${OUT}/screenshot_v2_customer_account_zh.png` })
  await page.click('[data-testid="customer-tab-home"]')
  await wait(page, 700)
  await page.screenshot({ path: `${OUT}/screenshot_v2_customer_home_zh.png` })
})
toMp4(video3, 'customer_app_and_control_analytics.mp4')

await browser.close()
console.log('Done.')
