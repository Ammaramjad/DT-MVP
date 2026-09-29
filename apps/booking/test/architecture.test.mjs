import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('booking exposes all nine deterministic chapters', async () => {
  const steps = await source('src/features/booking/bookingSteps.ts')
  for (const label of ['Service','Pickup','Destination','Date & time','Passengers & luggage','Vehicle class','Vehicle model','Options','Review']) assert.match(steps, new RegExp(`['\"]${label.replace('&','\\&')}`))
})

test('route registry contains ten genuinely named world variants', async () => {
  const routes = await source('src/routes/routeWorlds.ts')
  const variants = ['airport-arterial','downtown-grid','business-boulevard','station-district','residential-city','waterfront','expressway-connector','hotel-executive','technology-district','suburban-connector']
  for (const variant of variants) assert.match(routes, new RegExp(variant))
  assert.equal((routes.match(/geometry: \[/g) ?? []).length, 10)
})

test('navigation anchors resolve to sections rendered by the shell', async () => {
  const nav = await source('src/components/GlobalNavigation.tsx')
  const shell = await source('src/app/AppShell.tsx')
  const component = { book: 'BookingExperience', services: 'ServiceExplorer', business: 'BusinessExperience', about: 'AboutExperience' }
  for (const id of ['book','services','business','about']) {
    assert.match(nav, new RegExp(`['\"]${id}['\"]`))
    assert.match(shell, new RegExp(component[id]))
  }
})

test('vehicle registry models capacity and asset provenance for every class', async () => {
  const registry = await source('src/vehicles/vehicleRegistry.ts')
  for (const id of ['economy','comfort','business','premium','seven','van']) assert.match(registry, new RegExp(`${id}: \\{`))
  assert.match(registry, /productionStatus:'procedural-fallback'/)
  assert.match(registry, /incompatibilityReason/)
})
