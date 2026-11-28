# Handoff: portfolio redo, step 2 build (2026-11-27)

Brief: `~/projects/mothership/docs/queue/2026-11-27-portfolio-redo.md`. Branch `portfolio-redo` (from `main`), commit `b531a0a`.
Merge only on the owner's word.

## Done
- Step 1: reference shortlist + phone board; the owner picked on 2026-11-27 22:03:
  `work-grid c · work-3d c · how-i-work a · tools-list b · tool-ccdeck c · tool-videos a`.
- `docs/design/references.md` keeps only the picked rows (refs-check 5/5 PASS with
  `--sections work-grid,work-3d,how-i-work,tools-list,tool-ccdeck,tool-videos`).
- `docs/design/DESIGN.md` › "DESIGN: portfolio redo" traces every element to build. **That table is the build spec.**
- Coast clip captured and encoded: `web/public/media/coast-merch-3d.mp4` (960×540, 6 s, 141 kB) + poster
  `web/src/assets/shots/coast-merch-3d-poster.webp`. revisar `--loop`: seam pass, strobe 0. Not wired into any page yet.
- Ticket 07 (PI) is settled: "Así trabajo" states only what exists and the contract's own limits; no round number,
  no "24/7", no "until you're satisfied" (youship 21:15).

## To build (in this order)
1. `WorkIndex.astro` replacing the `ProjectCard` grid in `pages/index.astro` and `pages/en/index.astro` (hairline rows, one
   image panel ≥ 900 px, per-row shot at 390; Coast row uses the clip with the play/pause + reduced-motion handling copied
   from `ToolStrip.astro`'s script). Keep `ProjectCard.astro` only if a case page still imports it; otherwise mention it as dead.
2. `HowIWork.astro`, both languages. Run `bash ~/projects/ProyectoInvestigación/ctx` first and open only the lines that
   decide the "Vistas previas" wording (previews per stage, uptime alert, WhatsApp click counter). Contract lines for the other
   column: `~/projects/webdev-ops/contratos/contrato-sitio-clausulas-2026-11-13.md` cl. 1-3, l.60-63. Skill `avoid-ai-writing-es` on the Spanish.
3. `ToolStrip.astro`: cc-deck still at 1:1 type size cropped to one group inside the existing window (capture from `cc-deck ui`;
   clip only ≥ 1200 px); tools as alternating rows with dimmed stills. Stills for Life-OS (hide personal data before the
   capture), Sonus + Sotto, MPAF do not exist yet.
4. Tool videos: plan only (ticket 08), already in DESIGN.md; no generation.
5. Checks: `bun run lint`, `bun run typecheck`, `bun run build`; `python3 -I ~/projects/visual-lab/web/scripts/slop-check.py web/src`;
   `~/projects/visual-lab/scripts/revisar.sh <served preview url>` (390 + 1440), look at the screenshots before reporting.
   Phone preview: skill `preview-for-phone`.

## Open / waits
- Owner: merge of `portfolio-redo`.
- Ticket 05 (ocean lab) and 04 (MTO) keep those out of the work index.
- `main` had someone else's uncommitted `DESIGN.md` (pricing rows) and `Pricing.astro` edits before this session; they are still
  uncommitted in the working tree and were not included in `b531a0a` (the DESIGN.md commit was built from HEAD + the new section).

## Gotchas
- Coast `/merch` 3D is `<model-viewer>` (three.js) in a shadow root: `document.querySelectorAll('canvas')` finds 0. It mounts
  automatically under `(pointer: fine)`; wait for `document.querySelector('model-viewer').loaded`, then drive the
  `input[type=range]` (0-359) with the native value setter + `input` event. Script: scratchpad `merch/turn.mjs` (not kept); the
  method is: 120 screenshots at 3° steps, ffmpeg at 20 fps.
- `revisar.sh <clip>` writes `./revisar/<name>` in the cwd; run it from the scratchpad, not the repo root.
- Phone board: https://thiccpc-wsl.tail82d42e.ts.net:4411/ → 127.0.0.1:3100 (the brief's `thiccpc:8443` returned 502).

Suggested skills: `ecc-frontend-a11y`, `avoid-ai-writing-es`, `preview-for-phone`, `frontend-design:frontend-design` (only within the DESIGN.md trace).
