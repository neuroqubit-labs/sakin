// Metro config for monorepo — enables symlinked workspace packages
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Watch monorepo root (packages/shared etc.)
config.watchFolders = [workspaceRoot]

// 2. Resolve modules from workspace root first, then project root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// 3. Ensure symlinks are resolved correctly
config.resolver.disableHierarchicalLookup = true

module.exports = config
