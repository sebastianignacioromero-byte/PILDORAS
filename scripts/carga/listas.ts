// Listas por principio activo, propuestas en el documento de criterios. PENDIENTES DE APROBACIÓN DEL QF.
// Se comparan sin tildes ni mayúsculas, como parte del nombre del principio activo
// (así "litio" cubre "litio carbonato" y "valproico" cubre "ácido valproico").

/** PELIGROSO: antineoplásicos orales (NIOSH grupo 1) y fármacos de alto riesgo reproductivo. */
export const PELIGROSOS = [
  'metotrexato', 'tamoxifeno', 'anastrozol', 'letrozol', 'exemestano', 'bicalutamida', 'capecitabina',
  'ciclofosfamida', 'clorambucilo', 'melfalan', 'mercaptopurina', 'hidroxicarbamida', 'hidroxiurea',
  'imatinib', 'temozolomida', 'azatioprina', 'micofenol', 'leflunomida', 'talidomida', 'finasterida',
  'dutasterida', 'misoprostol', 'valganciclovir',
];

/** MTE: margen terapéutico estrecho (lista Curie). */
export const MTE = [
  'digoxina', 'litio', 'fenitoina', 'carbamazepina', 'valproico', 'valproato', 'fenobarbital', 'primidona',
  'warfarina', 'acenocumarol', 'teofilina', 'ciclosporina', 'tacrolimus', 'sirolimus', 'everolimus',
  'flecainida', 'levotiroxina',
];
