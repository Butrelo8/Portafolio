// Counts page views and clicks on [data-track]. Sends only the event name, path and button id.
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
  send({ t: 'pv', ...flags });
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest?.('[data-track]');
    if (el) send({ t: 'click', id: el.dataset.track });
  });
})();
