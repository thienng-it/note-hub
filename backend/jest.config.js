export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  testMatch: ['**/tests/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Ensure tests exit properly
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: false,
  // ESM support
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
};
