// Page-view and click counter. One Analytics Engine write per event; nothing else is stored:
// no IP, no user agent, no cookie ID. Contract shared by every site: POST /e {"t","p","id"?}.
const BOT_UA =
  /HeadlessChrome|Playwright|puppeteer|bot|crawler|spider|curl|wget|python|node-fetch|lighthouse/i;
const MAX_BODY = 1024;

export function isExcluded(request) {
  if (BOT_UA.test(request.headers.get('user-agent') ?? '')) return true;
  return /(?:^|;\s*)nolog=1(?:;|$)/.test(request.headers.get('cookie') ?? '');
}

// A source field (referrer host, UTM tag): trimmed, lowercased, [a-z0-9._-] up to 64 chars, else ''.
const clean = (v) => {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return /^[a-z0-9._-]{1,64}$/.test(s) ? s : '';
};

// Returns the data point or null when the payload is not a valid event.
// pv:    blobs [t, p, '', ref, utm_source, utm_medium, utm_campaign, country, region, city], doubles [1, nd, nm]
// click: blobs [t, p, id], doubles [1, 0, 0]
// nd / nm (pv only) are 1 when the page says it is the device's first visit of the day / month; anything but 1 is 0.
export function parseEvent(text, cf = {}) {
  if (text.length > MAX_BODY) return null;
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!body || typeof body !== 'object') return null;
  const { t, p, id, nd, nm, r, us, um, uc } = body;
  if (t !== 'pv' && t !== 'click') return null;
  if (typeof p !== 'string' || p[0] !== '/' || p.length > 200) return null;
  if (t === 'pv') {
    const geo = [cf.country, cf.region, cf.city].map((v) => (typeof v === 'string' ? v : ''));
    return {
      blobs: [t, p, '', clean(r), clean(us), clean(um), clean(uc), ...geo],
      doubles: [1, nd === 1 ? 1 : 0, nm === 1 ? 1 : 0],
    };
  }
  if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id)) return null;
  return { blobs: [t, p, id], doubles: [1, 0, 0] };
}

export async function handleEvent(request, env) {
  if (request.method !== 'POST')
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
  if (isExcluded(request)) return new Response(null, { status: 204 });
  const event = parseEvent(await request.text(), request.cf ?? {});
  if (!event) return new Response(null, { status: 400 });
  env.EVENTS.writeDataPoint(event);
  return new Response(null, { status: 204 });
}
