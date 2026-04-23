const SECRET_KEYS = new Set([
  'password', 'token', 'apikey', 'api_key', 'secret', 'authorization',
  'cookie', 'set-cookie', 'clerk_secret_key', 'database_auth_token', 'resend_api_key',
]);

export function redact(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== 'object') return {};
  if (Array.isArray(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    out[key] = SECRET_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : (
      value !== null && typeof value === 'object' && !Array.isArray(value) ? redact(value) : value
    );
  }
  return out;
}
