import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = '/workspace'
const appDir = join(repoRoot, 'apps/fleet-os')
const distDir = join(appDir, 'dist')
const basePath = process.env.VITE_BASE_PATH || '/DT-MVP/'
const ghPagesDir = join(repoRoot, '.gh-pages-worktree')

function run(cmd, args, opts = {}) {
  const capture = opts.encoding === 'utf8'
  const result = spawnSync(cmd, args, {
    stdio: capture ? 'pipe' : 'inherit',
    cwd: opts.cwd || appDir,
    env: { ...process.env, ...opts.env },
    encoding: opts.encoding,
  })
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
  return result
}

function originUrl() {
  return run('git', ['remote', 'get-url', 'origin'], { cwd: repoRoot, encoding: 'utf8' }).stdout.trim()
}

console.log(`Building fleet-os for GitHub Pages (base=${basePath})...`)
run('npm', ['run', 'build'], { env: { VITE_BASE_PATH: basePath } })

writeFileSync(join(distDir, '.nojekyll'), '')
cpSync(join(distDir, 'index.html'), join(distDir, '404.html'))
rmSync(join(distDir, 'CNAME'), { force: true })

rmSync(ghPagesDir, { recursive: true, force: true })
mkdirSync(ghPagesDir, { recursive: true })

const remote = originUrl()
const branchExists = spawnSync('git', ['ls-remote', '--heads', remote, 'gh-pages'], {
  cwd: repoRoot,
  encoding: 'utf8',
})

if (branchExists.stdout.trim()) {
  run('git', ['clone', '--depth', '1', '--branch', 'gh-pages', remote, ghPagesDir], { cwd: repoRoot })
  for (const entry of readdirSync(ghPagesDir)) {
    if (entry === '.git') continue
    rmSync(join(ghPagesDir, entry), { recursive: true, force: true })
  }
} else {
  run('git', ['init'], { cwd: ghPagesDir })
  run('git', ['checkout', '-b', 'gh-pages'], { cwd: ghPagesDir })
  run('git', ['remote', 'add', 'origin', remote], { cwd: ghPagesDir })
}

cpSync(distDir, ghPagesDir, { recursive: true })
rmSync(join(ghPagesDir, 'CNAME'), { force: true })

run('git', ['add', '-A'], { cwd: ghPagesDir })
run('git', ['commit', '-m', 'Deploy fleet-os demo to GitHub Pages'], { cwd: ghPagesDir })
run('git', ['push', '-f', 'origin', 'gh-pages'], { cwd: ghPagesDir })

console.log(`GitHub Pages deploy complete: https://ammaramjad.github.io/DT-MVP/`)
