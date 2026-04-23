# Cursor MCP audit (global)

**Config path:** `~/.cursor/mcp.json`  
**Date:** 2026-04-23  
**Repo:** Hono Template — no project-level `.mcp.json`; all MCP cost is global IDE config.

## Servers reviewed

| Server | Role | Overlap with local CLI | Recommendation |
|--------|------|-------------------------|------------------|
| **context7** | HTTP MCP — library/docs lookup | None (`gh`/`git` unrelated) | **Keep** — fills gap models lack (current package APIs). |
| **sequential-thinking** | stdio — structured reasoning | None | **Keep (optional)** — usually **1 tool**; low schema weight. Disable if you never use it. |
| **github** | stdio — `@modelcontextprotocol/server-github` | **High** — issues/PRs/repos overlap **`gh`**, **`git`**, and agent **Shell** | **Removed from config** — large tool surface vs this repo; use `gh` / terminal for GitHub. |
| **playwright** | stdio — `@playwright/mcp` | None | **Keep** for browser/E2E; repo has `e2e/`. |
| **code-review-graph** | stdio — `uvx code-review-graph serve` | Partial (review vs local scripts) | **Keep if you use it**; otherwise disable to shed one more server process. |

## Token / schema impact (rough)

- **Per-server:** Each exposed tool adds **name + description + JSON schema** to the model context (exact size depends on Cursor bundling and session).
- **GitHub MCP:** Reference servers often expose **dozens** of tools → disproportionate context vs calling `gh pr view`, `gh issue list`, etc. through Shell (no extra tool definitions).
- **After change:** One fewer stdio server + no GitHub tool list → lower fixed MCP overhead each session (often **thousands** of tokens saved vs a full GitHub MCP install; varies by client version).

## Actions taken (in repo vs machine)

1. **This file** — documents decisions and rationale (`Done When` for TODOS item).
2. **`~/.cursor/mcp.json`** — **`github` entry removed** in the same change session as this audit (redundant with `gh` / Shell). Re-add only if you need MCP-specific GitHub features without terminal.

## Security note

If a GitHub PAT was stored in `mcp.json`, treat it as **sensitive**. Prefer env indirection if your Cursor version supports it, or OS keychain. **Rotate the token** if it may have been exposed (logs, screenshots, shared configs).

## Optional next steps

- Add **project** `.cursor/mcp.json` (or Cursor docs equivalent) with **only** servers this repo needs — overrides/augments global and keeps small-repos lean.
- Disable **sequential-thinking** if unused for a week.
- Revisit **code-review-graph** if the binary is unused — removes another MCP process.
