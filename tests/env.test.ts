import { describe, expect, test } from 'bun:test';
import { envSchema } from '../src/env';

// env.ts parses process.env once at import, so assert on the schema instead
// of the already-frozen `env` singleton.
describe('env', () => {
  const base = { GITHUB_TOKEN: 'ghp_test', GITHUB_USERNAME: 'testuser' };

  test('parses required vars', () => {
    const env = envSchema.parse({ ...base, PORTFOLIO_TOPIC: 'portfolio' });
    expect(env.GITHUB_TOKEN).toBe('ghp_test');
    expect(env.GITHUB_USERNAME).toBe('testuser');
    expect(env.PORTFOLIO_TOPIC).toBe('portfolio');
  });

  test('CACHE_TTL_MS defaults to 600000', () => {
    expect(envSchema.parse(base).CACHE_TTL_MS).toBe(600000);
  });

  test('rejects missing GITHUB_TOKEN', () => {
    expect(() => envSchema.parse({ GITHUB_USERNAME: 'testuser' })).toThrow();
  });
});
