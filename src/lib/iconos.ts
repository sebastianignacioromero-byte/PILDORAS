// Íconos de la maqueta C como SVG en texto, para usarlos en componentes y en el buscador del navegador.
// Siempre decorativos: el texto que los acompaña da el significado.
const abrir = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

export const ICONOS = {
  ok: `${abrir}<path stroke-width="3" d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  alerta: `${abrir}<path stroke-width="3" d="M12 5v9"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  tachado: `${abrir}<circle stroke-width="2.6" cx="12" cy="12" r="8.5"/><path stroke-width="2.6" d="M6 18L18 6"/></svg>`,
  buscar: `${abrir}<circle stroke-width="2.4" cx="10.5" cy="10.5" r="6.5"/><path stroke-width="2.4" d="M16 16l4.5 4.5"/></svg>`,
  chat: `${abrir}<path stroke-width="2.2" d="M4 19l1.4-4A7.5 7.5 0 1 1 9 18.6z"/></svg>`,
  escudo: `${abrir}<path stroke-width="2" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path stroke-width="2" d="M9 12l2 2 4-4"/></svg>`,
} as const;

export type NombreIcono = keyof typeof ICONOS;
