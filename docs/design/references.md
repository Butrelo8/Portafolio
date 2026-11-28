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

# References: portfolio redo (2026-11-27, owner's picks 22:03)

Brief: `mothership/docs/queue/2026-11-27-portfolio-redo.md` (step 1), PI map `docs/wayfinder/linea-3d/` tickets 06-08.
**Picked** by the owner on 2026-11-27 22:03 from the phone board (`docs/design/refs-board-2026-11-27/index.html`): "work-grid c ·
work-3d c · how-i-work a · tools-list b · tool-ccdeck c · tool-videos a". The unpicked rows were deleted; the letters stay as they
were on the board. Content and facts come from the client material (Coast, the tools' READMEs, the webdev-ops
contract); these rows give only the look. Out of this pass: MTO (ticket 04) and the ocean lab (ticket 05). Coast enters with
the `/merch` 3D shirt only. Ticket 07 is decided (owner via mothership, 21:09; wording 21:15): "Así trabajo" says only what exists today, and the limits the webdev-ops contract already sets (changes to what exists, one list at a time, reply within 2 business days, about 4 requests a month on the care plan); no round number, no "24/7", no "until you're satisfied".
Section ids for the gate: `work-grid`, `work-3d`, `how-i-work`, `tools-list`, `tool-ccdeck`, `tool-videos`.

| section | library entry | borrow | cost |
|---|---|---|---|
| work-grid | `web/site-reading-fichas/locomotive-ca.md` (project index, l.17-18) | (c) no cards: project names between 1 px rules, 47 px rows, one image beside the list; the quietest option, the work carries the page | B |
| work-3d | `web/site-reading-fichas/unseen-co.md` (locked-off laptop render, l.20, l.39) | (c) a locked-off clip of the `/merch` page where the camera never moves and only the shirt turns; shows it is a live site, not a render | M |
| how-i-work | `web/site-reading-fichas/linear-app.md` (heading left, text right; changelog rows 56 px, l.18, l.58) | (a) two columns as two plain lists under one heading each ("Vistas previas", "Dirección de diseño"), rows separated by hairlines, no icons; one column each at 1440, stacked at 390 | B |
| tools-list | `web/site-reading-fichas/framer-com.md` (feature rows, l.18, l.39) | (b) rows that alternate a dim screenshot and a fixed-height text panel; works if every tool gets a clip (ticket 08) | M |
| tool-ccdeck | `web/site-reading-fichas/linear-app.md` (grouped-list mock, 36 px header + 40 px rows, l.51-54) | (c) a still of cc-deck's real list at 1:1 type size, cropped to one group, instead of a scaled-down whole screen; the clip only on wide screens | M |
| tool-videos | `web/site-reading-fichas/leeroy-ca.md` (one cut per ratio, l.9, l.37) | (a) each tool clip cut twice, a 16:9 desktop cut and a 9:16 phone cut, ~10 s each, served by media query | M |

**Where the library is thin** (no ficha shows the element itself; read one of the candidates below before building it):
- `work-3d`: no ficha of a portfolio card that holds live 3D work; lusion is a studio's whole-page stage, not a card.
- `how-i-work`: no ficha of a services or process section; the three rows borrow list devices from product pages.
- `tool-ccdeck` and `tool-videos`: no ficha of a developer tool's demo clip (terminal or agent UI); raycast, framer and
  linear are product pages whose demo element sits below their fold shots.

**Site-reading candidates (queued here, not read).** All answered HTTP 200 on 2026-11-27 from `curl` unless marked; the
"why" is my opinion until a reading checks it. Queue them in the Design Studio (`#/queue`) when you want them run.
- 3D work in a portfolio: `https://www.awwwards.com/websites/three-js/` (gallery; pick 2 from it), `https://bruno-simon.com`
  (a portfolio that is a 3D scene), `https://www.robin-noguier.com`, `https://aristidebenoist.com`, `https://cathydolle.com`
  (creative-dev portfolios with WebGL work cards), `https://dogstudio.co`, `https://ohzi.io`, `https://www.makemepulse.com`
  (studios that sell 3D work to brands), `https://threejs.org` (the showcase grid on its home page).
- How I work: `https://www.designjoy.co` (one-person studio that sells "requests until you're happy" with limits stated),
  `https://betterstack.com/uptime` and `https://www.instatus.com` (how monitoring and alerts are shown to a buyer),
  `https://onepagelove.com` (gallery of one-page freelancer sites; filter by "process").
- Developer-tool demo clips: `https://www.warp.dev` and `https://ghostty.org` (terminal shown on a product page),
  `https://www.conductor.build` (a dashboard of parallel coding agents, the closest product to cc-deck), `https://zed.dev`,
  `https://www.cursor.com`, `https://screen.studio` (screen recordings with automatic zoom, a way to cut the tool videos).
- Galleries to browse by hand (they refuse `curl`): `https://godly.website` (200), `https://www.siteinspire.com` (429),
  `https://saaspo.com` (429), `https://land-book.com` (403); the last three need a GPU Chrome, not the headless reader.
