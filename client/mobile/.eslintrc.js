module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'build/', 'coverage/'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
}
