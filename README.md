# hono-template

> Starter for new projects: Hono + Bun + PostgreSQL (Drizzle) + Clerk + Stripe.

Use **Use this template** (green button on GitHub) to create a new repo from this template. The project name and Cursor rules expect the template to be used as **hono-template** so that rules and skills apply correctly.

## Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Clerk
- **Payments:** Stripe

## Getting Started

```bash
# Install dependencies
bun install

# Copy env file and fill in values
cp .env.example .env

# Run database migrations
bun db:migrate

# Start dev server
bun dev
```

## Project Structure

```
src/
├── index.ts          # Entry point
├── routes/           # Route handlers
├── middleware/       # Auth, error handling
├── db/               # Drizzle schema and connection
├── lib/              # Stripe, utilities
└── types/            # Shared TypeScript types
```

## Scripts

| Command | Description |
|---|---|
| `bun dev` | Start dev server with hot reload |
| `bun start` | Start production server |
| `bun test` | Run tests |
| `bun db:generate` | Generate Drizzle migrations |
| `bun db:migrate` | Run pending migrations |
| `bun db:studio` | Open Drizzle Studio |

## Environment Variables

See `.env.example` for all required variables.

## Cursor

This template includes `.cursor/rules/` for **hono-template**. When you create a new project from this repo, keep or rename the project so the hono-template rules and conventions apply.
