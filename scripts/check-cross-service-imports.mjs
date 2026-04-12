#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

const serviceConfig = {
  'api-finance': {
    root: path.join(repoRoot, 'apps', 'api-finance', 'src', 'modules'),
    allowedModules: new Set(['dues', 'payment', 'ledger', 'export']),
  },
  'api-metadata': {
    root: path.join(repoRoot, 'apps', 'api-metadata', 'src', 'modules'),
    allowedModules: new Set(['site', 'unit', 'resident', 'occupancy']),
  },
}

const appArgIndex = process.argv.findIndex((arg) => arg === '--app')
if (appArgIndex === -1 || !process.argv[appArgIndex + 1]) {
  console.error('Usage: node scripts/check-cross-service-imports.mjs --app <api-finance|api-metadata>')
  process.exit(1)
}

const app = process.argv[appArgIndex + 1]
const config = serviceConfig[app]

if (!config) {
  console.error(`Unknown app: ${app}`)
  process.exit(1)
}

function walk(dir) {
  /** @type {string[]} */
  const files = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(full))
      continue
    }
    if (!entry.isFile()) continue
    if (!full.endsWith('.ts')) continue
    if (full.endsWith('.spec.ts')) continue
    files.push(full)
  }
  return files
}

function normalizeModulePath(p) {
  return p.split(path.sep).join('/')
}

function extractModuleNameFromModulesPath(absPath) {
  const normalized = normalizeModulePath(absPath)
  const marker = '/src/modules/'
  const idx = normalized.indexOf(marker)
  if (idx === -1) return null
  const remain = normalized.slice(idx + marker.length)
  return remain.split('/')[0] ?? null
}

const files = walk(config.root)
const importRegex = /from\s+['"]([^'"]+)['"]/g
/** @type {string[]} */
const violations = []

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const currentModule = extractModuleNameFromModulesPath(file)
  if (!currentModule) continue

  let match
  while ((match = importRegex.exec(source)) !== null) {
    const specifier = match[1]
    if (!specifier) continue
    if (!specifier.startsWith('.')) continue

    const resolvedCandidate = path.resolve(path.dirname(file), specifier)
    const tsResolved = `${resolvedCandidate}.ts`
    const indexResolved = path.join(resolvedCandidate, 'index.ts')

    let resolved = resolvedCandidate
    if (fs.existsSync(tsResolved)) resolved = tsResolved
    else if (fs.existsSync(indexResolved)) resolved = indexResolved

    const importedModule = extractModuleNameFromModulesPath(resolved)
    if (!importedModule) continue

    if (importedModule === currentModule) continue
    if (config.allowedModules.has(importedModule)) continue

    violations.push(
      `${path.relative(repoRoot, file)} imports ${specifier} -> module "${importedModule}" (not allowed in ${app})`,
    )
  }
}

if (violations.length > 0) {
  console.error(`Cross-service import guard failed for ${app}:`)
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log(`Cross-service import guard passed for ${app} (${files.length} files scanned).`)
