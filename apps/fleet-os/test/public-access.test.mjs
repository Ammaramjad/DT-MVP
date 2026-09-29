import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('the deployed app opens without the preview login gate', async () => {
  const app = await source('src/App.tsx')

  assert.doesNotMatch(app, /ClientGatekeeper/)
  assert.doesNotMatch(app, /if \(isLocked\)/)
  assert.match(app, /<UnlockedApp \/>/)
})

test('the public demo switcher does not offer a dead lock action', async () => {
  const switcher = await source('src/components/layout/DemoModeSwitcher.tsx')

  assert.doesNotMatch(switcher, /gatekeeper-lock-system-btn/)
  assert.doesNotMatch(switcher, /\block\(\)/)
})
