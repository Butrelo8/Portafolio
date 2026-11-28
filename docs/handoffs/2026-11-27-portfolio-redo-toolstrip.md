# Handoff: portfolio redo, step 3 tools (2026-11-27)

Previous: `docs/handoffs/2026-11-27-portfolio-redo-build.md` (spec = `docs/design/DESIGN.md` › "DESIGN: portfolio redo").
Branch `portfolio-redo`, last commit `d4f5801`. Merge only on the owner's word.

## Done this session
- `web/src/components/WorkIndex.astro` replaces the `ProjectCard` grid on both home pages (`1cb0cf8`, fix `d4f5801`):
  hairline rows, the whole row is the link (stretched `::after`), one panel ≥ 900 px that follows hover/focus, every panel
  figure rendered on the server (first active, works without JS), a 16:9 shot per row below 900 px. Coast uses the
  `/merch` clip in both places; the clip script is a copy of ToolStrip's on `[data-clip]`.
- `web/src/components/HowIWork.astro`, both languages, between the work index and the tools. Every row checked against
  what runs today: workers.dev link while building (`webdev-ops/docs/alta-cliente.md:28`), site-monitor alerts go to the owner
  (PI `paquete-modulos-2026-11-06.md:197-200, 218`), `/wa` counter live (Maco `/wa/…` answers 302). Contract values used only
  where they are not in brackets (cl. 1, 3, 7). `avoid-ai-writing-es` detector: 0 flags.
- `ProjectCard.astro` is now dead (no importer). Not deleted.
- Checks: lint (1 pre-existing warning, `public/e.js`), typecheck 0 errors, build OK, slop-check no new tell,
  revisar on the served build (see the report for the table).

## To build next
1. `ToolStrip.astro` per DESIGN.md rows "cc-deck lead" and "tools list":
   - Capture a still of cc-deck's real list at 1:1 type size, cropped to one group (`cc-deck ui`), into `web/src/assets/shots/`.
     Keep the Mac window; load the 3.5x clip only when `matchMedia('(min-width: 1200px)')` matches; still only below.
   - Stills for Life-OS (hide personal data with `evaluate_script` before the capture), Sonus + Sotto, MPAF. Until all three
     exist, keep the current left-rule list: alternating rows with empty stills is slop tell 6 (tier A).
   - The Playwright MCP has no browser here (`chrome-for-testing` missing). Capture with a script on the global `playwright`
     package (the way `revisar/web.mjs` loads it); the one used this session was scratchpad `cap/shots.cjs` (not kept).
2. Tool videos stay a plan (ticket 08).
3. Re-run: lint, typecheck, build, slop-check, revisar 390 + 1440 on `astro preview --port 3100`; phone link
   https://thiccpc-wsl.tail82d42e.ts.net:4411/ (proxies 127.0.0.1:3100).

## Notes
- `main`'s foreign uncommitted `docs/design/DESIGN.md` and `web/src/components/Pricing.astro` edits are still in the tree,
  untouched and never staged.
- revisar `img-upscaled-390` FAILs every `srcset` image: `naturalWidth` is density-corrected to the `sizes` slot, so it reads
  390 for an 800 px file. Not a defect of the page.
