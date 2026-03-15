# TODOS

## Auth

### Implement login with Clerk
**What:** Connect Clerk auth to the Hono backend
**Why:** Users need to authenticate before accessing protected routes
**Context:** Clerk is already configured as the auth provider. Need to verify JWT tokens in the auth middleware at src/middleware/auth.ts
**Effort:** M
**Priority:** P0
**Depends on:** None

---

## Database

### Run initial migration
**What:** Generate and run the first Drizzle migration
**Why:** Database schema needs to exist before any data can be stored
**Context:** Schema is defined in src/db/schema.ts. Run `bun db:generate` then `bun db:migrate`
**Effort:** S
**Priority:** P0
**Depends on:** DATABASE_URL configured in .env

---

## Payments

### Implement Stripe webhook handler
**What:** Create POST /api/webhooks/stripe endpoint
**Why:** Required to handle subscription lifecycle events (payment success, cancellation, etc.)
**Context:** Stripe client is configured in src/lib/stripe.ts. Must verify signature before processing. Use idempotency keys to avoid double-processing.
**Effort:** M
**Priority:** P1
**Depends on:** STRIPE_WEBHOOK_SECRET configured in .env

---

## Completed
<!-- Move completed items here with: **Completed:** vX.Y.Z (YYYY-MM-DD) -->
