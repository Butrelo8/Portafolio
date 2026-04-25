# CHANGELOG

All notable changes to this project will be documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Changed
- Cursor: generic editor rules moved to user-level `~/.cursor/rules/`; this repository retains only `hono-template.mdc` and project `stack.mdc` under `.cursor/rules/`. Staged copies remain in `.cursor/reglas1/` for reference until you delete them.

### Fixed
- Rate limit middleware fail-open: `store.increment` errors log `rate_limit_store_error` (with message + store class) and allow the request instead of crashing.

### Added
- Initial project structure with Hono + Bun
- PostgreSQL + Drizzle ORM setup
- Clerk auth middleware scaffold
- Stripe client and webhook verification helper
- Consistent error response shape across all endpoints

---

<!-- Add new versions above this line -->
<!-- Format:
## [X.Y.Z] - YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
-->
