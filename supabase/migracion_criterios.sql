-- =====================================================================
-- MIGRACIÓN CRITERIOS v2 - Píldoras
-- Ejecutar DESPUÉS de schema_partibilidad.sql y migracion_web_seo.sql,
-- en una base que ya tenga esos dos archivos aplicados. Se puede ejecutar
-- más de una vez sin problemas.
-- Agrega a cada criterio la explicación para el paciente, el "qué hacer" y
-- el "cómo reconocerlo"; carga los textos aprobados por el QF (30-10-2026)
-- y crea los criterios EFERVESCENTE, VAGINAL, MASTICABLE y DISPERSABLE.
-- =====================================================================

-- ---------- 1. Columnas nuevas ----------
alter table public.criterios_particion
  add column if not exists explicacion    text not null default '',
  add column if not exists que_hacer      text not null default '',
  add column if not exists como_reconocer text not null default '';

-- ---------- 2. Textos aprobados (16 criterios) ----------
insert into public.criterios_particion
  (codigo, titulo, fundamento, explicacion, que_hacer, como_reconocer, veredicto_asociado) values
('RANURA-LI',
 'Ranurado, liberación inmediata',
 'La ranura permite dividir en dosis iguales. Por tanto, su acción no depende de que el comprimido esté entero.',
 'Tiene una ranura hecha para dividirlo en partes iguales. Puede partirlo si su médico le indicó media dosis.',
 'Parta con un partidor justo antes de tomarlo. Guarde la otra mitad en el envase original y tómela en la dosis siguiente.',
 'Línea/s marcada/s en una o ambas caras.',
 'se_puede_partir'),
('SIN-RANURA-LI',
 'Sin ranura, liberación inmediata',
 'Sin ranura, la división es imprecisa y las mitades pueden variar en la cantidad de mg en cada una.',
 'No tiene ranura, pero puede partirse. Use un partidor: las mitades pueden quedar desiguales.',
 'Use siempre un partidor, nunca un cuchillo. Si necesita una dosis exacta, consulte si existe una presentación de menor dosis.',
 'Superficie lisa, sin línea.',
 'se_puede_partir'),
('RECUB-ESTETICO',
 'Recubrimiento solo estético o de sabor',
 'El recubrimiento tiene fines estéticos y de sabor, no controla la liberación. Al partirlo se expone el núcleo: puede cambiar el sabor y tener un color diferente.',
 'Tiene una cubierta que solo protege el sabor o el color. Puede partirlo, aunque la mitad puede saber amarga.',
 'Tómelo con agua apenas lo parta. Guarde la otra mitad protegida en el envase y úsela en la dosis siguiente.',
 '"Comprimido recubierto", sin otra palabra adicional en la descripción.',
 'se_puede_partir'),
('MASTICABLE',
 'Comprimido masticable',
 'Su liberación no depende de que el comprimido esté entero: se diseñó para romperse en la boca.',
 'Está hecho para masticarse, así que partirlo no cambia su efecto.',
 'Puede partirlo si le indicaron media dosis. Mastique bien cada parte antes de tragarla.',
 '"Masticable" en el nombre o la descripción.',
 'se_puede_partir'),
('DISPERSABLE',
 'Comprimido dispersable en agua',
 'Está diseñado para desintegrarse en agua. Su liberación no depende de que el comprimido esté entero.',
 'Se deshace en agua antes de tomarlo, así que partirlo no cambia su efecto.',
 'Puede partirlo si le indicaron media dosis. Disuelva la parte que corresponde en un poco de agua y tómela de inmediato.',
 '"Dispersable" en el nombre o la descripción (no confundir con bucodispersable).',
 'se_puede_partir'),
('LIB-PROLONGADA',
 'Liberación prolongada',
 'Una matriz o cubierta controla la liberación lentamente. Romperla produce una liberación inmediata y elevada, lo que puede producir riesgo de toxicidad.',
 'Libera el medicamento prolongadamente durante el día. Si lo parte, puede liberar toda la dosis de una vez.',
 'Tómelo entero con agua, sin partir, masticar ni triturar. Si no puede tragarlo o necesita otra dosis, consulte: puede existir otra presentación o forma más cómoda para su uso.',
 'LP, SR, XR, XL, Retard, "liberación prolongada", "sostenida", "controlada" o "modificada".',
 'no_debe_partir'),
('LIB-OSMOTICA',
 'Liberación osmótica',
 'Sistema osmótico: una membrana semipermeable rodea un núcleo que empuja el fármaco por un orificio láser. Si lo parte, libera la dosis sin control.',
 'Funciona como una pequeña bomba que libera el medicamento por uno o varios orificios. Si lo parte, deja de funcionar.',
 'Tómelo entero. La cubierta vacía puede aparecer en las deposiciones: es normal.',
 'OR, "sistema osmótico" o "liberación osmótica".',
 'no_debe_partir'),
('ENTERICO',
 'Recubrimiento entérico o gastrorresistente',
 'La cubierta se disuelve recién en el intestino, que es donde se absorbe el medicamento. Partirlo expone el fármaco al ácido, que lo inactiva, o expone la mucosa del estómago, dañándola.',
 'Tiene una cubierta que lo protege del ácido del estómago, o que protege su estómago. Partido, le quita esa protección.',
 'Tómelo entero. Si le cuesta tragar, consulte: existen alternativas.',
 '"Gastrorresistente", "cubierta entérica", EC o ER.',
 'no_debe_partir'),
('SUBLINGUAL',
 'Comprimido sublingual',
 'Se absorbe por la mucosa de la boca, en forma rápida y sin pasar por el hígado. La dosis está diseñada para disolverse completa; partirlo altera la dosis y la absorción.',
 'Se disuelve bajo la lengua y pasa directo a la sangre. Úselo entero, como indica el envase.',
 'Póngalo bajo la lengua y déjelo disolver. No lo trague ni lo mastique.',
 '"Sublingual" o SL.',
 'no_debe_partir'),
('BUCODISPERSABLE',
 'Comprimido bucodispersable',
 'Está hecho con baja compresión o liofilizado, por eso es muy frágil y sensible a la humedad. Algunos contienen microgránulos recubiertos que se dañan al partirlo.',
 'Se deshace en la boca sin agua. Es frágil: si lo parte se desmorona y la dosis deja de ser exacta.',
 'Sáquelo del blíster con las manos secas justo antes de usarlo. Póngalo sobre la lengua y deje que se deshaga.',
 '"Bucodispersable", ODT o BD.',
 'no_debe_partir'),
('MTE',
 'Margen terapéutico estrecho',
 'La distancia entre la concentración eficaz y la tóxica es pequeña. La diferencia de contenido entre dos mitades es clínicamente relevante en estos fármacos.',
 'Pequeñas diferencias en la dosis pueden hacer que no funcione o que sea tóxico. No lo parta salvo indicación expresa de su médico.',
 'Si necesita otra dosis, pida la presentación con la dosis exacta. Si su médico le indicó partirlo, use partidor y no cambie de marca sin consultar.',
 'No figura en el envase: depende del principio activo.',
 'no_debe_partir'),
('DOSIS-MCG',
 'Dosis muy pequeña (microgramos)',
 'El fármaco está diluido en mucho excipiente. Se garantiza la uniformidad de la dosis del comprimido entero, no la de sus partes, por lo que al dividirlo puede haber diferencias de dosis significativas.',
 'Contiene una cantidad muy pequeña de medicamento. Al partirlo, las mitades pueden quedar con dosis distintas.',
 'Pida la presentación con la dosis exacta: estos medicamentos suelen tener varias concentraciones.',
 'Dosis expresada en mcg o µg.',
 'no_debe_partir'),
('PELIGROSO',
 'Fármaco peligroso o citotóxico',
 'Son fármacos citotóxicos, hormonales o teratogénicos. Partirlos genera polvo y contacto con la piel, con riesgo para cuidadores y embarazadas.',
 'Puede ser dañino para quien lo manipula. No lo parta ni lo triture.',
 'Si debe tocarlo, use guantes. Las embarazadas no deben manipularlo. Si necesita otra dosis, consulte.',
 'El folleto advierte sobre su manipulación. Depende del principio activo.',
 'no_debe_partir'),
('EFERVESCENTE',
 'Comprimido efervescente',
 'La dosis está calculada para el comprimido completo disuelto. Partirlo da mitades desiguales y lo expone a la humedad, que inicia la reacción.',
 'Está hecho para disolverse entero en agua. Si lo parte, no sabrá cuánta dosis toma.',
 'Disuélvalo entero en un vaso de agua y tómelo cuando deje de burbujear. Si necesita otra dosis, consulte.',
 '"Efervescente" en el nombre o la descripción.',
 'no_debe_partir'),
('VAGINAL',
 'Comprimido vaginal',
 'Su forma y su dosis están pensadas para disolverse completo en el sitio de aplicación. Partido, la dosis y la absorción cambian.',
 'Está diseñado para aplicarse entero por vía vaginal. No lo parta.',
 'Úselo entero, con el aplicador si lo trae, como indica el folleto.',
 '"Comprimido vaginal" u "óvulo" en la descripción.',
 'no_debe_partir'),
('NO-SOLIDA',
 'Cápsula u otra forma no partible',
 'Las cápsulas contienen polvo, gránulos o líquido dentro de una cubierta. No hay forma física de fraccionarlas con exactitud.',
 'Es una cápsula u otra forma que no se puede dividir en partes iguales.',
 'Trague la cápsula entera. Antes de abrirla, consulte: algunas se pueden abrir y otras no.',
 '"Cápsula", "cápsula blanda" o "perla".',
 'no_puede_partir')
on conflict (codigo) do update set
  titulo             = excluded.titulo,
  fundamento         = excluded.fundamento,
  explicacion        = excluded.explicacion,
  que_hacer          = excluded.que_hacer,
  como_reconocer     = excluded.como_reconocer,
  veredicto_asociado = excluded.veredicto_asociado,
  version            = public.criterios_particion.version + 1,
  actualizado_en     = now()
where (public.criterios_particion.titulo, public.criterios_particion.fundamento,
       public.criterios_particion.explicacion, public.criterios_particion.que_hacer,
       public.criterios_particion.como_reconocer, public.criterios_particion.veredicto_asociado)
  is distinct from
      (excluded.titulo, excluded.fundamento, excluded.explicacion,
       excluded.que_hacer, excluded.como_reconocer, excluded.veredicto_asociado);

-- ---------- 3. Vista de fichas con los textos nuevos del criterio ----------
drop view if exists public.v_fichas_publicas;

create or replace view public.v_fichas_publicas
with (security_invoker = true) as
select
  m.id,
  m.slug,
  m.nombre_comercial,
  m.laboratorio,
  m.forma_farmaceutica,
  m.liberacion,
  m.recubrimiento,
  m.recubrimiento_funcional,
  m.forma_geometrica,
  m.color_hex,
  m.color_hex_secundario,
  m.largo_mm,
  m.ancho_mm,
  m.espesor_mm,
  m.ranura,
  m.ranura_orientacion,
  m.grabado,
  m.veredicto,
  m.nota_veredicto,
  m.meta_descripcion,
  m.revisado_en,
  m.actualizado_en,
  c.codigo      as criterio_codigo,
  c.titulo      as criterio_titulo,
  c.fundamento  as criterio_fundamento,
  c.explicacion as criterio_explicacion,
  c.que_hacer   as criterio_que_hacer,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'dci',     pa.dci,
        'slug',    pa.slug,
        'cantidad', mp.cantidad,
        'unidad',  mp.unidad
      ) order by pa.dci
    ) filter (where pa.id is not null),
    '[]'::jsonb
  ) as principios
from public.medicamentos m
left join public.criterios_particion c        on c.id = m.criterio_id
left join public.medicamento_principios mp    on mp.medicamento_id = m.id
left join public.principios_activos pa        on pa.id = mp.principio_activo_id
where m.estado = 'publicado'
group by m.id, c.id;

grant select on public.v_fichas_publicas to anon, authenticated;
