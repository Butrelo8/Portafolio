# Using this repo as a GitHub template

1. **Push this repo to GitHub** (if you haven’t already):
  - Create a new repository named **hono-template** (or any name you prefer).
  - Add the remote and push:
2. **Turn it into a template repository**:
  - On GitHub: **Settings** → **General** → check **Template repository**.
  - Save. After that, others (and you) can use **Use this template** to create new repos from it.
3. **Starting a new project**:
  - Click **Use this template** → **Create a new repository**.
  - Name your new project; the code (including `.cursor/rules` for hono-template) will be copied into the new repo.
  - Clone the new repo and run `bun install`, `cp .env.example .env`, then `bun dev`.

The expected template name for Cursor rules and skills is **hono-template**. The rules in `.cursor/rules/` are written so they apply in any project created from this template.