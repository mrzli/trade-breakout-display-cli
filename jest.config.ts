import type { JestConfigWithTsJest } from 'ts-jest';
import { getJestConfig } from '@gmjs/jest-config';

export default async (): Promise<JestConfigWithTsJest> => {
  const defaultConfig = await getJestConfig();
  return {
    ...defaultConfig,
  };
};
