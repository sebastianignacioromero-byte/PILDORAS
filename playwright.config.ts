import { defineConfig } from '@playwright/test';

const puerto = 4321;
const base = (process.env.SITIO_BASE ?? '/PILDORAS').replace(/\/?$/, '/');

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${puerto}${base}` },
  webServer: {
    command: `npm run build && npx astro preview --port ${puerto}`,
    url: `http://localhost:${puerto}${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'telefono', use: { browserName: 'chromium', viewport: { width: 375, height: 812 } } },
    { name: 'escritorio', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
});
