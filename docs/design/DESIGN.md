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
| package name | "Sitio listo para Google en 21 días como máximo", mono `--text-xl` 700 | R; owner 2026-11-11 21:33, copy from `research/portafolio-precios-borrador-2026-11-11.md` (draft) |
| price | "9,000 MXN" mono `--text-2xl` 700, `nowrap`; the line under it (`priceNote`, `.pricing__note`) says final launch price for the first 5 clients in exchange for showing the site as a case, then 12,000 MXN final price | draft; type from T |
| payment line | "Pago: 50% para empezar y 50% al entregar." `--text-sm` `--color-fg-soft` | R (ee432c3), owner 2026-11-06 21:53, verbatim |
| includes | nine plain list lines in the draft's order (own visual; 5 pages; .com domain; .mx option; 2 emails; Google-ready; Mes de ajustes; uptime; footer credit), 3 px `--color-accent-strong` left rule (same device as `ToolStrip` items). The WhatsApp-counter line stays commented out in the source until the counter counts in production and the monthly report runs | draft; T |
| pages + extra page | "5 páginas que tú eliges…" is an include line; the extra page (1,500 MXN c/u, same price during the build and after delivery) is a row of the module list | owner 2026-11-07 14:07 and 2026-11-11, draft |
| renewal | "Después del mes de ajustes, el cuidado mensual es opcional. El hosting no se cobra mientras tu sitio sea estático." 600 | draft |
| guarantee | label "Garantía." mono + sentence: not live 21 days after deposit and content reach the owner, 3 months of monthly care free | draft (clock starts at deposit and content) |
| CTA | `.brut-btn` "Quiero mi sitio" → `#contact` (es), `/en/#contact` (en); 181×53 at 390 | T (button), B (existing contact path) |
| module list | `<ul>` rows, 3 px top rule, 2 px row rules; name mono 700 + price mono 700 `nowrap` on one flex line that wraps at 390; one `--text-sm` line below | slop tells 4, 7, 10 (list, not cards); T |
| modules | Cuidado mensual 400 MXN al mes (the sheet says 500 with the radar; stays 400 until the radar runs in a client), Página extra 1,500 MXN c/u, Citas y cobros +2,500 MXN; no fourth module, no printed visual-production module | draft, owner 2026-11-11 |
| left out | Temporada, combos, Eventos, Google al día, Factura y pagos en partes, visual mensual, "+ IVA" (prices are final), any ranking or client claim, any cheaper tier | draft ("Resumen"), owner |

# DESIGN: tool strip, cc-deck lead (`ToolStrip.astro`)

On `index.astro` and `en/index.astro`, same place as before (after the case studies). The owner
asked for the look directly (2026-11-06 23:13), so the window frame goes in despite the rebrand
freeze. B = the owner's brief (`mothership/docs/queue/2026-11-06-portfolio-tools-mothership.md`),
T = site tokens (`tokens.css`, `global.css`). Rows in `references.md` (ids `tool-window`,
`tool-video`, `tool-layout`, `tool-copy`).

| element | value | source |
|---|---|---|
| section heading, blurb | unchanged idiom (`// herramientas propias`, mono `--text-xl` muted); blurb shortened | T, B (keep the heading idea, tighten copy) |
| lead layout | text left, window right (1fr / 2.2fr) ≥ 900 px; one column below, text first | B (featured card), tool-layout row (`ai-slop-tells.md` 7, 10) |
| window frame | 2 px `--color-border` edge, 12 px radius, `0 24px 48px -16px rgb(26 26 26 / 0.4)` | B ("rounded corners, soft shadow"); the owner's frame overrides tells 10 and 19 (owner rule: brand wins), the 2 px edge is T |
| title bar | 36 px, `--color-fg` ground, 1 px hairline of `--color-bg` at 16%, mono `--text-xs` title "cc-deck — mothership" centred at 70% `--color-bg` | B (title bar), T (colours, mono label; tell 18 accepted, the site owns mono labels) |
| traffic lights | three 12 px dots `#ff5f57` `#febc2e` `#28c840`, `aria-hidden` | B (macOS convention, the values are Apple's standard) |
| screen | 1280×696 video, `aspect-ratio` set so there is no layout shift, black ground | B (screen recording), raycast / framer fichas (real UI as proof) |
| video | muted, autoplay, loop, playsinline, `preload="metadata"`, sources attached only when the window is within 300 px of the viewport, WebM (VP9) first then MP4 (H.264), 3.5x, no audio | B |
| poster | webp from `src/assets/shots/`, optimised at build by `astro:assets` at 1280 px | B, T (shots live in `src/assets`, never `public/`) |
| reduced motion | no autoplay, no download until pressed; poster plus a centred "Reproducir" / "Play" button | B |
| pause control | the same button, small bottom-right while playing ("Pausa" / "Pause"), 44 px tall; hidden until JS runs (no JS: poster only) | WCAG 2.2.2 (autoplay over 5 s needs a stop), T (`.brut-btn`'s mono 700 label, `--shadow-brut-sm` on the centred state) |
| other entries | three left-ruled items in the existing `.tools` grid: Life-OS, Sonus + Sotto, MPAF | B, T (unchanged item style) |
| copy | Spanish first, mirrored in English; facts from cc-deck `CLAUDE.md`, the Life-OS README, the Sonus and Sotto READMEs; "3.5x" is stated because the clip is sped up | B, tool-copy row |
| dropped | ApuestasWrapper; the Bitácora name and its TODO | B |
| lazy loader | the one `IntersectionObserver` in the component only attaches the video sources near the viewport; it reveals nothing and hides no content (slop-check `js-intersection-reveal` REVIEW, tell 13 does not apply) | B (lazy), tell 13 |
| privacy | the clip is OCR-checked and redacted with solid bars (client and project names, prices, cost counters) before it is committed; `public/media/cc-deck-3-5x.{webm,mp4}` stay uncommitted until the owner has watched them | B |
