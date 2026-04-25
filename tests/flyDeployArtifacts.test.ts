import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(import.meta.dir, '..');

describe('Fly.io / Docker deploy artifacts', () => {
  test('Dockerfile and fly.toml exist at repo root', () => {
    expect(existsSync(join(repoRoot, 'Dockerfile'))).toBe(true);
    expect(existsSync(join(repoRoot, 'fly.toml'))).toBe(true);
  });

  test('fly.toml wires HTTP service to app port and health check', () => {
    const raw = readFileSync(join(repoRoot, 'fly.toml'), 'utf8');
    expect(raw).toContain('internal_port = 3000');
    expect(raw).toContain('path = "/health"');
    expect(raw).toContain('release_command');
  });

  test('Dockerfile builds API bundle and runs dist entry', () => {
    const raw = readFileSync(join(repoRoot, 'Dockerfile'), 'utf8');
    expect(raw).toContain('bun build src/index.ts');
    expect(raw).toContain('dist/index.js');
  });
});
