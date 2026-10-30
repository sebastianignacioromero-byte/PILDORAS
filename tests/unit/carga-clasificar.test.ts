import { describe, expect, it } from 'vitest';
import { clasificar, type EntradaClasificar } from '../../scripts/carga/clasificar';

const ficha = (nombre: string, sigla: string, dcis: string[] = ['x'], concentraciones = [{ cantidad: 10, unidad: 'mg' }]): EntradaClasificar =>
  ({ nombre, sigla, dcis, concentraciones });

describe('clasificar por sigla de unidad', () => {
  it.each([
    ['C', 'SIN-RANURA-LI', 'comprimido', 'inmediata'],
    ['CR', 'RECUB-ESTETICO', 'comprimido_recubierto', 'inmediata'],
    ['GR', 'RECUB-ESTETICO', 'gragea', 'inmediata'],
    ['CRE', 'ENTERICO', 'comprimido_recubierto', 'gastrorresistente'],
    ['CPRE', 'ENTERICO', 'capsula_dura', 'gastrorresistente'],
    ['CLP', 'LIB-PROLONGADA', 'comprimido', 'prolongada'],
    ['CLPO', 'LIB-OSMOTICA', 'comprimido_recubierto', 'osmotica'],
    ['CP', 'NO-SOLIDA', 'capsula_dura', 'inmediata'],
    ['CPB', 'NO-SOLIDA', 'capsula_blanda', 'inmediata'],
    ['CB', 'NO-SOLIDA', 'capsula_blanda', 'inmediata'],
    ['CEF', 'EFERVESCENTE', 'comprimido_efervescente', 'efervescente'],
    ['CSL', 'SUBLINGUAL', 'comprimido_sublingual', 'sublingual'],
    ['CBD', 'BUCODISPERSABLE', 'comprimido_bucodispersable', 'bucodispersable'],
    ['CDB', 'BUCODISPERSABLE', 'comprimido_bucodispersable', 'bucodispersable'],
    ['CM', 'MASTICABLE', 'comprimido_masticable', 'masticable'],
    ['CD', 'DISPERSABLE', 'comprimido_dispersable', 'inmediata'],
    ['OV', 'VAGINAL', 'comprimido_vaginal', 'inmediata'],
    ['CV', 'VAGINAL', 'capsula_blanda', 'inmediata'],
    ['CPV', 'VAGINAL', 'capsula_blanda', 'inmediata'],
  ])('%s → %s', (sigla, criterio, forma, liberacion) => {
    const r = clasificar(ficha('PRODUCTO 10MG', sigla));
    expect(r).toMatchObject({ criterio, formaFarmaceutica: forma, liberacion, estado: 'publicado' });
  });

  it('C queda sin ranura y con la alerta de ranura pendiente', () => {
    const r = clasificar(ficha('ACICLOVIR 200MG', 'C'));
    expect(r).toMatchObject({ ranura: 'sin_ranura', formaGeometrica: 'redonda' });
    expect(r.alertas).toContain('ranura pendiente');
  });

  it('las cápsulas se dibujan como cápsula', () => {
    expect(clasificar(ficha('X', 'CP')).formaGeometrica).toBe('capsular');
  });

  it('una sigla desconocida deja la ficha en borrador sin criterio', () => {
    const r = clasificar(ficha('GAVISCON COMPRIMIDOS', 'U'));
    expect(r).toMatchObject({ criterio: null, estado: 'borrador' });
    expect(r.alertas).toContain('sigla desconocida: U');
  });
});

describe('clasificar por siglas del nombre', () => {
  it.each([
    ['SUBELAN OR 75MG', 'CR', 'LIB-OSMOTICA', 'osmotica'],
    ['NIFELAN OROS 30MG', 'C', 'LIB-OSMOTICA', 'osmotica'],
    ['ANFEBUTAMONA XL 150MG', 'CR', 'LIB-PROLONGADA', 'prolongada'],
    ['METFORMINA XR 750MG', 'C', 'LIB-PROLONGADA', 'prolongada'],
    ['TRAMADOL RETARD 100MG', 'C', 'LIB-PROLONGADA', 'prolongada'],
    ['QUETIAPINA LP 50MG', 'CR', 'LIB-PROLONGADA', 'prolongada'],
    ['DOLGENAL SL 30MG', 'C', 'SUBLINGUAL', 'sublingual'],
    ['PLANIDEN ODT 10MG', 'CD', 'BUCODISPERSABLE', 'bucodispersable'],
    ['MIRTAZAPINA BD 30MG', 'CBD', 'BUCODISPERSABLE', 'bucodispersable'],
    ['TALOXA BUCODISPERSABLE 20MG', 'L', 'BUCODISPERSABLE', 'bucodispersable'],
    ['DROPOL EFERVESCENTE 1G', 'C', 'EFERVESCENTE', 'efervescente'],
    ['ASPIRINA EC 100MG', 'C', 'ENTERICO', 'gastrorresistente'],
  ])('%s (%s) → %s', (nombre, sigla, criterio, liberacion) => {
    expect(clasificar(ficha(nombre, sigla))).toMatchObject({ criterio, liberacion, estado: 'publicado' });
  });

  it('BDH es un laboratorio, no bucodispersable', () => {
    expect(clasificar(ficha('ATORVASTATINA BDH 20MG', 'CR')).criterio).toBe('RECUB-ESTETICO');
  });

  it('una sigla dentro de otra palabra no cuenta', () => {
    expect(clasificar(ficha('ORLISTAT 120MG', 'CP')).criterio).toBe('NO-SOLIDA');
    expect(clasificar(ficha('SERTRALINA 50MG', 'CR')).criterio).toBe('RECUB-ESTETICO');
  });
});

describe('orden de evaluación', () => {
  it('un fármaco peligroso en comprimido simple no se debe partir', () => {
    expect(clasificar(ficha('METOTREXATO 2,5MG', 'C', ['METOTREXATO']))).toMatchObject({ criterio: 'PELIGROSO', estado: 'publicado' });
  });
  it('una cápsula de un fármaco peligroso sigue siendo NO-SOLIDA', () => {
    expect(clasificar(ficha('CAPECITABINA 500MG', 'CP', ['CAPECITABINA'])).criterio).toBe('NO-SOLIDA');
  });
  it('MTE va en borrador', () => {
    expect(clasificar(ficha('DIGOXINA 0,25MG', 'C', ['DIGOXINA']))).toMatchObject({ criterio: 'MTE', estado: 'borrador' });
  });
  it('MTE reconoce sales y nombres compuestos', () => {
    expect(clasificar(ficha('LITIO 300MG', 'C', ['LITIO CARBONATO'])).criterio).toBe('MTE');
    expect(clasificar(ficha('VALCOTE 500MG', 'CRE', ['DIVALPROATO SODICO'])).criterio).toBe('ENTERICO');
    expect(clasificar(ficha('ACIDO VALPROICO 200MG', 'C', ['ÁCIDO VALPROICO'])).criterio).toBe('MTE');
  });
  it('la levotiroxina en mcg queda como MTE en borrador', () => {
    const r = clasificar(ficha('EUTIROX 100MCG', 'C', ['LEVOTIROXINA SODICA'], [{ cantidad: 100, unidad: 'mcg' }]));
    expect(r).toMatchObject({ criterio: 'MTE', estado: 'borrador' });
  });
  it('microgramos va en borrador', () => {
    const r = clasificar(ficha('DESMOPRESINA 120MCG', 'C', ['DESMOPRESINA'], [{ cantidad: 120, unidad: 'mcg' }]));
    expect(r).toMatchObject({ criterio: 'DOSIS-MCG', estado: 'borrador' });
  });
  it('microgramos no aplica a cápsulas', () => {
    expect(clasificar(ficha('CALCITRIOL 0,5MCG', 'CPB', ['CALCITRIOL'], [{ cantidad: 0.5, unidad: 'mcg' }])).criterio).toBe('NO-SOLIDA');
  });
  it('una ficha sin principio activo queda en borrador', () => {
    const r = clasificar(ficha('ARIVITAE 15MG', 'C', []));
    expect(r.estado).toBe('borrador');
    expect(r.alertas).toContain('sin principio activo');
  });
});
