import { describe, expect, it } from 'bun:test';
import { createShutdownManager } from '../src/lib/gracefulShutdown';

describe('createShutdownManager', () => {
  it('runs hooks in reverse order', async () => {
    const mgr = createShutdownManager();
    const calls: number[] = [];
    mgr.register(async () => void calls.push(1));
    mgr.register(async () => void calls.push(2));
    await mgr.shutdown();
    expect(calls).toEqual([2, 1]);
  });

  it('continues on hook error', async () => {
    const mgr = createShutdownManager();
    const calls: string[] = [];
    mgr.register(async () => void calls.push('a'));
    mgr.register(async () => { throw new Error('fail'); });
    mgr.register(async () => void calls.push('c'));
    await mgr.shutdown();
    expect(calls).toEqual(['c', 'a']);
  });
});
