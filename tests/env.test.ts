import { describe, expect, it } from 'bun:test';
import { parseEnv } from '../src/env';

describe('parseEnv', () => {
  it('accepts minimal valid env without Resend', () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      PORT: '3000',
      DATABASE_URL: 'file:./local.db',
      CLERK_SECRET_KEY: 'sk_test_x',
      CLERK_PUBLISHABLE_KEY: 'pk_test_x',
      ALLOWED_ORIGINS: 'http://localhost:4321',
      RATE_LIMIT_MAX: '60',
      RATE_LIMIT_WINDOW_MS: '60000',
    });
    expect(env.PORT).toBe(3000);
    expect(env.ALLOWED_ORIGINS).toEqual(['http://localhost:4321']);
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.TRUST_PROXY).toBe(false);
  });

  it('accepts RESEND_API_KEY when set', () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./local.db',
      CLERK_SECRET_KEY: 'sk_test_x',
      CLERK_PUBLISHABLE_KEY: 'pk_test_x',
      ALLOWED_ORIGINS: 'http://localhost:4321',
      RESEND_API_KEY: 're_x',
    });
    expect(env.RESEND_API_KEY).toBe('re_x');
  });

  it('treats empty RESEND_API_KEY as unset', () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./local.db',
      CLERK_SECRET_KEY: 'sk_test_x',
      CLERK_PUBLISHABLE_KEY: 'pk_test_x',
      ALLOWED_ORIGINS: 'http://localhost:4321',
      RESEND_API_KEY: '',
    });
    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  it('rejects missing CLERK_SECRET_KEY', () => {
    expect(() => parseEnv({ NODE_ENV: 'test' } as never)).toThrow();
  });
});
