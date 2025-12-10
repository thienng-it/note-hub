module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/index.{js,ts}',
    '!src/**/*.d.ts'
  ],
  testMatch: ['**/tests/**/*.test.{js,ts}'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Ensure tests exit properly
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: false,
};
