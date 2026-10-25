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

interface Pin {
  button: HTMLButtonElement;
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

  const pins: Pin[] = [...root.querySelectorAll<HTMLButtonElement>('[data-pin]')].map((button) => {
    const lat = Number(button.dataset.lat);
    const lon = Number(button.dataset.lon);
    return { button, local: toLocal(lat, lon, 1.004), lat, lon };
  });

  // Start on the Americas, tilted a little north, like the drawing.
  const start = facing(10, -80);
  let yaw = start.yaw;
  let pitch = 0.2;
  let yawVel = 0;
  let pitchVel = 0;
  let dragging = false;
  let held = false; // a pin hovered or focused, or the panel open: no idle spin
  let tween: { from: [number, number]; to: [number, number]; t0: number } | null = null;

  function easeTo(lat: number, lon: number): void {
    const target = facing(lat, lon);
    const to: [number, number] = [yaw + wrap(target.yaw - yaw), target.pitch];
    yawVel = 0;
    pitchVel = 0;
    if (reduced.matches) {
      [yaw, pitch] = to;
      tween = null;
      return;
    }
    tween = { from: [yaw, pitch], to, t0: performance.now() };
  }

  let openPin: Pin | null = null;
  function open(pin: Pin): void {
    openPin = pin;
    const b = pin.button.dataset;
    panelImg.src = b.img ?? '';
    panelImg.alt = b.alt ?? '';
    panelTitle.textContent = b.title ?? '';
    panelLine.textContent = b.line ?? '';
    panel.hidden = false;
    root.parentElement?.classList.add('is-open');
    for (const p of pins) p.button.setAttribute('aria-expanded', String(p === pin));
    easeTo(pin.lat, pin.lon);
    // Move focus into the panel so a screen reader reads the new content; Close returns it.
    panelTitle.focus({ preventScroll: true });
    // At 390 the panel sits below the globe, often under the fold.
    panel.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' });
  }
  function close(): void {
    if (!openPin) return;
    panel.hidden = true;
    root.parentElement?.classList.remove('is-open');
    for (const p of pins) p.button.setAttribute('aria-expanded', 'false');
    openPin.button.focus();
    openPin = null;
  }
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  let hovered = 0;
  for (const pin of pins) {
    pin.button.addEventListener('click', () => open(pin));
    pin.button.addEventListener('pointerenter', () => hovered++);
    pin.button.addEventListener('pointerleave', () => hovered--);
    pin.button.addEventListener('focus', () => {
      if (pin.button.matches(':focus-visible')) easeTo(pin.lat, pin.lon);
    });
  }

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    document.documentElement.classList.add('no-gl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 0, 4.6);

  // Soft key from the upper left, as drawn; low fill so the rim falls off without going black.
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(-3, 3, 4);
  scene.add(key, new AmbientLight(0xffffff, 0.9));

  const globe = new Group();
  globe.rotation.order = 'XYZ';
  scene.add(globe);
  globe.add(
    new Mesh(
      new SphereGeometry(1, 96, 64),
      new MeshStandardMaterial({ map: mapTexture(), roughness: 1, metalness: 0 }),
    ),
  );
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
      if (hit) open(hit);
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
  new ResizeObserver(() => {
    size = root.clientWidth;
    renderer.setSize(size, size, false);
  }).observe(root);

  const world = new Vector3();
  const toCam = new Vector3();
  let prev = performance.now();
  renderer.setAnimationLoop((now: number) => {
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    // :focus-visible, not any focus: after Close returns focus to a pin by mouse, the spin resumes.
    held = hovered > 0 || openPin !== null || root.querySelector(':focus-visible') !== null;

    if (tween) {
      const t = Math.min((now - tween.t0) / EASE_MS, 1);
      const e = t === 1 ? 1 : 1 - 2 ** (-10 * t); // close to --ease-out
      yaw = tween.from[0] + (tween.to[0] - tween.from[0]) * e;
      pitch = tween.from[1] + (tween.to[1] - tween.from[1]) * e;
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
