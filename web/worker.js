// Static assets are served as-is; this only bounces www to the apex (Workers need a default export).
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.ivanaguirre.dev') {
      url.hostname = 'ivanaguirre.dev';
      return Response.redirect(url.href, 301);
    }
    return env.ASSETS.fetch(request);
  },
};
