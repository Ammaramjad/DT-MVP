import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export function deployToSurge(distDir = '/workspace/apps/fleet-os/dist', domain = 'fleet-dispatch-demo-8c37.surge.sh') {
  let token = process.env.SURGE_TOKEN

  const netrcPath = join(process.env.HOME || '/home/ubuntu', '.netrc')
  if (existsSync(netrcPath)) {
    const content = readFileSync(netrcPath, 'utf8')
    const match = content.match(/password\s+([a-f0-9]+)/i)
    if (match) {
      token = match[1]
    }
  }

  const args = ['--yes', 'surge', distDir, domain]
  if (token) {
    args.push('--token', token)
  }

  console.log(`Deploying ${distDir} to ${domain}...`)
  const child = spawn('npx', args, { stdio: 'inherit' })

  child.on('exit', (code) => {
    if (code === 0) {
      console.log(`Deployment succeeded: https://${domain}`)
    } else {
      console.error(`Deployment failed with exit code ${code}`)
      process.exit(code || 1)
    }
  })
}

if (process.argv[1].endsWith('deploy-surge.mjs')) {
  deployToSurge()
}
