import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    include: ['tests/unit/**/*.spec.ts'],
    environmentMatchGlobs: [
      ['tests/unit/**/*.store.spec.ts', 'happy-dom'],
      ['tests/unit/**/store*.spec.ts', 'happy-dom'],
    ],
    environment: 'node',
    deps: {
      optimizer: {
        web: {
          include: ['reflect-metadata'],
        },
      },
    },
  },
});
