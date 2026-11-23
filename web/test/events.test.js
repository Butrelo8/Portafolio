import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { handleEvent, isExcluded, parseEvent } from '../events.js';

const MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const post = (body, headers = { 'user-agent': MOBILE }, method = 'POST') =>
  new Request('https://example.test/e', {
    method,
    headers,
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
const spyEnv = () => {
  const writes = [];
  return { writes, EVENTS: { writeDataPoint: (d) => writes.push(d) } };
};

test('excludes bot and automation user agents', () => {
  for (const ua of [
    'Mozilla/5.0 HeadlessChrome/120.0',
    'Mozilla/5.0 Playwright',
    'puppeteer',
    'Googlebot/2.1',
    'SomeCrawler/1',
    'spider',
    'curl/8.5.0',
    'Wget/1.21',
    'python-requests/2.31',
    'node-fetch/3',
    'Chrome-Lighthouse',
  ]) {
    assert.equal(isExcluded(post({}, { 'user-agent': ua })), true, ua);
  }
  assert.equal(isExcluded(post({})), false);
  assert.equal(isExcluded(post({}, {})), false);
});

test('excludes the nolog=1 cookie only', () => {
  const withCookie = (cookie) => post({}, { 'user-agent': MOBILE, cookie });
  assert.equal(isExcluded(withCookie('nolog=1')), true);
  assert.equal(isExcluded(withCookie('a=b; nolog=1; c=d')), true);
  assert.equal(isExcluded(withCookie('nolog=0')), false);
  assert.equal(isExcluded(withCookie('xnolog=1')), false);
});

test('parseEvent accepts pv and click', () => {
  assert.deepEqual(parseEvent('{"t":"pv","p":"/about"}'), {
    blobs: ['pv', '/about', '', '', '', '', '', '', '', ''],
    doubles: [1, 0, 0],
  });
  assert.deepEqual(parseEvent('{"t":"click","id":"cta-start","p":"/en/"}'), {
    blobs: ['click', '/en/', 'cta-start'],
    doubles: [1, 0, 0],
  });
});

test('parseEvent rejects invalid payloads', () => {
  for (const bad of [
    '',
    'not json',
    'null',
    '[]',
    '{"t":"other","p":"/"}',
    '{"t":"pv"}',
    '{"t":"pv","p":"about"}',
    '{"t":"pv","p":123}',
    `{"t":"pv","p":"/${'a'.repeat(200)}"}`,
    '{"t":"click","p":"/"}',
    '{"t":"click","id":"has space","p":"/"}',
    `{"t":"click","id":"${'a'.repeat(65)}","p":"/"}`,
    `{"t":"pv","p":"/","x":"${'a'.repeat(1100)}"}`,
  ]) {
    assert.equal(parseEvent(bad), null, bad.slice(0, 40));
  }
});

test('writes one data point for a normal visitor', async () => {
  const env = spyEnv();
  const res = await handleEvent(post({ t: 'pv', p: '/about' }), env);
  assert.equal(res.status, 204);
  assert.deepEqual(env.writes, [
    { blobs: ['pv', '/about', '', '', '', '', '', '', '', ''], doubles: [1, 0, 0] },
  ]);
});

test('drops excluded traffic with 204 and writes nothing', async () => {
  const env = spyEnv();
  const bot = await handleEvent(post({ t: 'pv', p: '/' }, { 'user-agent': 'HeadlessChrome' }), env);
  const owner = await handleEvent(
    post({ t: 'pv', p: '/' }, { 'user-agent': MOBILE, cookie: 'nolog=1' }),
    env,
  );
  assert.equal(bot.status, 204);
  assert.equal(owner.status, 204);
  assert.equal(env.writes.length, 0);
});

test('invalid payload is 400 and non-POST is 405, both without writes', async () => {
  const env = spyEnv();
  assert.equal((await handleEvent(post('nope'), env)).status, 400);
  assert.equal((await handleEvent(post('', { 'user-agent': MOBILE }, 'GET'), env)).status, 405);
  assert.equal(env.writes.length, 0);
});

test('nd and nm of 1 land in doubles 2 and 3 on a pv; other values and clicks count 0', async () => {
  const env = spyEnv();
  await handleEvent(post({ t: 'pv', p: '/', nd: 1, nm: 1 }), env);
  await handleEvent(post({ t: 'pv', p: '/', nd: 1 }), env);
  await handleEvent(post({ t: 'pv', p: '/', nm: 1 }), env);
  await handleEvent(post({ t: 'pv', p: '/', nd: '1', nm: 2 }), env);
  await handleEvent(post({ t: 'click', id: 'cta', p: '/', nd: 1, nm: 1 }), env);
  assert.deepEqual(
    env.writes.map((w) => w.doubles),
    [
      [1, 1, 1],
      [1, 1, 0],
      [1, 0, 1],
      [1, 0, 0],
      [1, 0, 0],
    ],
  );
});

test('bots and nolog are dropped even with nd and nm', async () => {
  const env = spyEnv();
  const body = { t: 'pv', p: '/', nd: 1, nm: 1 };
  await handleEvent(post(body, { 'user-agent': 'HeadlessChrome' }), env);
  await handleEvent(post(body, { 'user-agent': MOBILE, cookie: 'nolog=1' }), env);
  assert.equal(env.writes.length, 0);
});

const withCf = (body, cf, headers = { 'user-agent': MOBILE }) => {
  const req = post(body, headers);
  Object.defineProperty(req, 'cf', { value: cf });
  return req;
};

test('pv with referrer, all UTMs and cf fields writes the 7 source blobs in order', async () => {
  const env = spyEnv();
  await handleEvent(
    withCf(
      { t: 'pv', p: '/', r: 'google.com', us: 'news', um: 'email', uc: 'launch-1' },
      { country: 'MX', region: 'Veracruz', city: 'Xalapa' },
    ),
    env,
  );
  assert.deepEqual(env.writes[0].blobs, [
    'pv',
    '/',
    '',
    'google.com',
    'news',
    'email',
    'launch-1',
    'MX',
    'Veracruz',
    'Xalapa',
  ]);
});

test('missing source fields and missing cf give empty strings', async () => {
  const env = spyEnv();
  await handleEvent(post({ t: 'pv', p: '/' }), env);
  assert.deepEqual(env.writes[0].blobs.slice(3), ['', '', '', '', '', '', '']);
});

test('over-long or junk source fields are dropped, not a 400', async () => {
  const env = spyEnv();
  const res = await handleEvent(
    post({ t: 'pv', p: '/', r: 'a'.repeat(65), us: 'has space', um: 5, uc: 'OK_x!' }),
    env,
  );
  assert.equal(res.status, 204);
  assert.deepEqual(env.writes[0].blobs.slice(3, 7), ['', '', '', '']);
});

test('source fields are normalised: trimmed and lowercased', async () => {
  const env = spyEnv();
  await handleEvent(post({ t: 'pv', p: '/', r: ' Google.COM ', us: 'News' }), env);
  assert.deepEqual(env.writes[0].blobs.slice(3, 5), ['google.com', 'news']);
});

test('clicks keep the 3-blob layout even with source fields and cf', async () => {
  const env = spyEnv();
  await handleEvent(
    withCf({ t: 'click', id: 'cta', p: '/', r: 'x.com', us: 'a' }, { country: 'MX' }),
    env,
  );
  assert.deepEqual(env.writes[0], { blobs: ['click', '/', 'cta'], doubles: [1, 0, 0] });
});

// Runs the real public/e.js against a fake page; returns the beacon bodies it sent.
const EJS = readFileSync(new URL('../public/e.js', import.meta.url), 'utf8');
function runClient({
  storage,
  now = new Date(2026, 10, 23, 12),
  search = '',
  referrer = '',
  host = 'ivanaguirre.dev',
}) {
  const sent = [];
  const listeners = [];
  const ctx = {
    location: { search, pathname: '/en/', hostname: host },
    document: { cookie: '', referrer, addEventListener: (_t, fn) => listeners.push(fn) },
    navigator: { sendBeacon: (_u, body) => sent.push(JSON.parse(body)) },
    URLSearchParams,
    URL,
    JSON,
    localStorage: storage,
    Date: class extends Date {
      constructor(...a) {
        super(...(a.length ? a : [now]));
      }
    },
  };
  vm.runInNewContext(EJS, ctx);
  return { sent, listeners, ctx };
}
const memory = (init = {}) => {
  const m = { ...init };
  return { m, getItem: (k) => m[k] ?? null, setItem: (k, v) => (m[k] = v) };
};

test('client: first visit sends nd and nm and stores the local day and month', () => {
  const storage = memory();
  const { sent } = runClient({ storage });
  assert.deepEqual(sent, [{ t: 'pv', nd: 1, nm: 1, p: '/en/' }]);
  assert.deepEqual(storage.m, { ev_d: '2026-11-23', ev_m: '2026-11' });
});

test('client: same day sends no flags, next day only nd, next month both', () => {
  const storage = memory({ ev_d: '2026-11-23', ev_m: '2026-11' });
  assert.deepEqual(runClient({ storage }).sent, [{ t: 'pv', p: '/en/' }]);
  assert.deepEqual(runClient({ storage, now: new Date(2026, 10, 24) }).sent, [
    { t: 'pv', nd: 1, p: '/en/' },
  ]);
  assert.deepEqual(runClient({ storage, now: new Date(2026, 11, 1) }).sent, [
    { t: 'pv', nd: 1, nm: 1, p: '/en/' },
  ]);
});

test('client: storage that throws sends a plain pv and clicks still work', () => {
  const boom = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
  const { sent, listeners } = runClient({ storage: boom });
  assert.deepEqual(sent, [{ t: 'pv', p: '/en/' }]);
  listeners[0]({ target: { closest: () => ({ dataset: { track: 'cta' } }) } });
  assert.deepEqual(sent[1], { t: 'click', id: 'cta', p: '/en/' });
});

test('client: pv carries referrer host and UTMs, normalised; same-host referrer omitted', () => {
  const storage = memory({ ev_d: '2026-11-23', ev_m: '2026-11' });
  const a = runClient({
    storage,
    referrer: 'https://WWW.Google.com/search?q=x',
    search: `?utm_source= News &utm_medium=Email&utm_campaign=${'c'.repeat(80)}`,
  });
  assert.deepEqual(a.sent, [
    { t: 'pv', p: '/en/', r: 'google.com', us: 'news', um: 'email', uc: 'c'.repeat(64) },
  ]);
  const b = runClient({ storage, referrer: 'https://www.ivanaguirre.dev/es/' });
  assert.deepEqual(b.sent, [{ t: 'pv', p: '/en/' }]);
  const c = runClient({ storage, referrer: 'not a url' });
  assert.deepEqual(c.sent, [{ t: 'pv', p: '/en/' }]);
});

test('client: clicks do not carry source fields', () => {
  const { sent, listeners } = runClient({
    storage: memory(),
    referrer: 'https://google.com/',
    search: '?utm_source=a',
  });
  listeners[0]({ target: { closest: () => ({ dataset: { track: 'cta' } }) } });
  assert.deepEqual(sent[1], { t: 'click', id: 'cta', p: '/en/' });
});
