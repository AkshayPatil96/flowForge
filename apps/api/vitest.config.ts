import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Load the repo-root .env so the real-database tests can see DATABASE_URL.
  test: { env: loadEnv('test', '../..', '') },
});
