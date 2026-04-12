#!/usr/bin/env node
import { spawn } from 'node:child_process'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

const services = [
  { name: 'api-finance', prefix: path.join(repoRoot, 'apps', 'api-finance') },
  { name: 'api-metadata', prefix: path.join(repoRoot, 'apps', 'api-metadata') },
]

/** @type {import('node:child_process').ChildProcess[]} */
const children = []
let shuttingDown = false

function startService(service) {
  const child = spawn('npm', ['--prefix', service.prefix, 'run', 'dev'], {
    stdio: 'inherit',
    env: process.env,
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    console.error(`[multi-dev] ${service.name} exited (code=${code} signal=${signal ?? 'none'})`)
    shutdown(1)
  })

  children.push(child)
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }
  setTimeout(() => process.exit(exitCode), 200)
}

for (const service of services) {
  startService(service)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
