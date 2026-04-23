export function normalizeOrigins(origins: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of origins) {
    const origin = raw.trim().replace(/\/$/, '');
    if (!origin) continue;
    out.add(origin);
    try {
      const url = new URL(origin);
      const host = url.hostname;
      if (host.startsWith('www.')) {
        url.hostname = host.slice(4);
        out.add(url.origin);
      } else if (host.split('.').length === 2) {
        url.hostname = `www.${host}`;
        out.add(url.origin);
      }
    } catch {
      // skip invalid
    }
  }
  return [...out];
}

export function isOriginAllowed(origin: string, allowed: readonly string[]): boolean {
  return normalizeOrigins(allowed).includes(origin);
}
