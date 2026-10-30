// Dibujo ilustrativo del comprimido (estilo C · Blíster): trazo grueso, sombra desplazada y ranura marcada.
// Tamaño uniforme: no representa las dimensiones reales.
import type { FormaFarmaceutica, FormaGeometrica, TipoRanura } from '../tipos';

export interface OpcionesComprimido {
  forma: FormaGeometrica;
  ranura: TipoRanura;
  /** Grados (0–179) en que se rota la ranura. */
  orientacion: number;
  formaFarmaceutica: FormaFarmaceutica;
}

const TINTA = '#14302d';
const SOMBRA = '#b9cfcb';

/** Silueta de cada forma, dentro de un lienzo de 200 × 120 centrado en (100, 60). */
const SILUETAS: Record<FormaGeometrica, string> = {
  redonda: '<circle cx="100" cy="60" r="46"/>',
  ovalada: '<ellipse cx="100" cy="60" rx="72" ry="42"/>',
  oblonga: '<rect x="24" y="30" width="152" height="60" rx="22"/>',
  capsular: '<rect x="24" y="32" width="152" height="56" rx="28"/>',
  cuadrada: '<rect x="52" y="12" width="96" height="96" rx="16"/>',
  rectangular: '<rect x="30" y="24" width="140" height="72" rx="12"/>',
  triangular: '<path d="M100 12 L156 106 L44 106 Z" stroke-linejoin="round"/>',
  romboidal: '<path d="M100 8 L168 60 L100 112 L32 60 Z" stroke-linejoin="round"/>',
  hexagonal: '<path d="M152 60 L126 105 L74 105 L48 60 L74 15 L126 15 Z" stroke-linejoin="round"/>',
  otra: '<circle cx="100" cy="60" r="46"/>',
};

const ADJETIVO: Record<FormaGeometrica, string> = {
  redonda: 'redondo',
  ovalada: 'ovalado',
  oblonga: 'oblongo',
  capsular: 'capsular',
  cuadrada: 'cuadrado',
  rectangular: 'rectangular',
  triangular: 'triangular',
  romboidal: 'romboidal',
  hexagonal: 'hexagonal',
  otra: '',
};

const TEXTO_RANURA: Record<TipoRanura, string> = {
  sin_ranura: 'sin ranura',
  simple: 'con ranura simple',
  doble_cruz: 'con ranura en cruz',
  multiple: 'con ranuras múltiples',
  solo_decorativa: 'con ranura decorativa',
};

export function esCapsula(f: FormaFarmaceutica): boolean {
  return f === 'capsula_dura' || f === 'capsula_blanda';
}

export function descripcionComprimido(o: OpcionesComprimido): string {
  if (esCapsula(o.formaFarmaceutica)) return 'Cápsula';
  return ['Comprimido', ADJETIVO[o.forma], TEXTO_RANURA[o.ranura]].filter(Boolean).join(' ');
}

const linea = (x1: number, y1: number, x2: number, y2: number, extra = '') =>
  `<line data-ranura x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${TINTA}" stroke-width="5" stroke-linecap="round"${extra}/>`;

function ranuras(r: TipoRanura): string {
  switch (r) {
    case 'sin_ranura':
      return '';
    case 'simple':
      return linea(100, 0, 100, 120);
    case 'doble_cruz':
      return linea(100, 0, 100, 120) + linea(0, 60, 200, 60);
    case 'multiple':
      return linea(70, 0, 70, 120) + linea(100, 0, 100, 120) + linea(130, 0, 130, 120);
    case 'solo_decorativa':
      return linea(100, 0, 100, 120, ' stroke-dasharray="6 9"');
  }
}

let contador = 0;

function svg(etiqueta: string, contenido: string): string {
  return `<svg viewBox="0 0 200 120" role="img" aria-label="${etiqueta}" xmlns="http://www.w3.org/2000/svg">${contenido}</svg>`;
}

function capsula(etiqueta: string): string {
  const cuerpo = '<rect x="24" y="34" width="152" height="52" rx="26"/>';
  return svg(
    etiqueta,
    `<g data-capsula>` +
      `<g transform="translate(0 7)" fill="${SOMBRA}">${cuerpo}</g>` +
      `<g fill="#ffffff">${cuerpo}</g>` +
      `<path d="M100 34 H150 A26 26 0 0 1 150 86 H100 Z" fill="#d9f1ea"/>` +
      `<line x1="100" y1="34" x2="100" y2="86" stroke="${TINTA}" stroke-width="3"/>` +
      `<g fill="none" stroke="${TINTA}" stroke-width="4">${cuerpo}</g>` +
      `</g>`,
  );
}

/** SVG del comprimido como texto, para incrustarlo en la página o en el buscador. */
export function svgComprimido(o: OpcionesComprimido): string {
  const etiqueta = descripcionComprimido(o);
  if (esCapsula(o.formaFarmaceutica)) return capsula(etiqueta);
  const silueta = SILUETAS[o.forma];
  const id = `recorte-${o.forma}-${++contador}`;
  const grados = Math.round(o.orientacion) % 180;
  return svg(
    etiqueta,
    `<defs><clipPath id="${id}">${silueta}</clipPath></defs>` +
      `<g transform="translate(0 7)" fill="${SOMBRA}">${silueta}</g>` +
      `<g fill="#ffffff">${silueta}</g>` +
      `<g clip-path="url(#${id})"><g transform="rotate(${grados} 100 60)">${ranuras(o.ranura)}</g></g>` +
      `<g fill="none" stroke="${TINTA}" stroke-width="4">${silueta}</g>`,
  );
}
