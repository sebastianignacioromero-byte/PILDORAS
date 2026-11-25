import { expect, test, type Page, type Route } from '@playwright/test';

const SUPA = 'https://falso.supabase.co';
const usuario = { id: '00000000-0000-0000-0000-00000000000a', email: 'qf@ejemplo.cl', aud: 'authenticated', role: 'authenticated' };
const fila = (id: number, nombre: string, extra: Record<string, unknown> = {}) => ({
  id, slug: `ficha-${id}`, nombre_comercial: nombre, laboratorio: 'SAVAL', forma_farmaceutica: 'comprimido', liberacion: 'inmediata',
  forma_geometrica: 'redonda', ranura: 'sin_ranura', ranura_orientacion: 0, veredicto: 'se_puede_partir', criterio_codigo: 'SIN-RANURA-LI',
  nota_veredicto: null, estado: 'publicado', forma_revisada: false, editada_en_panel: false,
  principios: [{ dci: 'Aciclovir', slug: 'aciclovir', cantidad: 200, unidad: 'mg' }], ...extra,
});

async function simularSupabase(page: Page, { rol = 'admin' } = {}) {
  const guardados: Record<string, unknown>[] = [];
  const creadas: Record<string, unknown>[] = [];
  Object.assign(guardados, { creadas });
  let fichas = [fila(1, 'Aciclovir 200 mg'), fila(2, 'Alopurinol 100 mg'), fila(3, 'Atenolol 50 mg')];
  await page.route(`${SUPA}/**`, async (ruta: Route) => {
    const u = new URL(ruta.request().url());
    const json = (cuerpo: unknown, headers: Record<string, string> = {}) =>
      ruta.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-expose-headers': 'content-range', ...headers }, body: JSON.stringify(cuerpo) });
    if (ruta.request().method() === 'OPTIONS') return ruta.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (u.pathname === '/auth/v1/token') {
      const { password } = ruta.request().postDataJSON();
      if (password !== 'correcta') return ruta.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }) });
      return json({ access_token: 'token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: usuario });
    }
    if (u.pathname === '/auth/v1/user') return json(usuario);
    if (u.pathname === '/auth/v1/logout') return ruta.fulfill({ status: 204 });
    if (u.pathname === '/rest/v1/perfiles') return json([{ rol }]);
    if (u.pathname === '/rest/v1/principios_activos') return json([{ dci: 'Aciclovir' }, { dci: 'Alopurinol' }]);
    if (u.pathname === '/rest/v1/v_admin_fichas') {
      if (u.searchParams.get('id') === 'eq.99') return json([fila(99, 'Ficha Nueva 10 mg', { estado: 'borrador', criterio_codigo: null, principios: [] })]);
      if (u.searchParams.get('select') === 'laboratorio') return json(fichas.map((f) => ({ laboratorio: f.laboratorio })));
      const lista = u.searchParams.get('forma_revisada') === 'eq.false' ? fichas.filter((f) => !f.forma_revisada) : fichas;
      return json(lista, { 'content-range': `0-${lista.length - 1}/${lista.length}` });
    }
    if (u.pathname === '/rest/v1/rpc/crear_ficha') {
      creadas.push(ruta.request().postDataJSON());
      return json([{ id: 99, slug: 'ficha-nueva-10-mg-99' }]);
    }
    if (u.pathname === '/rest/v1/rpc/guardar_ficha') {
      const { p } = ruta.request().postDataJSON();
      guardados.push(p);
      fichas = fichas.map((f) => (f.id === p.id ? { ...f, forma_geometrica: p.forma_geometrica, ranura: p.ranura, criterio_codigo: p.criterio, forma_revisada: true } : f));
      return ruta.fulfill({ status: 204 });
    }
    return ruta.fulfill({ status: 404, body: '{}' });
  });
  return guardados;
}

async function entrar(page: Page, clave = 'correcta') {
  await page.goto('admin/');
  await page.getByLabel('Correo').fill('qf@ejemplo.cl');
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.describe('panel de administración', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'escritorio', 'El panel se prueba en escritorio'));

  test('no se indexa ni aparece en el sitemap', async ({ page, request, baseURL }) => {
    await page.goto('admin/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    const sitemap = await (await request.get(new URL('sitemap-0.xml', baseURL).href)).text();
    expect(sitemap).not.toContain('/admin/');
  });

  test('rechaza una contraseña incorrecta', async ({ page }) => {
    await simularSupabase(page);
    await entrar(page, 'mala');
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
  });

  test('un usuario que no es administrador no ve el editor', async ({ page }) => {
    await simularSupabase(page, { rol: 'usuario' });
    await entrar(page);
    await expect(page.getByText('Su usuario no tiene permisos de administrador.')).toBeVisible();
    await expect(page.locator('.lista-fichas')).toHaveCount(0);
  });

  test('lista las fichas sin revisar y una forma predefinida actualiza dibujo y criterio', async ({ page }) => {
    await simularSupabase(page);
    await entrar(page);
    await expect(page.locator('.lista-fichas li')).toHaveCount(3);
    await page.locator('.lista-fichas li').first().click();
    await expect(page.getByLabel('Nombre comercial')).toHaveValue('Aciclovir 200 mg');
    await page.getByRole('button', { name: /Redondo, 1 ranura/ }).click();
    await expect(page.locator('.vista-previa svg')).toHaveAttribute('aria-label', 'Comprimido redondo con ranura simple');
    await expect(page.getByLabel('Criterio', { exact: true })).toHaveValue('RANURA-LI');
  });

  test('guardar y siguiente guarda la ficha y abre la próxima', async ({ page }) => {
    const guardados = await simularSupabase(page);
    await entrar(page);
    await page.locator('.lista-fichas li').first().click();
    await page.getByRole('button', { name: /Cuadrado, 2 ranuras en cruz/ }).click();
    await page.getByRole('button', { name: 'Guardar y siguiente' }).click();
    await expect(page.getByLabel('Nombre comercial')).toHaveValue('Alopurinol 100 mg');
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({ id: 1, forma_geometrica: 'cuadrada', ranura: 'doble_cruz', criterio: 'RANURA-LI' });
    await expect(page.locator('.lista-fichas li')).toHaveCount(2);
  });

  test('avisa antes de descartar cambios sin guardar', async ({ page }) => {
    await simularSupabase(page);
    await entrar(page);
    await page.locator('.lista-fichas li').first().click();
    await page.getByRole('button', { name: /Redondo, 1 ranura/ }).click();
    let mensaje = '';
    page.once('dialog', (d) => { mensaje = d.message(); void d.dismiss(); });
    await page.locator('.lista-fichas li').nth(1).click();
    expect(mensaje).toContain('cambios sin guardar');
    await expect(page.getByLabel('Nombre comercial')).toHaveValue('Aciclovir 200 mg');
  });

  test('crea una ficha nueva en borrador y la abre en el editor', async ({ page }) => {
    const guardados = await simularSupabase(page);
    await entrar(page);
    await page.getByRole('button', { name: 'Nueva ficha' }).click();
    await page.getByLabel('Nombre de la nueva ficha').fill('Ficha Nueva 10 mg');
    await page.getByLabel('Laboratorio de la nueva ficha').fill('Laboratorio X');
    await page.getByRole('button', { name: 'Crear ficha' }).click();
    await expect(page.getByLabel('Nombre comercial')).toHaveValue('Ficha Nueva 10 mg');
    await expect(page.getByLabel('Estado', { exact: true })).toHaveValue('borrador');
    expect((guardados as unknown as { creadas: unknown[] }).creadas).toEqual([{ p_nombre: 'Ficha Nueva 10 mg', p_laboratorio: 'Laboratorio X' }]);
  });

  test('no crea una ficha sin nombre', async ({ page }) => {
    await simularSupabase(page);
    await entrar(page);
    await page.getByRole('button', { name: 'Nueva ficha' }).click();
    await page.getByRole('button', { name: 'Crear ficha' }).click();
    await expect(page.getByText('Escriba el nombre comercial.')).toBeVisible();
  });

  test('no deja publicar sin criterio', async ({ page }) => {
    const guardados = await simularSupabase(page);
    await entrar(page);
    await page.locator('.lista-fichas li').first().click();
    await page.getByLabel('Criterio', { exact: true }).selectOption('');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Una ficha publicada necesita criterio.')).toBeVisible();
    expect(guardados).toHaveLength(0);
  });
});
