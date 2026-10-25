import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Load the repo-root .env into process.env so global setup and test workers
// both see DATABASE_URL. Variables already set in the environment win.
Object.assign(process.env, loadEnv('test', '../..', ''));

export default defineConfig({
  test: { globalSetup: ['test/global-setup.ts'] },
});
