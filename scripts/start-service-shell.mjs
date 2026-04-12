#!/usr/bin/env node
import http from 'node:http'

function readArg(name, fallback = '') {
  const index = process.argv.findIndex((arg) => arg === `--${name}`)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

const service = readArg('service', 'api-service')
const defaultPortRaw = readArg('default-port', '3100')
const portEnvName = readArg('port-env', 'PORT')
const defaultPort = Number.parseInt(defaultPortRaw, 10)

if (!Number.isFinite(defaultPort)) {
  console.error(`Invalid --default-port: ${defaultPortRaw}`)
  process.exit(1)
}

const resolvedPort = Number.parseInt(process.env[portEnvName] ?? process.env['PORT'] ?? `${defaultPort}`, 10)
if (!Number.isFinite(resolvedPort)) {
  console.error(`Invalid port for ${service}. Check ${portEnvName} or PORT env.`)
  process.exit(1)
}

const server = http.createServer((req, res) => {
  const url = req.url ?? '/'
  if (url === '/health' || url === '/api/v1/health') {
    const body = JSON.stringify({
      ok: true,
      service,
      mode: 'shell',
      timestamp: new Date().toISOString(),
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(body)
    return
  }

  const body = JSON.stringify({
    ok: true,
    service,
    message: 'Service shell is running. Full Nest runtime will be enabled after toolchain stage.',
  })
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(body)
})

let mockInterval = null

function startMockMode() {
  if (mockInterval) return
  console.warn(
    `[${service}] socket bind not permitted in current environment; running in mock-shell mode without TCP listen.`,
  )
  mockInterval = setInterval(() => {
    // Keep process alive for orchestrator mode in restricted environments.
  }, 60_000)
  console.log(`[${service}] mock shell active (health endpoint disabled in this environment).`)
}

server.on('error', (error) => {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EPERM') {
    startMockMode()
    return
  }
  console.error(`[${service}] failed to start:`, error)
  process.exit(1)
})

server.listen(resolvedPort, '127.0.0.1', () => {
  console.log(`[${service}] shell listening on http://localhost:${resolvedPort}/api/v1/health`)
})

function shutdown(signal) {
  console.log(`[${service}] received ${signal}, shutting down...`)
  if (mockInterval) {
    clearInterval(mockInterval)
    mockInterval = null
    process.exit(0)
    return
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
