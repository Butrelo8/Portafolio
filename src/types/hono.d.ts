import type {} from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    sessionId: string;
    requestId: string;
  }
}
