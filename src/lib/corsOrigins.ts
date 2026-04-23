import { isOriginAllowed, normalizeOrigins } from './allowedOrigins';

export interface CorsConfig {
  origin: (origin: string) => string | null;
  allowMethods: string[];
  allowHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

/**
 * CORS for browser → API calls. `credentials` stays **false**: auth is Bearer JWT
 * (`Authorization`), not cookies; `true` would emit `Access-Control-Allow-Credentials`
 * and is unnecessary. If you add cookie sessions on cross-origin requests, switch to
 * `true` and pair with explicit CSRF protection.
 */
export function buildCorsConfig(allowed: readonly string[]): CorsConfig {
  const normalized = normalizeOrigins(allowed);
  return {
    origin: (origin) => (isOriginAllowed(origin, normalized) ? origin : null),
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86_400,
  };
}

export function clerkAuthorizedParties(allowed: readonly string[]): string[] {
  return normalizeOrigins(allowed);
}
