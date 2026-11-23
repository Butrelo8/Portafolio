import assert from 'node:assert/strict';
import { test } from 'node:test';
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
  assert.deepEqual(parseEvent('{"t":"pv","p":"/about"}'), ['pv', '/about', '']);
  assert.deepEqual(parseEvent('{"t":"click","id":"cta-start","p":"/en/"}'), [
    'click',
    '/en/',
    'cta-start',
  ]);
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
  assert.deepEqual(env.writes, [{ blobs: ['pv', '/about', ''], doubles: [1] }]);
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
