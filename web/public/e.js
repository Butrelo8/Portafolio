// Counts page views and clicks on [data-track]. Sends only the event name, path and button id; a page view also carries the referrer host and UTM tags.
// A page view also says whether it is this device's first of the day (nd) or month (nm): two dates in
// localStorage (ev_d, ev_m), no id. Storage that throws sends nothing extra.
(() => {
  const nolog = new URLSearchParams(location.search).get('nolog');
  if (nolog === '1' || nolog === '0') {
    document.cookie = `nolog=${nolog}; path=/; max-age=${nolog === '1' ? 31536000 : 0}; SameSite=Lax`;
  }
  const send = (e) => navigator.sendBeacon('/e', JSON.stringify({ ...e, p: location.pathname }));
  let flags = {};
  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const day = `${month}-${pad(now.getDate())}`;
    const f = {};
    if (localStorage.getItem('ev_d') !== day) {
      f.nd = 1;
      localStorage.setItem('ev_d', day);
    }
    if (localStorage.getItem('ev_m') !== month) {
      f.nm = 1;
      localStorage.setItem('ev_m', month);
    }
    flags = f;
  } catch {}
  const src = {};
  try {
    const host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, '');
    if (host && host !== location.hostname.toLowerCase().replace(/^www\./, '')) src.r = host;
  } catch {}
  const q = new URLSearchParams(location.search);
  for (const [k, name] of [
    ['us', 'utm_source'],
    ['um', 'utm_medium'],
    ['uc', 'utm_campaign'],
  ]) {
    const v = (q.get(name) ?? '').trim().toLowerCase().slice(0, 64);
    if (v) src[k] = v;
  }
  send({ t: 'pv', ...flags, ...src });
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest?.('[data-track]');
    if (el) send({ t: 'click', id: el.dataset.track });
  });
})();
