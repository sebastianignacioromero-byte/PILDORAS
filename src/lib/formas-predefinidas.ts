// Formas predefinidas del panel de administración, aprobadas por el QF (25-11-2026).
// Un clic asigna la forma geométrica y la ranura de la ficha.
import type { FormaGeometrica, TipoRanura } from '../tipos';

export interface FormaPredefinida {
  numero: number;
  nombre: string;
  forma: FormaGeometrica;
  ranura: TipoRanura;
  orientacion: number;
}

export const FORMAS_PREDEFINIDAS: FormaPredefinida[] = [
  { numero: 1, nombre: 'Redondo liso', forma: 'redonda', ranura: 'sin_ranura', orientacion: 0 },
  { numero: 2, nombre: 'Redondo, 1 ranura', forma: 'redonda', ranura: 'simple', orientacion: 0 },
  { numero: 3, nombre: 'Redondo, 2 ranuras en cruz', forma: 'redonda', ranura: 'doble_cruz', orientacion: 0 },
  { numero: 4, nombre: 'Cuadrado liso', forma: 'cuadrada', ranura: 'sin_ranura', orientacion: 0 },
  { numero: 5, nombre: 'Cuadrado, 1 ranura', forma: 'cuadrada', ranura: 'simple', orientacion: 0 },
  { numero: 6, nombre: 'Cuadrado, 2 ranuras en cruz', forma: 'cuadrada', ranura: 'doble_cruz', orientacion: 0 },
  { numero: 7, nombre: 'Rectangular, 3 ranuras (4 partes)', forma: 'rectangular', ranura: 'multiple', orientacion: 0 },
];
