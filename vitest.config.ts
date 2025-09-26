import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['app/tests/**/*.test.ts'],
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage'
    }
  }
});
