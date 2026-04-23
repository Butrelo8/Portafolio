---
name: skill-library
description: Use when looking up available but non-default skills for this repo. Routes to off-stack or domain-specific skills kept as LIBRARY references.
---

# Skill Library — Hono Template

DAILY skills load automatically each session (matched to this repo's stack).
LIBRARY skills live here — invoke by name when actually needed.

## This Repo's Stack (DAILY)

Hono 4 + Bun + TypeScript + Astro SSR + Drizzle/SQLite + Clerk + Playwright.

Relevant daily skills: `bun-runtime`, `backend-patterns`, `api-design`, `database-migrations`,
`coding-standards`, `tdd`, `tdd-workflow`, `e2e`, `e2e-testing`, `code-review`,
`security-review`, `cso`, `writing-plans`, `plan`, `autoplan`, `verify`,
`investigate`, `ship`, `qa`, `frontend-patterns`, `deployment-patterns`,
`update-docs`, `context-save`, `context-restore`.

## LIBRARY Reference

Invoke these directly when needed. Not loaded by default — off-stack for this repo.

### Databases
- `postgres-patterns` — PostgreSQL (repo uses SQLite/libsql)
- `clickhouse-io` — ClickHouse analytics

### Other Backends
- `django-patterns`, `django-tdd`, `django-security`, `django-verification` — Python/Django
- `laravel-patterns`, `laravel-tdd`, `laravel-security`, `laravel-verification` — PHP/Laravel
- `springboot-patterns`, `springboot-tdd`, `springboot-security`, `springboot-verification` — Java/Spring
- `nestjs-patterns` — Node NestJS
- `golang-patterns`, `golang-testing` — Go
- `rust-patterns`, `rust-testing`, `rust-review`, `rust-build` — Rust
- `python-patterns`, `python-testing`, `python-review` — Python
- `perl-patterns`, `perl-testing`, `perl-security` — Perl
- `cpp-coding-standards`, `cpp-testing`, `cpp-build`, `cpp-review` — C++
- `csharp-testing` — C#
- `dotnet-patterns` — .NET
- `java-coding-standards`, `jpa-patterns` — Java

### Mobile / Native
- `kotlin-patterns`, `kotlin-testing`, `kotlin-review`, `kotlin-build`, `kotlin-coroutines-flows`, `kotlin-exposed-patterns`, `kotlin-ktor-patterns` — Kotlin/Android
- `flutter-review`, `flutter-test`, `flutter-build`, `dart-flutter-patterns`, `flutter-dart-code-review` — Flutter/Dart
- `swift-concurrency-6-2`, `swift-actor-persistence`, `swift-protocol-di-testing`, `swiftui-patterns` — Swift/iOS
- `android-clean-architecture`, `compose-multiplatform-patterns` — Android/KMP

### Frontend Frameworks
- `nextjs-turbopack` — Next.js (repo uses Astro)
- `nuxt4-patterns` — Nuxt

### AI / ML
- `pytorch-patterns` — PyTorch
- `foundation-models-on-device` — on-device ML
- `cost-aware-llm-pipeline`, `prompt-optimizer`, `prompt-optimize` — LLM pipelines
- `eval-harness`, `agent-eval`, `ai-regression-testing` — AI evals
- `claude-api` — Anthropic SDK

### Media / Video
- `videodb`, `remotion-video-creation`, `manim-video`, `video-editing` — video
- `fal-ai-media` — AI media generation

### Domain-Specific
- `healthcare-cdss-patterns`, `healthcare-emr-patterns`, `healthcare-eval-harness`, `healthcare-phi-compliance`, `hipaa-compliance` — healthcare
- `energy-procurement` — energy
- `logistics-exception-management`, `returns-reverse-logistics`, `inventory-demand-planning` — logistics
- `customs-trade-compliance` — trade compliance
- `carrier-relationship-management` — carrier ops
- `production-scheduling` — manufacturing
- `quality-nonconformance` — QA ops
- `finance-billing-ops`, `customer-billing-ops` — billing
- `lead-intelligence`, `investor-outreach`, `investor-materials` — sales/investor

### Blockchain
- `evm-token-decimals`, `defi-amm-security`, `llm-trading-agent-security` — blockchain/DeFi

### Infrastructure
- `docker-patterns` — Docker (no Dockerfile yet in this repo)
- `mcp-server-patterns` — MCP server authoring
- `nodejs-keccak256` — hashing utilities
