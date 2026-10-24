export interface AppConfig {
  apiPort: number;
  databaseUrl: string;
}

// Fail fast on bad config instead of silently falling back.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawPort = env.API_PORT ?? '3000';
  const apiPort = Number(rawPort);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error(`Invalid API_PORT: "${rawPort}" (expected integer 1-65535)`);
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (see .env.example)');
  }
  // Never echo the URL itself: it contains the password.
  if (!URL.canParse(databaseUrl) || !/^postgres(ql)?:$/.test(new URL(databaseUrl).protocol)) {
    throw new Error('Invalid DATABASE_URL (expected postgres:// or postgresql:// URL)');
  }

  return { apiPort, databaseUrl };
}
