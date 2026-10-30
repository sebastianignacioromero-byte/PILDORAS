import { expect, test } from '@playwright/test';

test('buscar, entrar a la DCI y abrir una ficha', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Busque por marca o principio activo').fill('losartan');
  await page.getByRole('link', { name: /Principio activo\s*Losartán/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Losartán: ¿se puede partir?');
  await page.getByRole('link', { name: /Losarvit 50\b/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Losarvit 50');
  await expect(page.getByText('Sí, se puede partir')).toBeVisible();
  await expect(page.getByText('Imagen ilustrativa, no a escala')).toBeVisible();
  await expect(page.getByRole('heading', { name: '¿Dudas con su tratamiento?' })).toBeVisible();
  await expect(page.getByText('Qué hacer', { exact: true })).toBeVisible();
});

test('la página de un criterio explica por qué, qué hacer y cómo reconocerlo', async ({ page }) => {
  await page.goto('criterios/lib-prolongada/');
  for (const t of ['Por qué', 'Qué hacer', 'Cómo reconocerlo en el envase']) {
    await expect(page.getByRole('heading', { name: t })).toBeVisible();
  }
});

test('avisa cuando no encuentra el medicamento', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Busque por marca o principio activo').fill('xyz');
  await expect(page.getByText('No encontramos ese medicamento')).toBeVisible();
});

test('una ficha que no se debe partir muestra su sello y la ranura decorativa', async ({ page }) => {
  await page.goto('medicamentos/metrexal-2-5-13/');
  await expect(page.getByText('No se debe partir', { exact: true })).toBeVisible();
  await expect(page.getByText('Ranura decorativa: no indica que se pueda partir')).toBeVisible();
});

test('marca el sitio de ejemplo como no indexable', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.getByText(/Datos de ejemplo/)).toBeVisible();
});

test('Enter tras escribir rápido abre el medicamento de la consulta actual, no el de la anterior', async ({ page }) => {
  await page.goto('./');
  const campo = page.getByLabel('Busque por marca o principio activo');
  await campo.fill('gl');
  await expect(page.getByRole('link', { name: /Glucoret 850/ })).toBeVisible();
  await campo.fill('gastrozol');
  await campo.press('Enter');
  await expect(page).toHaveURL(/medicamentos\/gastrozol-20-8\/$/);
});

test('el bloque de contacto lleva a la web de Curie, sin WhatsApp', async ({ page }) => {
  for (const ruta of ['medicamentos/losarvit-50-1/', 'contacto/', 'privacidad/']) {
    await page.goto(ruta);
    await expect(page.getByText(/whatsapp/i)).toHaveCount(0);
  }
  await page.goto('contacto/');
  await expect(page.getByRole('link', { name: 'Visitar Farmacias Curie' })).toHaveAttribute('href', 'https://farmaciascurie.cl');
});

test('muestra el logo y declara íconos y miniatura para compartir', async ({ page, request, baseURL }) => {
  await page.goto('./');
  const logo = page.locator('header img[src$="logo.svg"]');
  await expect(logo).toBeVisible();
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toMatch(/^https:\/\/.+\/og\.png$/);
  for (const sel of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
    const href = await page.locator(sel).getAttribute('href');
    expect((await request.get(new URL(href!, baseURL).href)).status()).toBe(200);
  }
  expect((await request.get(new URL('og.png', baseURL).href)).status()).toBe(200);
});
