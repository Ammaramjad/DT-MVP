// Smoke test: visits every panel and fails if any console/page errors occur.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/smoke.mjs [port]
import { chromium } from 'playwright'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const routes = ['/', '/booking', '/control', '/driver', '/customer']

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

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
