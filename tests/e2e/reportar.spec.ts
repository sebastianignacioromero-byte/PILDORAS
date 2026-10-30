import { expect, test } from '@playwright/test';

async function abrirFormulario(page: import('@playwright/test').Page) {
  await page.goto('medicamentos/losarvit-50-1/');
  // Simula un sitio conectado a Supabase.
  await page.locator('.reportar').evaluate((e) => {
    e.setAttribute('data-supabase-url', 'https://falso.supabase.co');
    e.setAttribute('data-supabase-clave', 'sb_publishable_prueba');
  });
  await page.getByText('Reportar un error en esta ficha').click();
}

test('envía un reporte y confirma', async ({ page }) => {
  let cuerpo: Record<string, unknown> = {};
  await page.route('https://falso.supabase.co/rest/v1/reportes', async (ruta) => {
    cuerpo = ruta.request().postDataJSON();
    await ruta.fulfill({ status: 201, body: '' });
  });
  await abrirFormulario(page);
  await page.getByLabel('¿Qué está mal?').fill('La forma del comprimido es ovalada, no redonda.');
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  await expect(page.getByText('Gracias. Revisaremos la ficha.')).toBeVisible();
  expect(cuerpo).toMatchObject({ medicamento_slug: 'losarvit-50-1', mensaje: 'La forma del comprimido es ovalada, no redonda.', contacto: null });
});

test('pide un mensaje antes de enviar', async ({ page }) => {
  await abrirFormulario(page);
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  await expect(page.getByText('Cuéntenos en al menos 5 caracteres qué está mal.')).toBeVisible();
});

test('avisa si el envío falla', async ({ page }) => {
  await page.route('https://falso.supabase.co/rest/v1/reportes', (ruta) => ruta.fulfill({ status: 500, body: '{}' }));
  await abrirFormulario(page);
  await page.getByLabel('¿Qué está mal?').fill('Dato incorrecto en la ficha');
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  await expect(page.getByText(/No pudimos enviar su reporte.*error 500/)).toBeVisible();
});
