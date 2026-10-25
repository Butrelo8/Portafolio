# DESIGN: globe homepage prototype (`/globe`)

Prototype only: `web/src/pages/globe.astro` + `web/src/scripts/globe.ts`, `noindex`, not linked
from the site. `index.astro` is untouched (rebrand freeze). Sources: D = the owner's drawing
(`uploads/drawings/3.webp`), T = the site's tokens (`web/src/styles/tokens.css`, `global.css`),
B = the brief. References and the refs-check gate: `references.md`.

| element | value | source |
|---|---|---|
| page background | `--color-surface` #fff | D (plain white page), T for the value |
| sphere | albedo #ece8dc, `MeshStandardMaterial` roughness 1, metalness 0 | D (bone/cream, colour sampled), B (matte, no specular) |
| continents | #343d3c fill on a 2048×1024 equirectangular canvas, `world-atlas` land-110m via `d3-geo` | D (charcoal, sampled #343d3c), B (atlas) |
| light | directional 2.4 from (-3, 3, 4) + ambient 0.9 | D (soft, upper left, slight rim shading) |
| start view | Americas facing, 0.2 rad north tilt | D |
| pin dot | 0.016-radius sphere, `--color-fg` #1a1a1a | D (dark dot) |
| pin stem | 1 px × 28 px, `--color-fg`; hover/focus/open scales to 1.22 from the bottom | D (thin line from dot to label), B (hover lifts) |
| pin label | Inter 400, `--text-lg`, white with a 1 px `--color-fg` halo | D (white labels, light weight); T for the face (Inter is the site's sans: slop tell 11 accepted as a site token). The drawing's hand-written look is the sketch tool's font, not taken |
| label lift | `translate: 0 -6px`, `--duration-normal` 250 ms, `--ease-out` | B (hover lifts), T (timing) |
| focus ring | 2 px `--color-accent-strong` outline on the label | T |
| idle spin | one turn per 60 s, paused while a pin is hovered or focused or the panel is open | B |
| drag | yaw + clamped pitch, inertia decays `exp(-3t)` | B |
| ease to pin | 900 ms, `1 - 2^(-10t)` (close to `--ease-out`) | B, T |
| reduced motion | no idle spin, no inertia, jump to the pin on click | B |
| panel | `.brut-card` (3 px border, 6 px brut shadow, no hover lift), image 4:3, h2 `--text-xl` 700, line `--text-sm` `--color-fg-soft`, Close in mono 44 px tall | B (image + title + line), T (card, type) |
| panel position | flex row ≥ 900 px (beside), column below (under the globe; scrolls into view on open) | B |
| panel copy | title = pin label; line = "<city>. Placeholder image until this page has its own tile." | B; labelled placeholder (slop tell 6) |
| panel images | #3 street corner aerial 3/4, #32 port top-down, #17 gallery aerial 3/4 from `tiles-batch3-2026-10-25`, 720 px webp q72 in `web/public/globe/` | B (the brief names `public/globe/`, overriding the repo's no-images-in-public rule for this prototype; #25 in the brief is the workshop, #32 is the port) |
| pin places | Mexico City (19.43, -99.13), Callao (-12.05, -77.15), Recife (-8.05, -34.9) | B |
| no WebGL | `.no-gl`: canvas hidden, pins become a row of buttons that still open the panel | library row (references.md) |
