import { isOriginAllowed, normalizeOrigins } from './allowedOrigins';

export interface CorsConfig {
  origin: (origin: string) => string | null;
  allowMethods: string[];
  allowHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export function buildCorsConfig(allowed: readonly string[]): CorsConfig {
  const normalized = normalizeOrigins(allowed);
  return {
    origin: (origin) => (isOriginAllowed(origin, normalized) ? origin : null),
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86_400,
  };
}

export function clerkAuthorizedParties(allowed: readonly string[]): string[] {
  return normalizeOrigins(allowed);
}
