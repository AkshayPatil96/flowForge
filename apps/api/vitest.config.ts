import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Load the repo-root .env into process.env so global setup and test workers
// both see DATABASE_URL. Variables already set in the environment win.
Object.assign(process.env, loadEnv('test', '../..', ''));

export default defineConfig({
  test: {
    globalSetup: ['test/global-setup.ts'],
    // Integration tests talk to a hosted database, possibly in another region
    // (CI runners are far from the Neon branch), so allow for network latency.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
