export interface AppConfig {
  apiPort: number;
}

// Fail fast on bad config instead of silently falling back.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const raw = env.API_PORT ?? '3000';
  const apiPort = Number(raw);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error(`Invalid API_PORT: "${raw}" (expected integer 1-65535)`);
  }
  return { apiPort };
}
