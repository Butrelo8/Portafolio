// Counts page views and clicks on [data-track]. Sends only the event name, path and button id.
(() => {
  const nolog = new URLSearchParams(location.search).get('nolog');
  if (nolog === '1' || nolog === '0') {
    document.cookie = `nolog=${nolog}; path=/; max-age=${nolog === '1' ? 31536000 : 0}; SameSite=Lax`;
  }
  const send = (e) => navigator.sendBeacon('/e', JSON.stringify({ ...e, p: location.pathname }));
  send({ t: 'pv' });
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest?.('[data-track]');
    if (el) send({ t: 'click', id: el.dataset.track });
  });
})();
