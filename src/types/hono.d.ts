import type {} from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    /** TCP peer address from `Bun.serve` `requestIP`; not settable by clients. */
    socketIp: string;
    userId: string;
    sessionId: string;
    requestId: string;
    /** Same UUID as `requestId`; canonical key for cross-log correlation. */
    traceId: string;
    /** Present when the client sent a non-empty `x-request-id` (for correlation); never trusted as the canonical trace id. */
    clientRequestId?: string;
    validated: { json?: unknown; query?: unknown; params?: unknown };
  }
}
