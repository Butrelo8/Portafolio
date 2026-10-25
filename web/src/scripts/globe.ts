import { geoEquirectangular, geoPath } from 'd3-geo';
import {
  AmbientLight,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import land from 'world-atlas/land-110m.json';

// Colours sampled from the owner's drawing (uploads/drawings/3.webp): bone sphere, charcoal land.
const CREAM = '#ece8dc';
const LAND = '#343d3c';
const DOT = 0x1a1a1a; // --color-fg

const TURN_SECONDS = 60;
const PITCH_MIN = -0.7;
const PITCH_MAX = 0.9;
const EASE_MS = 900;
// Camera distance at rest and dollied in to a pin. 4 keeps the whole sphere inside the canvas
// (silhouette half-angle asin(1/4) = 14.5° under the 15° half fov).
const REST_Z = 5;
const NEAR_Z = 4;
// Quality tiers after GitHub's globe: below 55.5 FPS over a 2 s window, step down one tier.
const MIN_FPS = 55.5;
const TIERS = [
  { dpr: 2, seg: 96 },
  { dpr: 1.5, seg: 64 },
  { dpr: 1, seg: 40 },
];

interface Pin {
  button: HTMLButtonElement;
  item: HTMLButtonElement;
  local: Vector3;
  lat: number;
  lon: number;
}

// Matches SphereGeometry's UV layout, so a lat/lon lands on the same texel as the map.
function toLocal(lat: number, lon: number, r: number): Vector3 {
  const phi = ((lon + 180) * Math.PI) / 180;
  const theta = ((90 - lat) * Math.PI) / 180;
  return new Vector3(
    -Math.cos(phi) * Math.sin(theta) * r,
    Math.cos(theta) * r,
    Math.sin(phi) * Math.sin(theta) * r,
  );
}

// Yaw/pitch that bring (lat, lon) to face a camera on +z.
function facing(lat: number, lon: number): { yaw: number; pitch: number } {
  const phi = ((lon + 180) * Math.PI) / 180;
  return { yaw: Math.PI / 2 - phi, pitch: (lat * Math.PI) / 180 };
}

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function mapTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const topo = land as unknown as Topology<{ land: GeometryCollection }>;
  const projection = geoEquirectangular().fitSize([canvas.width, canvas.height], {
    type: 'Sphere',
  });
  ctx.beginPath();
  geoPath(projection, ctx)(feature(topo, topo.objects.land));
  ctx.fillStyle = LAND;
  ctx.fill();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function mountGlobe(root: HTMLElement): void {
  const canvas = root.querySelector('canvas') as HTMLCanvasElement;
  const panel = document.getElementById('globe-panel') as HTMLElement;
  const panelImg = panel.querySelector('img') as HTMLImageElement;
  const panelTitle = panel.querySelector('h2') as HTMLElement;
  const panelLine = panel.querySelector('p') as HTMLElement;
  const closeBtn = panel.querySelector('[data-close]') as HTMLButtonElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const list = document.querySelector('[data-places]') as HTMLElement;
  const pins: Pin[] = [...root.querySelectorAll<HTMLButtonElement>('[data-pin]')].map((button) => {
    const lat = Number(button.dataset.lat);
    const lon = Number(button.dataset.lon);
    const item = list.querySelector(`[data-place="${button.dataset.pin}"]`) as HTMLButtonElement;
    return { button, item, local: toLocal(lat, lon, 1.004), lat, lon };
  });

  // Start facing the visitor's longitude, read from the timezone offset (after GitHub's globe):
  // UTC-6 faces 90°W, the Americas, as drawn.
  const start = facing(10, -new Date().getTimezoneOffset() / 4);
  let yaw = start.yaw;
  let pitch = 0.2;
  let camZ = REST_Z;
  let yawVel = 0;
  let pitchVel = 0;
  let dragging = false;
  let held = false; // a pin or place hovered or focused, or the panel open: no idle spin
  let tween: { from: number[]; to: number[]; t0: number } | null = null;

  // Turn and dolly in one tween, like globe.gl's pointOfView({ lat, lng, altitude }, ms).
  // pin null keeps the current turn and only moves the camera.
  function flyTo(pin: Pin | null, z: number): void {
    const target = pin ? facing(pin.lat, pin.lon) : { yaw, pitch };
    const to = [yaw + wrap(target.yaw - yaw), target.pitch, z];
    yawVel = 0;
    pitchVel = 0;
    if (reduced.matches) {
      [yaw, pitch, camZ] = to;
      tween = null;
      return;
    }
    tween = { from: [yaw, pitch, camZ], to, t0: performance.now() };
  }

  // One place lit in both the globe and the list.
  function mark(pin: Pin | null): void {
    for (const p of pins) {
      p.button.classList.toggle('is-active', p === pin);
      p.item.classList.toggle('is-active', p === pin);
    }
  }
  let previewing: Pin | null = null;
  function preview(pin: Pin): void {
    previewing = pin;
    mark(pin);
    if (!openPin) flyTo(pin, NEAR_Z);
  }
  function unpreview(pin: Pin): void {
    if (previewing !== pin) return;
    previewing = null;
    mark(openPin);
    if (!openPin) flyTo(null, REST_Z);
  }

  let openPin: Pin | null = null;
  let opener: HTMLElement | null = null;
  function open(pin: Pin, from: HTMLElement): void {
    openPin = pin;
    opener = from;
    mark(pin);
    const b = pin.button.dataset;
    panelImg.src = b.img ?? '';
    panelImg.alt = b.alt ?? '';
    panelTitle.textContent = b.title ?? '';
    panelLine.textContent = b.line ?? '';
    panel.hidden = false;
    root.parentElement?.classList.add('is-open');
    for (const p of pins) {
      p.button.setAttribute('aria-expanded', String(p === pin));
      p.item.setAttribute('aria-expanded', String(p === pin));
    }
    flyTo(pin, NEAR_Z);
    // Move focus into the panel so a screen reader reads the new content; Close returns it.
    panelTitle.focus({ preventScroll: true });
    // At 390 the panel sits below the globe, often under the fold.
    panel.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  function close(): void {
    if (!openPin) return;
    panel.hidden = true;
    root.parentElement?.classList.remove('is-open');
    for (const p of pins) {
      p.button.setAttribute('aria-expanded', 'false');
      p.item.setAttribute('aria-expanded', 'false');
    }
    openPin = null;
    previewing = null;
    mark(null);
    flyTo(null, REST_Z);
    opener?.focus();
  }
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  let hovered = 0;
  for (const pin of pins) {
    // Pins: hover lights the list entry; keyboard focus also flies there.
    pin.button.addEventListener('click', () => open(pin, pin.button));
    pin.button.addEventListener('pointerenter', () => {
      hovered++;
      mark(pin);
    });
    pin.button.addEventListener('pointerleave', () => {
      hovered--;
      mark(previewing ?? openPin);
    });
    pin.button.addEventListener('focus', () => {
      if (pin.button.matches(':focus-visible')) preview(pin);
    });
    pin.button.addEventListener('blur', () => unpreview(pin));
    // List (after Discovery Builders' "Choose a destination"): hover or focus flies to the pin.
    pin.item.addEventListener('click', () => open(pin, pin.item));
    pin.item.addEventListener('pointerenter', () => {
      hovered++;
      preview(pin);
    });
    pin.item.addEventListener('pointerleave', () => {
      hovered--;
      unpreview(pin);
    });
    pin.item.addEventListener('focus', () => {
      if (pin.item.matches(':focus-visible')) preview(pin);
    });
    pin.item.addEventListener('blur', () => unpreview(pin));
  }

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    document.documentElement.classList.add('no-gl');
    return;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 20);

  // Soft key from the upper left, as drawn; low fill so the rim falls off without going black.
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(-3, 3, 4);
  scene.add(key, new AmbientLight(0xffffff, 0.9));

  const globe = new Group();
  globe.rotation.order = 'XYZ';
  scene.add(globe);
  const sphere = new Mesh(
    new SphereGeometry(1, TIERS[0].seg, (TIERS[0].seg * 2) / 3),
    new MeshStandardMaterial({ map: mapTexture(), roughness: 1, metalness: 0 }),
  );
  globe.add(sphere);
  const dotGeo = new SphereGeometry(0.016, 16, 12);
  const dotMat = new MeshBasicMaterial({ color: DOT });
  for (const pin of pins) {
    const dot = new Mesh(dotGeo, dotMat);
    dot.position.copy(pin.local);
    globe.add(dot);
  }

  // Drag to rotate; a press that barely moves is a click on the nearest visible pin.
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    tween = null;
    canvas.setPointerCapture(e.pointerId);
    downX = lastX = e.clientX;
    downY = lastY = e.clientY;
    lastT = e.timeStamp;
    yawVel = pitchVel = 0;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const k = 2.6 / canvas.clientWidth;
    const dx = (e.clientX - lastX) * k;
    const dy = (e.clientY - lastY) * k;
    const dt = Math.max(e.timeStamp - lastT, 1) / 1000;
    yaw += dx;
    pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch + dy));
    yawVel = dx / dt;
    pitchVel = dy / dt;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = e.timeStamp;
  });
  const release = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    if (e.timeStamp - lastT > 80 || reduced.matches) yawVel = pitchVel = 0;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) < 5) {
      const hit = nearestPin(e.clientX, e.clientY);
      if (hit) open(hit, hit.button);
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  const screen = new Map<Pin, { x: number; y: number; vis: number }>();
  function nearestPin(x: number, y: number): Pin | null {
    const box = root.getBoundingClientRect();
    let best: Pin | null = null;
    let bestD = 24;
    for (const [pin, s] of screen) {
      const d = Math.hypot(box.left + s.x - x, box.top + s.y - y);
      if (s.vis > 0.5 && d < bestD) {
        best = pin;
        bestD = d;
      }
    }
    return best;
  }

  let size = 0;
  let tier = 0;
  function applyTier(): void {
    const t = TIERS[tier];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, t.dpr));
    renderer.setSize(size, size, false);
    if (sphere.geometry.parameters.widthSegments !== t.seg) {
      sphere.geometry.dispose();
      sphere.geometry = new SphereGeometry(1, t.seg, (t.seg * 2) / 3);
    }
    root.dataset.tier = String(tier);
  }
  new ResizeObserver(() => {
    size = root.clientWidth;
    applyTier();
  }).observe(root);

  // FPS window; skipped while the tab is hidden and for the first second (shader compile).
  let winStart = performance.now() + 1000;
  let winFrames = 0;
  document.addEventListener('visibilitychange', () => {
    winStart = performance.now() + 1000;
    winFrames = 0;
  });
  function measure(now: number): void {
    if (document.hidden || now < winStart) return;
    winFrames++;
    if (now - winStart < 2000) return;
    const fps = (winFrames * 1000) / (now - winStart);
    if (fps < MIN_FPS && tier < TIERS.length - 1) {
      tier++;
      applyTier();
    }
    winStart = now + 1000;
    winFrames = 0;
  }

  const world = new Vector3();
  const toCam = new Vector3();
  let prev = performance.now();
  renderer.setAnimationLoop((now: number) => {
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    measure(now);
    // :focus-visible, not any focus: after Close returns focus to a pin by mouse, the spin resumes.
    held =
      hovered > 0 ||
      openPin !== null ||
      root.querySelector(':focus-visible') !== null ||
      list.querySelector(':focus-visible') !== null;

    if (tween) {
      const t = Math.min((now - tween.t0) / EASE_MS, 1);
      const e = t === 1 ? 1 : 1 - 2 ** (-10 * t); // close to --ease-out
      [yaw, pitch, camZ] = tween.from.map((f, i) => f + ((tween?.to[i] ?? f) - f) * e);
      if (t === 1) tween = null;
    } else if (!dragging) {
      const decay = Math.exp(-3 * dt);
      yaw += yawVel * dt;
      pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch + pitchVel * dt));
      yawVel *= decay;
      pitchVel *= decay;
      if (!held && !reduced.matches) yaw += ((2 * Math.PI) / TURN_SECONDS) * dt;
    }
    globe.rotation.set(pitch, yaw, 0);
    camera.position.z = camZ;
    globe.updateMatrixWorld();

    for (const pin of pins) {
      world.copy(pin.local).applyMatrix4(globe.matrixWorld);
      toCam.copy(camera.position).sub(world).normalize();
      const front = world.clone().normalize().dot(toCam);
      const vis = Math.min(Math.max((front - 0.1) / 0.2, 0), 1);
      world.project(camera);
      const x = ((world.x + 1) / 2) * size;
      const y = ((1 - world.y) / 2) * size;
      screen.set(pin, { x, y, vis });
      const s = pin.button.style;
      s.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      s.opacity = vis.toFixed(2);
      pin.button.classList.toggle('is-back', vis < 0.5);
    }
    renderer.render(scene, camera);
  });
}
