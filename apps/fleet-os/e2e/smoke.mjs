// Smoke test: visits every panel and fails if any console/page errors occur.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/smoke.mjs [port]
import { chromium } from 'playwright'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const routes = [
  '/',
  '/marketplace',
  '/booking',
  '/control',
  '/fleet-os',
  '/fleet-os/suppliers',
  '/fleet-os/catalog',
  '/fleet-os/campaigns',
  '/fleet-os/support',
  '/fleet-os/refunds',
  '/fleet-os/roster',
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
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
page.on('requestfailed', (req) => errors.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`))

for (const route of routes) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `/tmp/smoke${route.replace(/\//g, '_') || '_home'}.png`, fullPage: false })
  console.log(`Visited ${route}, errors so far: ${errors.length}`)
}

console.log('--- ERRORS ---')
console.log(errors.slice(0, 50).join('\n'))
console.log('--- TOTAL ---', errors.length)

await browser.close()
