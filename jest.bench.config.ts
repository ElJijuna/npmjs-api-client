import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/bench/**/*.bench.test.ts'],
  verbose: true,
};

export default config;
