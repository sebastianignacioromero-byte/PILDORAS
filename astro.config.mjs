// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Mientras no exista el subdominio de Curie, el sitio vive en GitHub Pages bajo /PILDORAS.
const site = process.env.SITIO_URL || 'https://sebastianignacioromero-byte.github.io';
const base = process.env.SITIO_BASE ?? '/PILDORAS';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
