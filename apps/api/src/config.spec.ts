import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('defaults API_PORT to 3000', () => {
    expect(loadConfig({})).toEqual({ apiPort: 3000 });
  });

  it('parses a valid API_PORT', () => {
    expect(loadConfig({ API_PORT: '8080' })).toEqual({ apiPort: 8080 });
  });

  it.each(['abc', '0', '70000', '30.5', ''])('rejects API_PORT=%j', (value) => {
    expect(() => loadConfig({ API_PORT: value })).toThrow(/Invalid API_PORT/);
  });
});
