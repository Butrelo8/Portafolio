import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  // The site shipped once with Spanish under /es/; keep those URLs alive.
  redirects: {
    '/es': '/',
    '/es/about': '/about',
    '/es/projects/[slug]': '/projects/[slug]',
  },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
