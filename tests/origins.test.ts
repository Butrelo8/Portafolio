import { describe, expect, it } from 'bun:test';
import { normalizeOrigins, isOriginAllowed } from '../src/lib/allowedOrigins';
import { buildCorsConfig } from '../src/lib/corsOrigins';

describe('normalizeOrigins', () => {
  it('expands www↔apex pairs', () => {
    const out = normalizeOrigins(['https://example.com']);
    expect(out).toContain('https://example.com');
    expect(out).toContain('https://www.example.com');
  });
  it('dedupes', () => {
    const out = normalizeOrigins(['https://a.com', 'https://a.com']);
    expect(out.filter((o) => o === 'https://a.com').length).toBe(1);
  });
});

describe('isOriginAllowed', () => {
  it('matches normalized', () => {
    expect(isOriginAllowed('https://www.example.com', ['https://example.com'])).toBe(true);
    expect(isOriginAllowed('https://evil.com', ['https://example.com'])).toBe(false);
  });
});

describe('buildCorsConfig', () => {
  it('returns origin function', () => {
    const cfg = buildCorsConfig(['https://example.com']);
    expect(cfg.origin('https://example.com')).toBe('https://example.com');
    expect(cfg.origin('https://evil.com')).toBe(null);
  });
});
