import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const DATABASE_URL = 'postgresql://user:secret@localhost:5432/flowforge';

describe('loadConfig', () => {
  it('defaults API_PORT to 3000', () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({ apiPort: 3000, databaseUrl: DATABASE_URL });
  });

  it('parses a valid API_PORT', () => {
    expect(loadConfig({ DATABASE_URL, API_PORT: '8080' }).apiPort).toBe(8080);
  });

  it.each(['abc', '0', '70000', '30.5', ''])('rejects API_PORT=%j', (value) => {
    expect(() => loadConfig({ DATABASE_URL, API_PORT: value })).toThrow(/Invalid API_PORT/);
  });

  it('requires DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
  });

  it.each(['not a url', 'mysql://user:secret@localhost/db'])(
    'rejects DATABASE_URL=%j without echoing it',
    (value) => {
      expect(() => loadConfig({ DATABASE_URL: value })).toThrow(/^Invalid DATABASE_URL/);
      expect(() => loadConfig({ DATABASE_URL: value })).not.toThrow(/secret/);
    },
  );
});
