/**
 * Minimal Jest konfigü — yalnız saf TS util'lerini test ediyoruz.
 * Component/ekran testleri eklendiğinde `jest-expo` preset'ine geçilecek;
 * şimdilik RN setup'ının flow-typed polyfill'leri hataya düşürmesini bypass et.
 */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/'],
}
