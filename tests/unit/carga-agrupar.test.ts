import { describe, expect, it } from 'vitest';
import { agruparFichas, nombreVisible, type FilaStock } from '../../scripts/carga/agrupar';

const fila = (producto: string, variante = '', tipo = 'MEDICAMENTO', ean = '1'): FilaStock => ({ tipo, producto, variante, ean });

describe('agruparFichas', () => {
  it('junta las cajas de distinto tamaño en una ficha', () => {
    const f = agruparFichas([fila('ALEXIA 120MG X 10CR SAV', 'FEXOFENADINA'), fila('ALEXIA 120MG X 30CR SAV', 'FEXOFENADINA')]);
    expect(f).toHaveLength(1);
    expect(f[0].productos).toEqual(['ALEXIA 120MG X 10CR SAV', 'ALEXIA 120MG X 30CR SAV']);
  });
  it('separa el mismo producto de distinto laboratorio', () => {
    expect(agruparFichas([fila('ALDROX 70MG X 10CR (CEN)', 'ALENDRONATO'), fila('ALDROX 70MG X 10CR PAS', 'ALENDRONATO')])).toHaveLength(2);
  });
  it('excluye corto vencimiento, otros tipos y formas que no son comprimidos ni cápsulas', () => {
    expect(agruparFichas([
      fila('ALOPURINOL 100MG X 20C SPH (CV)', 'ALOPURINOL', 'CORTO VENCIMIENTO'),
      fila('ABRILAR JARABE X 100ML PHI', '', 'NATURALES Y HOMEOPATICOS'),
      fila('3A OFTENO X 5ML SOP', 'DICLOFENACO 0,1%'),
    ])).toEqual([]);
  });
  it('limpia la Variante y reparte la concentración en una asociación', () => {
    const [f] = agruparFichas([fila('LOSARVIT D 50/12,5MG X 30CR SAV', 'LOSARTAN, HIDROCLOROTIAZIDA (BE)')]);
    expect(f.principios).toEqual([
      { dci: 'Losartan', cantidad: 50, unidad: 'mg' },
      { dci: 'Hidroclorotiazida', cantidad: 12.5, unidad: 'mg' },
    ]);
    expect(f.alertas).not.toContain('principio activo inferido');
  });
  it('infiere el principio activo de un genérico sin Variante, sin alerta si ya es conocido', () => {
    const f = agruparFichas([fila('ALOPURINOL 100MG X 20C SPH', '(BE)'), fila('ZYLOPRIM 300MG X 20C GSK', 'ALOPURINOL')]);
    const alo = f.find((x) => x.productos[0].startsWith('ALOPURINOL'))!;
    expect(alo.principios[0]).toMatchObject({ dci: 'Alopurinol', cantidad: 100 });
    expect(alo.alertas).not.toContain('principio activo inferido');
  });
  it('marca el principio activo inferido cuando no es conocido', () => {
    const [f] = agruparFichas([fila('ARIVITAE 15MG X 30C ABB', '(BE)')]);
    expect(f.principios[0].dci).toBe('Arivitae');
    expect(f.alertas).toContain('principio activo inferido');
  });
  it('quita palabras de forma al inferir el principio activo', () => {
    const [f] = agruparFichas([fila('CLOTRIMAZOL OVULOS 100MG X 6OV LCH', '')]);
    expect(f.principios[0].dci).toBe('Clotrimazol');
  });
  it('genera slugs únicos y estables', () => {
    const f = agruparFichas([fila('ACICLOVIR 200MG X 24C ML', 'ACICLOVIR'), fila('ACICLOVIR 200MG X 24CR ML', 'ACICLOVIR')]);
    expect(f.map((x) => x.slug)).toEqual(['aciclovir-200mg-ml', 'aciclovir-200mg-ml-cr']);
  });
  it('clasifica cada ficha', () => {
    const [f] = agruparFichas([fila('ESOMEPRAZOL 20MG X 30CRE OPK', 'ESOMEPRAZOL')]);
    expect(f).toMatchObject({ criterio: 'ENTERICO', estado: 'publicado', laboratorio: 'OPK', sigla: 'CRE' });
  });
});

describe('casos reales del stock', () => {
  it('no corta la Variante en la coma decimal y toma la dosis de ahí si el nombre no la trae', () => {
    const [f] = agruparFichas([fila('DAL X 28CR ABB', 'DESOGESTREL 0,15, ETINILESTRADIOL 0,02')]);
    expect(f.principios).toEqual([
      { dci: 'Desogestrel', cantidad: 0.15, unidad: 'mg' },
      { dci: 'Etinilestradiol', cantidad: 0.02, unidad: 'mg' },
    ]);
    expect(f.alertas).toContain('unidad asumida: mg');
  });
  it('asume mg en una asociación sin unidad cuando las cantidades calzan', () => {
    const [f] = agruparFichas([fila('PROLOPA 200/50 X 30C ROC', 'LEVODOPA, BENSERAZIDA')]);
    expect(f.principios.map((p) => [p.cantidad, p.unidad])).toEqual([[200, 'mg'], [50, 'mg']]);
    expect(f.alertas).toContain('unidad asumida: mg');
  });
  it('una marca sin dosis se publica igual, con alerta', () => {
    const [f] = agruparFichas([fila('VESNIDAN X 30CR EUR', 'DIOSMINA, HESPERIDINA')]);
    expect(f.principios.map((p) => p.cantidad)).toEqual([null, null]);
    expect(f.estado).toBe('publicado');
    expect(f.alertas).toContain('concentración ilegible');
  });
  it('descarta inyectables y lápices aunque su unidad sea U o UN', () => {
    expect(agruparFichas([
      fila('NOVORAPID PENFILL 3ML X 5UN NOV (REFRI)', 'INSULINA'),
      fila('VIADIL COMPUESTO INYECTABLE X 2UN PHI', 'PARGEVERINA, METAMIZOL'),
    ])).toEqual([]);
  });
  it('con unidad U o UN solo conserva comprimidos y cápsulas', () => {
    const f = agruparFichas([
      fila('PARCHE SALONPAS X 10U AND', ''),
      fila('SUPOSITORIOS GLICERINA ADULTO 3G X 10U VAL', ''),
      fila('ASERTIA 20MCG/24H X 1UN (CEN)', 'LEVONORGESTREL'),
      fila('GAVISCON COMPRIMIDOS X 16U REC', 'ALGINATO'),
    ]);
    expect(f.map((x) => x.productos[0])).toEqual(['GAVISCON COMPRIMIDOS X 16U REC']);
    expect(f[0].estado).toBe('borrador');
  });
  it('separa una asociación inferida del nombre y asume mg', () => {
    const [f] = agruparFichas([fila('AMOXICILINA/A.CLAVULANICO 875/125 X 14CR ASC', '')]);
    expect(f.principios).toEqual([
      { dci: 'Amoxicilina', cantidad: 875, unidad: 'mg' },
      { dci: 'A.clavulanico', cantidad: 125, unidad: 'mg' },
    ]);
  });
  it('asume mg para una sola cifra sin unidad cuando hay un principio activo', () => {
    const [f] = agruparFichas([fila('CARVEDILOL 6,25 X 30CR DFM', '')]);
    expect(f.principios).toEqual([{ dci: 'Carvedilol', cantidad: 6.25, unidad: 'mg' }]);
    expect(f.alertas).toContain('unidad asumida: mg');
  });
  it('no asume mg en una cifra que es parte del nombre de una asociación', () => {
    const [f] = agruparFichas([fila('DIXI 35 X 21CR ABB', 'CIPROTERONA, ETINILESTRADIOL')]);
    expect(f.principios.map((p) => p.cantidad)).toEqual([null, null]);
  });
  it('MASTICABLE en el nombre manda sobre C', () => {
    expect(agruparFichas([fila('GLOBIFER MASTICABLE X 30C FQP', 'HIERRO HEMICO')])[0].criterio).toBe('MASTICABLE');
  });
});

describe('nombreVisible', () => {
  it('pasa a minúsculas con mayúscula inicial y separa la unidad', () => {
    expect(nombreVisible('ACICLOVIR 200MG')).toBe('Aciclovir 200 mg');
    expect(nombreVisible('SUBELAN OR 75MG')).toBe('Subelan OR 75 mg');
    expect(nombreVisible('CALCITRIOL 0,5MCG')).toBe('Calcitriol 0,5 mcg');
    expect(nombreVisible('ANFEBUTAMONA XL 150MG')).toBe('Anfebutamona XL 150 mg');
  });
});
