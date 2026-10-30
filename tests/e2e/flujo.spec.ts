import { expect, test } from '@playwright/test';

test('buscar, entrar a la DCI y abrir una ficha', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Busque por marca o principio activo').fill('losartan');
  await page.getByRole('link', { name: /Principio activo\s*Losartán/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('losartán');
  await page.getByRole('link', { name: /Losarvit 50\b/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Losarvit 50');
  await expect(page.getByText('Sí, se puede partir')).toBeVisible();
  await expect(page.getByText('Imagen ilustrativa, no a escala')).toBeVisible();
  await expect(page.getByRole('heading', { name: '¿Dudas con su tratamiento?' })).toBeVisible();
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
