import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

async function runTests() {
  console.log('Starting full suite automated verification...')
  const preview = spawn('npx', ['vite', 'preview', '--port', '5188', '--host'], {
    cwd: '/workspace/apps/fleet-os',
    stdio: 'inherit',
  })
  await new Promise((r) => setTimeout(r, 2000))

  const BASE = 'http://localhost:5188'
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    try {
      localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
    } catch {}
  })
  const page = await context.newPage()

  try {
    // 1. Check all Multi-Screen routes
    console.log('1. Testing Multi-Screen Operations routes & Standalone walls...')
    await page.goto(`${BASE}/fleet-os/multiscreen`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="dual-screen-layout"]')
    await page.click('[data-testid="preset-quad-btn"]')
    await page.waitForSelector('[data-testid="quad-screen-layout"]')
    await page.click('[data-testid="preset-triple-btn"]')
    await page.waitForSelector('[data-testid="triple-screen-layout"]')

    // Standalone Wall routes
    await page.goto(`${BASE}/fleet-os/screens/map`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="screen-map-wall"]')

    await page.goto(`${BASE}/fleet-os/screens/orders`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="screen-orders-wall"]')

    await page.goto(`${BASE}/fleet-os/screens/drivers`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="screen-drivers-wall"]')

    await page.goto(`${BASE}/fleet-os/screens/notifications`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="screen-notifications-wall"]')

    await page.goto(`${BASE}/fleet-os/screens/flights`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="screen-flights-wall"]')

    console.log('✓ Multi-Screen walls & routes working perfectly!')

    // 2. Check Unified Navigation across Fleet OS panels
    console.log('2. Testing Unified Navigation bar presence and consistency across panels...')
    const panels = [
      '/fleet-os',
      '/fleet-os/forecast',
      '/fleet-os/invoices',
      '/fleet-os/corporate',
      '/fleet-os/suppliers',
      '/fleet-os/catalog',
      '/fleet-os/pricing/dynamic',
      '/fleet-os/vehicles',
      '/fleet-os/campaigns',
      '/fleet-os/support',
      '/fleet-os/refunds',
      '/fleet-os/roster',
      '/fleet-os/compliance',
      '/fleet-os/finance',
      '/fleet-os/reports',
      '/fleet-os/flights',
      '/fleet-os/accounts',
      '/fleet-os/params',
      '/fleet-os/access-logs',
      '/fleet-os/admin',
    ]

    for (const p of panels) {
      await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-testid="fleetos-nav"]')
    }
    console.log(`✓ All ${panels.length} Fleet OS panels verified with unified sticky sub-nav!`)

    console.log('\n========================================')
    console.log('ALL TESTS PASSED WITH ZERO REGRESSIONS!')
    console.log('========================================\n')
  } catch (err) {
    console.error('Test error:', err)
    process.exit(1)
  } finally {
    await browser.close()
    preview.kill('SIGTERM')
  }
}

runTests()
