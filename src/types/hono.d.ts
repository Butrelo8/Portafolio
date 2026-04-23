import type {} from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    sessionId: string;
    requestId: string;
    /** Present when the client sent a non-empty `x-request-id` (for correlation); never trusted as the canonical trace id. */
    clientRequestId?: string;
    validated: { json?: unknown; query?: unknown; params?: unknown };
  }
}
