export type Driver = 'libsql' | 'bun-sqlite';

export function detectDriver(url: string, authToken?: string): Driver {
  if (url.startsWith('libsql://') || url.startsWith('https://') || url.startsWith('wss://')) {
    return 'libsql';
  }
  if (url.startsWith('file:') && authToken) return 'libsql';
  return 'bun-sqlite';
}
