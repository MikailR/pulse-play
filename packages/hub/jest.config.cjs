const path = require('path');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [require.resolve('ts-jest'), {
      useESM: true,
      diagnostics: { ignoreCodes: [151002] },
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
};
