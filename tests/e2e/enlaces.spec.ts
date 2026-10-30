import { expect, test } from '@playwright/test';

const PAGINAS = ['./', 'dci/', 'dci/losartan/', 'medicamentos/losarvit-d-50-12-5-4/', 'criterios/', 'criterios/lib-prolongada/', 'contacto/'];

for (const ruta of PAGINAS) {
  test(`${ruta}: enlaces y recursos internos responden 200`, async ({ page, request, baseURL }) => {
    const origen = new URL(baseURL!).origin;
    const fallidos: string[] = [];
    page.on('response', (r) => {
      if (r.url().startsWith(origen) && r.status() >= 400) fallidos.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(ruta, { waitUntil: 'networkidle' });
    const enlaces = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
    const internos = [...new Set(enlaces.filter((h) => h.startsWith(origen)).map((h) => h.split('#')[0]))];
    for (const h of internos) {
      const r = await request.get(h);
      if (r.status() !== 200) fallidos.push(`${r.status()} ${h}`);
    }
    expect(fallidos).toEqual([]);
  });

  test(`${ruta}: no hay scroll horizontal`, async ({ page }) => {
    await page.goto(ruta);
    const ancho = page.viewportSize()!.width;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(ancho);
  });
}
