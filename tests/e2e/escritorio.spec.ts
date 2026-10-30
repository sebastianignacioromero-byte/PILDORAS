import { expect, test, type Locator } from '@playwright/test';

const caja = async (l: Locator) => (await l.boundingBox())!;

test.describe('distribución según el ancho', () => {
  test('la ficha usa dos columnas en escritorio y una en teléfono', async ({ page }, info) => {
    await page.goto('medicamentos/losarvit-50-1/');
    const sello = await caja(page.locator('.sello').first());
    const dibujo = await caja(page.locator('figure').first());
    if (info.project.name === 'escritorio') {
      expect(dibujo.x).toBeGreaterThan(sello.x + sello.width - 1);
    } else {
      expect(dibujo.y).toBeGreaterThan(sello.y + sello.height - 1);
    }
  });

  test('el inicio pone las explicaciones junto al buscador en escritorio', async ({ page }, info) => {
    await page.goto('./');
    const buscador = await caja(page.locator('.buscador'));
    const veredictos = await caja(page.locator('.veredictos'));
    if (info.project.name === 'escritorio') expect(veredictos.x).toBeGreaterThan(buscador.x + buscador.width - 1);
    else expect(veredictos.y).toBeGreaterThan(buscador.y);
  });

  test('las marcas de una DCI se ordenan en grilla en escritorio', async ({ page }, info) => {
    await page.goto('dci/losartan/');
    const items = page.locator('.marcas > li');
    const [a, b] = [await caja(items.nth(0)), await caja(items.nth(1))];
    if (info.project.name === 'escritorio') expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    else expect(b.y).toBeGreaterThan(a.y);
  });

  test('el contenido aprovecha el ancho en escritorio', async ({ page }, info) => {
    test.skip(info.project.name !== 'escritorio');
    await page.goto('./');
    expect((await caja(page.locator('main'))).width).toBeGreaterThan(1000);
  });
});
