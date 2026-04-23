import { describe, expect, it } from 'bun:test';
import { appVersion } from '../src/lib/appVersion';
import { isHttps } from '../src/lib/forwardedProto';
import { redact } from '../src/lib/safeLog';

describe('redact', () => {
  it('masks known secret fields', () => {
    const out = redact({
      email: 'a@b.c',
      token: 'secret',
      password: 'pw',
      nested: { apiKey: 'k' },
    });
    expect(out.email).toBe('a@b.c');
    expect(out.token).toBe('[REDACTED]');
    expect(out.password).toBe('[REDACTED]');
    expect((out.nested as Record<string, unknown>).apiKey).toBe('[REDACTED]');
  });
});

describe('appVersion', () => {
  it('returns non-empty string', () => {
    expect(typeof appVersion).toBe('string');
    expect(appVersion.length).toBeGreaterThan(0);
  });
});

describe('isHttps', () => {
  it('trusts X-Forwarded-Proto=https', () => {
    expect(isHttps(new Headers({ 'x-forwarded-proto': 'https' }))).toBe(true);
    expect(isHttps(new Headers({ 'x-forwarded-proto': 'http' }))).toBe(false);
    expect(isHttps(new Headers())).toBe(false);
  });
});
