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

## Step 3 done (same session, `281320b`)
- `ToolStrip.astro`: cc-deck's window shows `cc-deck-group.webp` (one real group, 758 CSS px at 2x, so 1:1 type size; the
  window crops its right side on phones). The 3.5x clip downloads and plays only when the visitor presses "Ver grabación",
  and that button exists only at ≥ 1200 px. Life-OS, Sonus + Sotto and MPAF are alternating rows: a dimmed 16:9 still and a
  12 rem text panel, still above text at 390.
- How each still was made (all from the running app, text replaced in the live DOM before the shot, every one checked at
  100 %): cc-deck `localhost:8790` group, task/command/quote lines replaced with neutral web work, polling cut first;
  Life-OS `127.0.0.1:3200` top 1100×619, both decision cards rewritten to non-client work and the project grid removed;
  MPAF UI started locally on :8799 (`npx tsx src/cli/index.ts ui`, stopped after), one chip with a third party's handle removed;
  Sonus `sonus-tui` built into the scratchpad (`--locked`, nothing written to the repo), run in tmux with a throwaway HOME,
  the model path replaced by its default `~/.sonus/models/small.gguf`, rendered from ANSI.
- Sotto has no usable still (the only Mac screenshots are debug captures); the Sonus + Sotto row shows Sonus. A Sotto
  still needs the Mac.
- The Playwright MCP has no browser here (`chrome-for-testing` missing); captures used the global `playwright` package.

## Next
1. Tool videos stay a plan (ticket 08).
2. The keyboard-reach fix in the work index (below).
3. Owner's look, then merge.

## Notes
- `main`'s foreign uncommitted `docs/design/DESIGN.md` and `web/src/components/Pricing.astro` edits are still in the tree,
  untouched and never staged.
- revisar `img-upscaled-390` FAILs every `srcset` image: `naturalWidth` is density-corrected to the `sizes` slot, so it reads
  390 for an 800 px file. Not a defect of the page.

## Deviations from the DESIGN.md trace (write them into DESIGN.md once its foreign edits are settled)
- At 390 the client · year meta sits under the name, not right-aligned (long client names squeezed the name to two lines).
- At ≥ 900 px names are `nowrap`; the meta wraps on the right instead.
- At 390 there is no tagline, no Coast caption and no "Visitar sitio" under a row; the case page carries the live link
  (`pages/projects/[slug].astro:41`).
- Keyboard at ≥ 900 px: the panel comes after the four rows in tab order and follows `focusin`, so only the last focused
  row's panel (its live link, Coast's pause button) is reachable. Fix candidate: put each row's panel controls in the row,
  or switch the panel on row focus and move the panel right after the active row in DOM order.
