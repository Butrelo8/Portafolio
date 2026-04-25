import { beforeEach, describe, expect, test } from 'bun:test';

describe('env', () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.GITHUB_USERNAME = 'testuser';
    process.env.PORTFOLIO_TOPIC = 'portfolio';
  });

  test('parses required vars', async () => {
    const { env } = await import('../src/env');
    expect(env.GITHUB_TOKEN).toBe('ghp_test');
    expect(env.GITHUB_USERNAME).toBe('testuser');
    expect(env.PORTFOLIO_TOPIC).toBe('portfolio');
  });

  test('CACHE_TTL_MS defaults to 600000', async () => {
    delete process.env.CACHE_TTL_MS;
    const { env } = await import('../src/env');
    expect(env.CACHE_TTL_MS).toBe(600000);
  });
});
