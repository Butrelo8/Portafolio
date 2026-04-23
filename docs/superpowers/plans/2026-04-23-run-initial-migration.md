# Run Initial Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the existing Drizzle migration to create the `items` table in the local development database.

**Architecture:** Migration SQL already generated at `src/db/migrations/0000_concerned_captain_britain.sql`. Only `db:migrate` needs to run. Verify by starting the server and confirming `/health` + `/items` endpoints respond correctly.

**Tech Stack:** Bun, Drizzle Kit, SQLite (`bun:sqlite`), Hono.

---

## File Map


| File                                                   | Role                                                               | Action                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------- |
| `src/db/migrations/0000_concerned_captain_britain.sql` | Migration SQL                                                      | Read-only — already correct              |
| `drizzle.config.ts`                                    | Drizzle Kit config — `out: ./src/db/migrations`, `dialect: sqlite` | Read-only                                |
| `.env`                                                 | Runtime config                                                     | Must have `DATABASE_URL=file:./local.db` |
| `local.db` (or path from `DATABASE_URL`)               | SQLite DB file                                                     | Created by migrate                       |


---

### Task 1: Verify `.env` is configured

**Files:**

- Read: `.env`
- **Step 1: Check DATABASE_URL exists and is a file: path**
  ```bash
  grep DATABASE_URL .env
  ```
  Expected: `DATABASE_URL=file:./local.db` (any `file:./something.db` path is fine).
  If missing, add it:
  ```bash
  echo "DATABASE_URL=file:./local.db" >> .env
  ```
  Do not change `.env.test` — it uses `DATABASE_URL=file:./test.db` for test isolation.
- **Step 2: Confirm all other required vars are present**
  ```bash
  grep -E "CLERK_SECRET_KEY|CLERK_PUBLISHABLE_KEY|ALLOWED_ORIGINS|RESEND_API_KEY" .env
  ```
  Expected: four lines, each with a value. Dummy values (`sk_test_dummy`, `re_dummy`) are fine for local dev.

---

### Task 2: Apply the migration

**Files:**

- Read: `src/db/migrations/0000_concerned_captain_britain.sql`
- **Step 1: Review migration SQL before applying**
  ```bash
  cat src/db/migrations/0000_concerned_captain_britain.sql
  ```
  Expected output:
  ```sql
  CREATE TABLE `items` (
    `id` text PRIMARY KEY NOT NULL,
    `owner_id` text NOT NULL,
    `name` text NOT NULL,
    `description` text,
    `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
    `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
  );
  ```
  If columns differ from schema in `src/db/schema.ts`, stop and run `bun run db:generate` first, review again, then continue.
- **Step 2: Apply the migration**
  ```bash
  bun run db:migrate
  ```
  Expected: Drizzle Kit prints confirmation and exits with code 0.
  If error `"table items already exists"`: migration was already applied — this is fine, continue to Step 3.
- **Step 3: Confirm the table exists**
  ```bash
  bun run --eval "
  import { Database } from 'bun:sqlite';
  const path = (process.env.DATABASE_URL ?? 'file:./local.db').replace('file:', '');
  const db = new Database(path);
  const rows = db.query(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
  console.log(JSON.stringify(rows));
  db.close();
  "
  ```
  Expected: `[{"name":"items"},{"name":"__drizzle_migrations"}]`
  If `items` is absent, re-run `bun run db:migrate` — it may have silently failed.

---

### Task 3: Verify server starts and API responds

**Files:**

- None modified — runtime verification only
- **Step 1: Start the dev server**
  ```bash
  bun run dev
  ```
  Expected log line: `{"time":"...","level":"info","msg":"server_started","port":3000,...}`
  If `Invalid environment`: a required env var is missing — return to Task 1.
  If `no such table: items`: migration did not apply — return to Task 2.
- **Step 2: Confirm `/health` responds**
In a second terminal:
  ```bash
  curl -s http://localhost:3000/health | jq .
  ```
  Expected:
  ```json
  {
    "status": "ok",
    "version": "0.1.0",
    "uptimeSeconds": 1,
    "time": "..."
  }
  ```
- **Step 3: Confirm `/items` returns 401 (not 500)**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/items
  ```
  Expected: `401` — auth middleware fired, DB reachable. A `500` means a DB error; a `404` means route not mounted — check `src/routes/index.ts`.
- **Step 4: Stop the dev server**
`Ctrl+C` in the server terminal.

---

### Task 4: Run test suite to confirm isolation intact

**Files:**

- None modified
- **Step 1: Run all tests**
  ```bash
  bun test
  ```
  Expected: all tests pass. The preload in `bunfig.toml` → `tests/preload.ts` uses a separate `test.db` — isolated from `local.db`.
  If tests fail with `no such table: items`: check `tests/preload.ts` — it must apply migrations to the test DB before tests run.

---

## Self-Review

**Spec coverage:**

- ✓ Migration already generated (`0000_concerned_captain_britain.sql` exists) — `db:generate` skipped
- ✓ Review SQL before applying: Task 2 Step 1
- ✓ Apply migration: Task 2 Step 2
- ✓ Confirm table created: Task 2 Step 3
- ✓ App starts without DB errors: Task 3 Steps 1-3
- ✓ Test suite unaffected: Task 4

**Placeholder scan:** None found.

**Type consistency:** No cross-task types — CLI/verification plan only.