import { describe, expect, it } from 'vitest';
import { analizarProducto, leerConcentraciones } from '../../scripts/carga/analizar';

describe('analizarProducto', () => {
  it.each([
    ['ACICLOVIR 200MG X 24C ML', { base: 'ACICLOVIR 200MG', cantidadCaja: 24, sigla: 'C', laboratorio: 'ML' }],
    ['AERIUS 5MG X 30CR MSD', { base: 'AERIUS 5MG', cantidadCaja: 30, sigla: 'CR', laboratorio: 'MSD' }],
    ['ESOMEPRAZOL 20MG X 30CRE OPK', { base: 'ESOMEPRAZOL 20MG', sigla: 'CRE', laboratorio: 'OPK' }],
    ['FERRANEM X 30CLP CHE', { base: 'FERRANEM', sigla: 'CLP', laboratorio: 'CHE' }],
    ['SUBELAN OR 75MG X 30CLPO', { base: 'SUBELAN OR 75MG', sigla: 'CLPO', laboratorio: '' }],
    ['CALCITRIOL 0,5MCG X 30CPB REU', { base: 'CALCITRIOL 0,5MCG', sigla: 'CPB', laboratorio: 'REU' }],
    ['PLANIDEN ODT 10MG X 30CD ABB (OF1)', { base: 'PLANIDEN ODT 10MG', sigla: 'CD', laboratorio: 'ABB' }],
    ['ALDROX 70MG X 10CR (CEN)', { sigla: 'CR', laboratorio: 'CEN' }],
    ['STREPFEN X 16 CDB REC', { base: 'STREPFEN', cantidadCaja: 16, sigla: 'CDB', laboratorio: 'REC' }],
    ['BETAHISTINA 24MG X30 ASC', { base: 'BETAHISTINA 24MG', cantidadCaja: 30, sigla: 'ASC', laboratorio: '' }],
    ['HEMOVAL 100MG X 40CM (CEN)', { sigla: 'CM', laboratorio: 'CEN' }],
    ['ALOPURINOL 100MG X 20C SPH (CV)', { sigla: 'C', laboratorio: 'SPH' }],
  ])('%s', (nombre, esperado) => {
    expect(analizarProducto(nombre)).toMatchObject(esperado);
  });

  it('devuelve null si el nombre no tiene la forma "X <cantidad><sigla>"', () => {
    expect(analizarProducto('CASEN ENEMA ADULTO (CEN)')).toBeNull();
  });
});

describe('leerConcentraciones', () => {
  it('lee una concentración simple con coma decimal', () => {
    expect(leerConcentraciones('CALCITRIOL 0,5MCG')).toEqual([{ cantidad: 0.5, unidad: 'mcg' }]);
  });
  it('reparte una asociación con barra y una sola unidad', () => {
    expect(leerConcentraciones('ILTUX HCT 40MG/25MG')).toEqual([{ cantidad: 40, unidad: 'mg' }, { cantidad: 25, unidad: 'mg' }]);
    expect(leerConcentraciones('LOSARTAN/HCT 50/12,5MG')).toEqual([{ cantidad: 50, unidad: 'mg' }, { cantidad: 12.5, unidad: 'mg' }]);
  });
  it('lee gramos, UI y miles con punto', () => {
    expect(leerConcentraciones('NOVAMOX 1G')).toEqual([{ cantidad: 1, unidad: 'g' }]);
    expect(leerConcentraciones('DEBLAX 100.000UI')).toEqual([{ cantidad: 100000, unidad: 'UI' }]);
  });
  it('acepta espacio entre número y unidad', () => {
    expect(leerConcentraciones('CINACALCET 60 MG')).toEqual([{ cantidad: 60, unidad: 'mg' }]);
  });
  it('devuelve vacío sin concentración', () => {
    expect(leerConcentraciones('FERRANEM')).toEqual([]);
  });
});
