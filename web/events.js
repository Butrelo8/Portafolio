// Page-view and click counter. One Analytics Engine write per event; nothing else is stored:
// no IP, no user agent, no cookie ID. Contract shared by every site: POST /e {"t","p","id"?}.
const BOT_UA =
  /HeadlessChrome|Playwright|puppeteer|bot|crawler|spider|curl|wget|python|node-fetch|lighthouse/i;
const MAX_BODY = 1024;

export function isExcluded(request) {
  if (BOT_UA.test(request.headers.get('user-agent') ?? '')) return true;
  return /(?:^|;\s*)nolog=1(?:;|$)/.test(request.headers.get('cookie') ?? '');
}

// Returns [t, p, id] or null when the payload is not a valid event.
export function parseEvent(text) {
  if (text.length > MAX_BODY) return null;
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!body || typeof body !== 'object') return null;
  const { t, p, id } = body;
  if (t !== 'pv' && t !== 'click') return null;
  if (typeof p !== 'string' || p[0] !== '/' || p.length > 200) return null;
  if (t === 'pv') return [t, p, ''];
  if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id)) return null;
  return [t, p, id];
}

export async function handleEvent(request, env) {
  if (request.method !== 'POST')
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
  if (isExcluded(request)) return new Response(null, { status: 204 });
  const event = parseEvent(await request.text());
  if (!event) return new Response(null, { status: 400 });
  env.EVENTS.writeDataPoint({ blobs: event, doubles: [1] });
  return new Response(null, { status: 204 });
}
