import { baseConfig } from './base.js';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export const nextConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];

export default nextConfig;
