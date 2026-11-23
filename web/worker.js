import { handleEvent } from './events.js';

// Static assets are served as-is; this bounces www to the apex and counts events at /e.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.ivanaguirre.dev') {
      url.hostname = 'ivanaguirre.dev';
      return Response.redirect(url.href, 301);
    }
    if (url.pathname === '/e') return handleEvent(request, env);
    return env.ASSETS.fetch(request);
  },
};
