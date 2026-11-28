"""Writes index.html for the 2026-11-27 portfolio-redo reference board. Data mirrors references.md (same date)."""
import html, pathlib
OUT = pathlib.Path(__file__).with_name("index.html")
E = html.escape
# (id, title, note, [(letter, site, url, borrow, cost, [(img, caption)], flag)])
S = [
 ("work-grid", "Portafolio: rejilla o lista", "Cómo se ven los 4 proyectos.", [
  ("a", "mattjumper.com", "https://mattjumper.com", "Rejilla igual de miniaturas 16:9: imagen + título 18 px + una línea mono. 3 columnas → 1 en el teléfono; con 4 proyectos va 2 + 2.", "B", [("mattjumper-com-1440.jpg", "1440"), ("mattjumper-com-390.jpg", "390")], ""),
  ("b", "dennissnellenberg.com", "https://dennissnellenberg.com", "Lista de trabajos, una fila por proyecto; al pasar el ratón corre una captura real del sitio (~9 s, fondo gris, sin marco de dispositivo). En el teléfono, solo la imagen fija.", "M", [("dennissnellenberg-com-1440.jpg", "1440"), ("dennissnellenberg-com-390.jpg", "390")], "La lista está en el pliegue; el video al pasar el ratón no sale en la foto: ábrelo en vivo."),
  ("c", "locomotive.ca", "https://locomotive.ca/en", "Sin tarjetas: nombres de proyecto entre líneas de 1 px, filas de 47 px, una imagen al lado. La opción más callada.", "B", [("locomotive-ca-1440.jpg", "1440"), ("locomotive-ca-390.jpg", "390")], "El índice de proyectos está bajo el pliegue de estas fotos."),
 ]),
 ("work-3d", "Coast: la playera 3D (Three.js)", "Solo /merch; el océano espera el ticket 05 y MTO el 04. La biblioteca no tiene una tarjeta de portafolio con 3D en vivo: las tres son aproximaciones.", [
  ("a", "lusion.co", "https://lusion.co", "Un escenario oscuro con esquinas de 15 px dentro de la página clara, con la playera real girando. Un solo escenario, no un canvas detrás de toda la página.", "A", [("lusion-co-1440.jpg", "1440"), ("lusion-co-390.jpg", "390")], ""),
  ("b", "cuberto.com", "https://cuberto.com", "Portada de video a todo lo ancho, esquinas redondas, texto encima; el video no se descarga hasta que hace falta. Sin WebGL en el portafolio.", "M", [("cuberto-com-1440.jpg", "1440"), ("cuberto-com-390.jpg", "390")], ""),
  ("c", "unseen.co", "https://unseen.co", "Clip con la cámara quieta de la página /merch: solo gira la playera. Enseña que es un sitio en vivo, no un render.", "M", [("unseen-co-1440.jpg", "1440"), ("unseen-co-390.jpg", "390")], "Las fotos solo muestran la puerta de entrada; el clip del laptop está más abajo en vivo."),
 ]),
 ("how-i-work", "Así trabajo: dos columnas", "Decidido (ticket 07, opción 1): solo lo que existe hoy. Aquí eliges la forma, no el texto.", [
  ("a", "linear.app", "https://linear.app/changelog", "Dos listas simples, una por columna (Vistas previas · Dirección de diseño), filas separadas por líneas finas, sin íconos. Apiladas en el teléfono.", "B", [("linear-changelog.jpg", "1440, filas del changelog"), ("linear-changelog-390.jpg", "390")], ""),
  ("b", "todoist.com", "https://todoist.com", "Cada columna = tres filas tintadas: inicio en negritas + el dato en gris. Sin los íconos de Todoist.", "B", [("todoist-com-1440.jpg", "1440"), ("todoist-com-390.jpg", "390")], "Las filas tintadas están bajo el pliegue de estas fotos: ábrelo en vivo."),
  ("c", "gov.uk paso a paso", "https://www.gov.uk/learn-to-drive-a-car", "Una línea vertical fina con las etapas reales del proyecto; las dos columnas son lo que corre en paralelo en cada etapa. Números solo si la etapa es real.", "M", [("govuk-390.jpg", "390")], ""),
 ]),
 ("tools-list", "Herramientas: la lista", "Las entradas que van debajo de cc-deck.", [
  ("a", "basement.studio", "https://basement.studio", "Una fila por herramienta: imagen o clip 16:9 a la izquierda, dos líneas a la derecha, filas de ~240 px.", "M", [("basement-studio-1440.jpg", "1440"), ("basement-studio-390.jpg", "390")], "Las filas están bajo el pliegue (la foto es la escena 3D)."),
  ("b", "framer.com", "https://framer.com", "Filas que alternan una captura atenuada y un panel de texto de alto fijo. Sirve si cada herramienta tiene clip (ticket 08).", "M", [("framer-com-1440.jpg", "1440"), ("framer-com-390.jpg", "390")], "Las filas alternadas están bajo el pliegue."),
  ("c", "la lista de hoy", "", "Se queda la lista con línea a la izquierda; solo cambia el texto. Lo más barato y no espera videos nuevos.", "B", [], ""),
 ]),
 ("tool-ccdeck", "cc-deck: la entrada principal", "Qué enseña la grabación y con qué marco.", [
  ("a", "raycast.com", "https://raycast.com", "La ventana Mac de hoy, ensanchada a toda la columna para que las filas del tablero se lean.", "B", [("raycast-com-1440.jpg", "1440"), ("raycast-com-390.jpg", "390")], "La ventana con la app real está en la segunda sección, no en estas fotos."),
  ("b", "framer.com", "https://framer.com", "La grabación a todo lo ancho, sin marco de ventana, con un panel al lado: tres líneas de lo que pasa en el clip. En el teléfono, solo el póster.", "M", [("framer-com-1440.jpg", "1440")], ""),
  ("c", "linear.app", "https://linear.app", "Una captura fija de la lista real de cc-deck a tamaño 1:1, recortada a un grupo, en vez de toda la pantalla reducida; el clip solo en pantallas anchas.", "M", [("linear-grouped.jpg", "1440, lista agrupada")], ""),
 ]),
 ("tool-videos", "Los videos de las herramientas", "Plan para el ticket 08; aquí no se genera video.", [
  ("a", "leeroy.ca", "https://leeroy.ca", "Cada clip cortado dos veces: 16:9 para escritorio y 9:16 para el teléfono, ~10 s cada uno.", "M", [("leeroy-ca-1440.jpg", "1440"), ("leeroy-ca-390.jpg", "390")], ""),
  ("b", "dennissnellenberg.com", "https://dennissnellenberg.com", "Capturas de pantalla crudas, bucles de ~9 s, sobre un mismo fondo gris, sin dispositivo ni zoom. Lo más fácil de mantener al día.", "B", [], "Mismas fotos que en Portafolio (b)."),
  ("c", "Sean (reels)", "https://web.facebook.com/seanaiux", "El resultado terminado en el primer segundo, luego cómo se llegó, subtítulos quemados frase por frase. Más para los posts 9:16 que para la página.", "M", [], "Sin imagen en la biblioteca para este patrón."),
 ]),
]
MORE = [
 ("3D en un portafolio", ["https://www.awwwards.com/websites/three-js/", "https://bruno-simon.com", "https://www.robin-noguier.com", "https://aristidebenoist.com", "https://cathydolle.com", "https://dogstudio.co", "https://ohzi.io", "https://www.makemepulse.com", "https://threejs.org"]),
 ("Así trabajo", ["https://www.designjoy.co", "https://betterstack.com/uptime", "https://www.instatus.com", "https://onepagelove.com"]),
 ("Clips de herramientas", ["https://www.conductor.build", "https://www.warp.dev", "https://ghostty.org", "https://zed.dev", "https://www.cursor.com", "https://screen.studio"]),
 ("Galerías (a mano)", ["https://godly.website", "https://www.siteinspire.com", "https://saaspo.com", "https://land-book.com"]),
]
p = []
for sid, title, note, opts in S:
    p.append(f'<section aria-labelledby="h-{sid}"><h2 id="h-{sid}">{E(title)}</h2><p class="note">{E(note)}</p><fieldset><legend class="sr">Elige una opción para {E(title)}</legend>')
    for L, site, url, borrow, cost, imgs, flag in opts:
        link = f'<a class="t" href="{E(url)}">Abrir {E(site)} en vivo</a>' if url else ""
        figs = "".join(f'<figure><a href="img/{i}"><img src="img/{i}" alt="{E(site)}, captura a {E(c)} (abre grande)" loading="lazy"></a><figcaption>{E(c)}</figcaption></figure>' for i, c in imgs)
        fl = f'<p class="flag">{E(flag)}</p>' if flag else ""
        p.append(f'<article class="opt"><label><input type="radio" name="{sid}" value="{L}"> <b>({L}) {E(site)}</b> <span class="cost">costo {cost}</span></label><p>{E(borrow)}</p>{link}{fl}<div class="figs">{figs}</div></article>')
    p.append("</fieldset></section>")
more = "".join(f'<h3>{E(t)}</h3><ul>{"".join(f"<li><a class={chr(34)}t{chr(34)} href={chr(34)}{E(u)}{chr(34)}>{E(u.split(chr(47))[2])}</a></li>" for u in us)}</ul>' for t, us in MORE)
OUT.write_text(f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Referencias: portafolio (27 nov)</title><style>
body{{margin:0;font:16px/1.5 system-ui,sans-serif;color:#111;background:#f6f6f4}}main{{max-width:1100px;margin:auto;padding:16px}}
h1{{font-size:24px;margin:8px 0}}h2{{font-size:20px;margin:32px 0 4px;border-top:2px solid #111;padding-top:12px}}.note{{color:#444;margin:0 0 12px}}
fieldset{{border:0;padding:0;margin:0;display:grid;gap:12px}}@media(min-width:900px){{fieldset{{grid-template-columns:repeat(3,1fr)}}}}
.opt{{background:#fff;border:1px solid #ccc;border-radius:6px;padding:12px}}.opt:has(input:checked){{outline:3px solid #0a58ca}}
label{{display:flex;gap:8px;align-items:center;min-height:44px;cursor:pointer}}input{{width:44px;height:44px;margin:0;flex:none}}.cost{{margin-left:auto;font:13px monospace;color:#555}}
.flag{{font-size:14px;background:#fff4d6;padding:6px 8px;border-radius:4px}}.figs{{display:flex;gap:8px}}figure{{margin:0;flex:1}}
figure img{{width:100%;height:auto;border:1px solid #ddd;display:block}}figcaption{{font:12px monospace;color:#555}}
.sr{{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}#out{{position:sticky;bottom:0;background:#111;color:#fff;padding:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}}
#out code{{flex:1;font-size:14px}}button{{min-height:44px;padding:0 16px;font:inherit;border:0;border-radius:4px}}a{{color:#0a58ca}}.t{{display:inline-flex;align-items:center;min-height:44px}}ul{{padding-left:20px}}
</style></head><body><main><h1>Portafolio: referencias para elegir</h1>
<p>Una opción por sección. Abajo se arma la línea con tus elecciones para copiarla y mandarla. Costo: B bajo, M medio, A alto. Fuente de cada fila: <code>docs/design/references.md</code>.</p><a class="t" href="https://thiccpc-wsl.tail82d42e.ts.net:8797/library.html">O elegir en el Design Studio</a>
{''.join(p)}
<section aria-labelledby="h-more"><h2 id="h-more">Dónde encontrar más (sin leer todavía)</h2><p class="note">Candidatos a lectura de sitio para las secciones con poca biblioteca: 3D, Así trabajo y los clips de herramientas.</p>{more}</section>
</main><div id="out"><code id="picks">Sin elecciones todavía</code><button type="button" id="copy">Copiar</button><span id="st" role="status" aria-live="polite"></span></div>
<script>const ids={[s[0] for s in S]!r};const c=document.getElementById('picks');
function u(){{const v=ids.map(i=>{{const r=document.querySelector('input[name="'+i+'"]:checked');return r?i+' '+r.value:null}}).filter(Boolean);c.textContent=v.length?v.join(' · '):'Sin elecciones todavía'}}
document.addEventListener('change',u);document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(c.textContent).then(()=>{{document.getElementById('st').textContent='Copiado'}},()=>{{document.getElementById('st').textContent='Selecciona el texto y cópialo'}});</script>
</body></html>""", encoding="utf8")
