import { defineConfig } from 'astro/config';

export default defineConfig({
  // Absolute URLs need this (the contact form's redirect target). Change it with the domain.
  site: 'https://mi-portafolio.bube-ncio8.workers.dev',
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
