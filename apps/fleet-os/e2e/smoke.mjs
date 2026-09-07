// Smoke test: visits every panel and fails if any console/page errors occur.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/smoke.mjs [port]
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const routes = [
  '/',
  '/marketplace',
  '/booking',
  '/control',
  '/fleet-os',
  '/fleet-os/multiscreen',
  '/fleet-os/suppliers',
  '/fleet-os/catalog',
  '/fleet-os/campaigns',
  '/fleet-os/support',
  '/fleet-os/refunds',
  '/fleet-os/reviews',
  '/fleet-os/subscriptions',
  '/fleet-os/lost-found',
  '/fleet-os/customers',
  '/fleet-os/roster',
  '/fleet-os/drivers',
  '/fleet-os/compliance',
  '/fleet-os/finance',
  '/fleet-os/pricing/dynamic',
  '/fleet-os/vehicles',
  '/fleet-os/reports',
  '/fleet-os/manual-order',
  '/fleet-os/translation-qa',
  '/fleet-os/flights',
  '/fleet-os/forecast',
  '/fleet-os/invoices',
  '/fleet-os/corporate',
  '/fleet-os/accounts',
  '/fleet-os/params',
  '/fleet-os/access-logs',
  '/fleet-os/admin',
  '/driver',
  '/customer',
]

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host'], {
  cwd: '/workspace/apps/fleet-os',
  stdio: 'ignore',
})

await new Promise((r) => setTimeout(r, 2500))

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addInitScript(() => {
  try {
    localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
  } catch {}
})
const page = await context.newPage()

const errors = []
page.on('console', (msg) => {
  const text = msg.text()
  // Ignore external tile and geo-api rate-limit/CORS warnings in isolated sandbox
  if (
    msg.type() === 'error' &&
    !text.includes('ipapi') &&
    !text.includes('ipify') &&
    !text.includes('tile.openstreetmap') &&
    !text.includes('Failed to load resource: net::ERR_FAILED') &&
    !text.includes('Failed to load resource: net::ERR_ABORTED') &&
    !text.includes('status of 429')
  ) {
    errors.push(`[console] ${text}`)
  }
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
page.on('requestfailed', (req) => {
  const url = req.url()
  // Ignore external tile & IP lookup aborts
  if (!url.includes('ipapi.co') && !url.includes('api.ipify.org') && !url.includes('tile.openstreetmap.org')) {
    errors.push(`[requestfailed] ${url} ${req.failure()?.errorText}`)
  }
})

for (const route of routes) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `/tmp/smoke${route.replace(/\//g, '_') || '_home'}.png`, fullPage: false })
  console.log(`Visited ${route}, errors so far: ${errors.length}`)
}

console.log('--- ERRORS ---')
console.log(errors.slice(0, 50).join('\n'))
console.log('--- TOTAL ---', errors.length)

await browser.close()
preview.kill()

if (errors.length > 0) {
  process.exit(1)
}
