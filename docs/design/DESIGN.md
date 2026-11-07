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

# DESIGN: pricing section (`Pricing.astro`, id `precios`)

On `index.astro` and `en/index.astro`, between `ToolStrip` and `ContactForm`. The owner asked for it
directly (2026-11-06), so it goes in despite the rebrand freeze noted above; it adds no new look.
T = site tokens (`tokens.css`, `global.css`), R = research doc
`ProyectoInvestigación/research/paquete-modulos-2026-11-06.md` (be22c66), B = the owner's brief.
Rows in `references.md` (ids `pricing`, `pricing-modules`, `pricing-copy`).

| element | value | source |
|---|---|---|
| section title | `// precios` mono `--text-xl` 700 `--color-muted`, same markup and styles as every other section | T (the site's own heading idiom; slop tell 18 accepted, the site owns mono labels) |
| layout | grid: base card left (1.1fr), module list right (1fr) ≥ 900 px; one column below, card first | B (reuse existing look), orangetheory ficha (price is the loudest thing after the name) |
| base card | `.brut-card` (3 px border, 6 px brut shadow, `--space-8` padding); hover lift switched off because it is information, not a link | T (card), same choice as the globe panel; shadow is the site's neobrutalist world (tell 19 does not apply) |
| package name | "Sitio en 14 días", mono `--text-xl` 700 | R |
| price | "6,500 MXN" mono `--text-2xl` 700, `nowrap` | R; type from T |
| payment line | "Se paga en dos partes iguales" `--text-sm` `--color-fg-soft` | R ("50/50") |
| includes | three plain list lines, 3 px `--color-accent-strong` left rule (same device as `ToolStrip` items) | R (what the base holds); T |
| renewal | "Del año 2 en adelante son 2,800 MXN al año. Es opcional." 600 | R |
| guarantee | label "Garantía." mono + sentence: online 14 days after the material, or year 2 is free | R (keeps the "after the material" condition) |
| CTA | `.brut-btn` "Quiero mi sitio" → `#contact` (es), `/en/#contact` (en); 181×53 at 390 | T (button), B (existing contact path) |
| module list | `<ul>` rows, 3 px top rule, 2 px row rules; name mono 700 + price mono 700 `nowrap` on one flex line that wraps at 390; one `--text-sm` line below | slop tells 4, 7, 10 (list, not cards); T |
| modules | Citas y cobros +2,500 MXN; Eventos con inscripción 3,000 MXN por evento, paid in advance; Google al día with no price (owner, 2026-11-06 21:50: not for sale yet) | R, owner |
| "Próximamente" | mono `--text-xs` 700 `--color-accent-strong` over the Google al día line: it is not for sale yet, so no price is shown | R (sheet: "Próximamente", no price) |
| left out | Temporada, combos, Factura y pagos en partes, visual mensual, IVA wording, any ranking or client claim | R ("Fuera de la hoja"), B |
