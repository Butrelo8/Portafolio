# References: globe homepage prototype (2026-10-25)

Brief: `mothership/docs/queue/2026-10-25-globe-homepage-prototype.md`. The owner's drawing
(`NuevoProjectoMejor/uploads/drawings/3.webp`, left panel "landing page") is the only visual
reference; this prototype comes before any library reference pass, so rows cite `user:` except the
WebGL fallback and the route (b) lifts (owner's pick 2026-10-25), which come from the library. Where the drawing is silent, the site's own tokens
(`web/src/styles/tokens.css`) fill in; see `DESIGN.md` for the trace per element.

| section | library entry | borrow | cost |
|---|---|---|---|
| page | user: drawing 3.webp, left panel | plain white page, nothing but the globe; no glow, stars, grid or halo | B |
| globe | user: drawing 3.webp, the desk globe | matte bone sphere, charcoal continents (colours sampled from the drawing), soft key light from the upper left, slight rim falloff, Americas facing, slight north tilt | M |
| pins | user: drawing 3.webp, the three labels | dark dot on the surface, thin vertical stem up to a white label; labels "about me" (North America), "page 2" (South America west), "page 3" (South America east) | B |
| panel | user: brief (drawing silent; right panel "each page is a 3D tile of a place") | one image, a title, one line; beside the globe at 1440, below at 390; card look from the site's `.brut-card` token | B |
| fallback | `web/visuales.md` (row "Fallback when there is no WebGL") | `try/catch` around the renderer + a CSS class; since route (b) the list carries the page and the globe hides | B |
| camera | `web/refs/globe-implementations-2026-10-25.md` (idea 2: globe.gl `pointOfView`, MIT; idea read, no code copied) | one eased tween of turn + camera distance to a pin, back out on close | B |
| quality | `web/refs/globe-implementations-2026-10-25.md` (ideas 4 and 8: GitHub globe, write-up only) | step down DPR and sphere detail when a 2 s window runs under 55.5 FPS; start facing the visitor's timezone longitude | B |
| list | `web/refs/globe-implementations-2026-10-25.md` (idea 8: Discovery Builders' "Choose a destination", screenshot only) | a plain list of the places beside the globe at 1440, under it at 390; hover or focus flies to the pin, a pin lights its entry | B |

# References: pricing section (2026-11-06)

Brief: the owner's message of 2026-11-06 21:41 (via mothership) and
`ProyectoInvestigación/research/paquete-modulos-2026-11-06.md` (commit be22c66), which is the
only source for prices and wording. Look: no new look; the section reuses `.brut-card`,
`.brut-btn` and the site's tokens. Section id for the gate: `pricing`.

| section | library entry | borrow | cost |
|---|---|---|---|
| pricing | `web/site-reading-fichas/orangetheory-com.md` (component 1, "what it does well") | price is the loudest thing after the package name; the renewal price sits on the same card as the first price; one card shape, not a second page | B |
| pricing-modules | `web/ai-slop-tells.md` (tells 4, 7, 10, 2a) | the add-ons are a plain list with name, price and one line each, readable at 390, not identical cards or dotted leaders; one card only, for the base | B |
| pricing-copy | user: research doc `paquete-modulos-2026-11-06.md`, "La hoja" | package name, prices, guarantee and module names verbatim; Temporada, combos, Factura and the monthly visual stay out | B |

# References: tool strip, cc-deck lead (2026-11-06)

Brief: `mothership/docs/queue/2026-11-06-portfolio-tools-mothership.md`. The owner asked for the look
himself ("macOS-style window frame, traffic-light dots, title bar, rounded corners, soft shadow", a
muted looping screen recording at 3.5x), so this is a fixed look, not a direction pick: the rows
say which library entries the frame and the video delivery come from. Section ids for the gate:
`tool-window`, `tool-video`, `tool-layout`, `tool-copy`.

| section | library entry | borrow | cost |
|---|---|---|---|
| tool-window | `web/site-reading-fichas/raycast-com.md` (component "framed desktop screenshot", the second section) | real app UI shown inside an OS window frame as the proof, one frame at the width of the content column, nothing decorative around it; traffic lights, title bar and rounded corners are the owner's brief | B |
| tool-video | `web/site-reading-fichas/framer-com.md` (components "framed product-demo video with a play button"; Speed: the poster is the LCP element, video bytes not fetched at 390) | the demo is the proof of the product, so it sits beside the text and carries a poster; the heavy bytes load after the headline text, not before it | B |
| tool-layout | `web/ai-slop-tells.md` (tells 7, 10, 17) | one lead entry with the window, three plain entries below in the site's existing left-rule list; not four identical cards, no muted aphorism under the heading | B |
| tool-copy | user: brief + cc-deck `CLAUDE.md`, Life-OS (`NuevoProjectoMejor`) README, Sonus and Sotto READMEs | what each tool does in plain words, Spanish first; ApuestasWrapper dropped, Sonus and Sotto merged, Bitácora renamed Life-OS | B |
