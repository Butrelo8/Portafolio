import { describe, expect, test } from 'bun:test'
import { TtlCache } from '../../src/lib/cache'

describe('TtlCache', () => {
  test('returns undefined for missing key', () => {
    const c = new TtlCache<string>(1000)
    expect(c.get('x')).toBeUndefined()
  })

  test('returns value before TTL expires', () => {
    const c = new TtlCache<string>(60_000)
    c.set('k', 'v')
    expect(c.get('k')).toBe('v')
  })

  test('returns undefined after TTL expires', async () => {
    const c = new TtlCache<string>(10)
    c.set('k', 'v')
    await new Promise((r) => setTimeout(r, 20))
    expect(c.get('k')).toBeUndefined()
  })

  test('clear removes all entries', () => {
    const c = new TtlCache<string>(60_000)
    c.set('a', '1')
    c.set('b', '2')
    c.clear()
    expect(c.get('a')).toBeUndefined()
    expect(c.get('b')).toBeUndefined()
  })
})
