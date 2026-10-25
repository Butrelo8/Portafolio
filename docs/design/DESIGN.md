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
| ease to pin | 900 ms, `1 - 2^(-10t)` (close to `--ease-out`), turn and camera distance in one tween | B, T; dolly after globe.gl `pointOfView` (route b) |
| camera dolly | z 5 at rest, 4 on a pin (whole sphere stays in the canvas: asin(1/4) = 14.5° < 15° half fov); globe box `min(100%, 84svh, 730px)` so the resting globe keeps about its old size | route b |
| start angle | facing the timezone longitude (`-getTimezoneOffset() / 4`), 10°N; UTC-6 gives the drawn Americas view | route b (GitHub) |
| quality tiers | DPR cap 2 / 1.5 / 1 and sphere segments 96 / 64 / 40; one step down per 2 s window under 55.5 FPS, first second and hidden tabs skipped; `data-tier` on the globe | route b (GitHub) |
| places list | `<nav aria-label="Places">`, a button per place: label `--text-lg`, city mono `--text-xs` `--color-fg-soft`; active = 2 px underline, no transition; column left of the globe ≥ 900 px, wrapped row under it below | route b (Discovery Builders), T for type |
| list ↔ pin | hover or keyboard focus on an entry flies to its pin; hover on a pin lights its entry; click on either opens the panel; Close flies back out and returns focus to whichever opened it | route b |
| reduced motion | no idle spin, no inertia, jump (turn and dolly) to the pin on click | B |
| panel | `.brut-card` (3 px border, 6 px brut shadow, no hover lift), image 4:3, h2 `--text-xl` 700, line `--text-sm` `--color-fg-soft`, Close in mono 44 px tall | B (image + title + line), T (card, type) |
| panel position | flex row ≥ 900 px (beside), column below (under the globe and the list; the page never scrolls on its own: the Mac WebKit pass showed a 264 px jump at 390) | B |
| panel copy | title = pin label; line = "<city>. Placeholder image until this page has its own tile." | B; labelled placeholder (slop tell 6) |
| panel images | #3 street corner aerial 3/4, #32 port top-down, #17 gallery aerial 3/4 from `tiles-batch3-2026-10-25`, 720 px webp q72 in `web/public/globe/` | B (the brief names `public/globe/`, overriding the repo's no-images-in-public rule for this prototype; #25 in the brief is the workshop, #32 is the port) |
| pin places | Mexico City (19.43, -99.13), Callao (-12.05, -77.15), Recife (-8.05, -34.9) | B |
| no WebGL | `.no-gl`: the globe hides; the places list still opens the panel | library row (references.md) |
