import type {Config} from '@jest/types';
import {defaults} from 'jest-config';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: {
    name: '@baiducloud/sdk',
    color: 'yellowBright'
  },
  verbose: true,
  testMatch: ['**/__tests__/**/(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: [...defaults.testPathIgnorePatterns, '/test/'],
  moduleFileExtensions: ['js', 'ts'],
  setupFiles: ['./__tests__/jest.setup.js']
};

export default config;
