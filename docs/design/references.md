# References: globe homepage prototype (2026-10-25)

Brief: `mothership/docs/queue/2026-10-25-globe-homepage-prototype.md`. The owner's drawing
(`NuevoProjectoMejor/uploads/drawings/3.webp`, left panel "landing page") is the only visual
reference; this prototype comes before any library reference pass, so rows cite `user:` except the
WebGL fallback, which comes from the library. Where the drawing is silent, the site's own tokens
(`web/src/styles/tokens.css`) fill in; see `DESIGN.md` for the trace per element.

| section | library entry | borrow | cost |
|---|---|---|---|
| page | user: drawing 3.webp, left panel | plain white page, nothing but the globe; no glow, stars, grid or halo | B |
| globe | user: drawing 3.webp, the desk globe | matte bone sphere, charcoal continents (colours sampled from the drawing), soft key light from the upper left, slight rim falloff, Americas facing, slight north tilt | M |
| pins | user: drawing 3.webp, the three labels | dark dot on the surface, thin vertical stem up to a white label; labels "about me" (North America), "page 2" (South America west), "page 3" (South America east) | B |
| panel | user: brief (drawing silent; right panel "each page is a 3D tile of a place") | one image, a title, one line; beside the globe at 1440, below at 390; card look from the site's `.brut-card` token | B |
| fallback | `web/visuales.md` (row "Fallback when there is no WebGL") | `try/catch` around the renderer + a CSS class that turns the pins into a plain button row | B |
