import { describe, expect, it } from 'bun:test';
import { detectDriver } from '../src/db/detect';

describe('detectDriver', () => {
  it('picks libsql for remote url', () => {
    expect(detectDriver('libsql://foo.turso.io')).toBe('libsql');
    expect(detectDriver('https://foo.turso.io')).toBe('libsql');
  });
  it('picks bun-sqlite for file url without auth token', () => {
    expect(detectDriver('file:./local.db')).toBe('bun-sqlite');
  });
  it('uses libsql for file: when auth token is set (remote embedded replica)', () => {
    expect(detectDriver('file:./local.db', 'tok')).toBe('libsql');
  });
});
