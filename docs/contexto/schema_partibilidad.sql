-- =====================================================================
-- APP DE PARTIBILIDAD DE COMPRIMIDOS (Chile) - Esquema Supabase
-- Ejecutar completo en el SQL Editor de Supabase (proyecto nuevo).
-- Modelo: catálogo público de solo lectura + aportes de usuarios con
-- revisión por QF (admin). El veredicto SOLO lo asigna un admin.
-- =====================================================================

-- ---------- 1. Extensiones ----------
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- Wrapper inmutable para poder usar unaccent en columnas generadas/índices
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$ select extensions.unaccent($1) $$;

-- ---------- 2. Tipos enumerados ----------
create type public.forma_farmaceutica as enum (
  'comprimido', 'comprimido_recubierto', 'comprimido_masticable',
  'comprimido_dispersable', 'comprimido_bucodispersable', 'comprimido_sublingual',
  'comprimido_efervescente', 'comprimido_vaginal', 'gragea',
  'capsula_dura', 'capsula_blanda', 'otra'
);

create type public.forma_geometrica as enum (
  'redonda', 'ovalada', 'oblonga', 'capsular', 'cuadrada',
  'rectangular', 'triangular', 'romboidal', 'hexagonal', 'otra'
);

create type public.tipo_liberacion as enum (
  'inmediata', 'prolongada', 'modificada', 'retardada',
  'gastrorresistente', 'bucodispersable', 'sublingual',
  'efervescente', 'masticable'
);

create type public.tipo_ranura as enum (
  'sin_ranura', 'simple', 'doble_cruz', 'multiple', 'solo_decorativa'
);

create type public.veredicto_particion as enum (
  'partible', 'condicional', 'no_partible'
);

create type public.estado_ficha as enum (
  'borrador', 'publicado', 'archivado'
);

create type public.estado_aporte as enum (
  'pendiente', 'en_revision', 'aprobado', 'rechazado'
);

create type public.tipo_aporte as enum (
  'nuevo_medicamento', 'correccion'
);

create type public.rol_usuario as enum (
  'usuario', 'admin'
);

-- ---------- 3. Perfiles y roles ----------
create table public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  rol        public.rol_usuario not null default 'usuario',
  creado_en  timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper de rol (security definer evita recursión de RLS)
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- ---------- 4. Principios activos (DCI) ----------
create table public.principios_activos (
  id          bigint generated always as identity primary key,
  dci         text not null unique,
  dci_norm    text generated always as (lower(public.f_unaccent(dci))) stored,
  sinonimos   text[] not null default '{}',
  creado_en   timestamptz not null default now()
);

create index principios_activos_dci_trgm
  on public.principios_activos using gin (dci_norm extensions.gin_trgm_ops);

-- ---------- 5. Criterios estandarizados de partibilidad ----------
-- Tabla cerrada: cada veredicto se fundamenta con UN criterio codificado
-- (+ nota opcional). Editable solo por admin; versionable.
create table public.criterios_particion (
  id                  smallint generated always as identity primary key,
  codigo              text not null unique,           -- ej. 'LIB-PROLONGADA'
  titulo              text not null,                  -- texto corto para el paciente
  fundamento          text not null,                  -- explicación estandarizada
  veredicto_asociado  public.veredicto_particion not null,
  version             smallint not null default 1,
  activo              boolean not null default true,
  actualizado_en      timestamptz not null default now()
);

-- ---------- 6. Medicamentos (por presentación comercial) ----------
create table public.medicamentos (
  id                   bigint generated always as identity primary key,

  -- Identificación
  nombre_comercial     text not null,
  nombre_norm          text generated always as (lower(public.f_unaccent(nombre_comercial))) stored,
  laboratorio          text,
  registro_isp         text,                          -- opcional
  ean                  text,                          -- opcional, futuro escaneo

  -- Características farmacéuticas
  forma_farmaceutica   public.forma_farmaceutica not null,
  liberacion           public.tipo_liberacion not null default 'inmediata',
  recubrimiento        boolean not null default false,
  recubrimiento_funcional boolean not null default false,  -- entérico / protección / LP

  -- Representación digital (sin fotos)
  forma_geometrica     public.forma_geometrica not null default 'redonda',
  color_hex            text not null default '#FFFFFF'
                         check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  color_hex_secundario text
                         check (color_hex_secundario is null
                                or color_hex_secundario ~ '^#[0-9A-Fa-f]{6}$'),  -- bicolor
  largo_mm             numeric(5,2) check (largo_mm > 0),
  ancho_mm             numeric(5,2) check (ancho_mm > 0),
  espesor_mm           numeric(5,2) check (espesor_mm > 0),
  ranura               public.tipo_ranura not null default 'sin_ranura',
  ranura_orientacion   smallint not null default 0
                         check (ranura_orientacion between 0 and 179),  -- grados
  grabado              text,                          -- inscripción/logo, ej. 'C 20'

  -- Veredicto estandarizado
  veredicto            public.veredicto_particion,
  criterio_id          smallint references public.criterios_particion(id),
  nota_veredicto       text,                          -- aclaración breve opcional
  version_criterio     smallint,

  -- Gestión editorial
  estado               public.estado_ficha not null default 'borrador',
  revisado_por         uuid references public.perfiles(id),
  revisado_en          timestamptz,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),

  -- Una ficha publicada debe tener veredicto, criterio y revisor
  constraint publicado_completo check (
    estado <> 'publicado'
    or (veredicto is not null and criterio_id is not null
        and revisado_por is not null and revisado_en is not null)
  )
);

create index medicamentos_nombre_trgm
  on public.medicamentos using gin (nombre_norm extensions.gin_trgm_ops);
create index medicamentos_estado_idx on public.medicamentos (estado);
create index medicamentos_ean_idx    on public.medicamentos (ean) where ean is not null;

-- ---------- 7. Relación medicamento <-> principios activos (N:M) ----------
-- Soporta asociaciones (ej. losartán + hidroclorotiazida)
create table public.medicamento_principios (
  medicamento_id       bigint not null references public.medicamentos(id) on delete cascade,
  principio_activo_id  bigint not null references public.principios_activos(id),
  cantidad             numeric(10,3) not null check (cantidad > 0),
  unidad               text not null default 'mg',   -- mg, mcg, g, UI, etc.
  primary key (medicamento_id, principio_activo_id)
);

create index medicamento_principios_pa_idx
  on public.medicamento_principios (principio_activo_id);

-- ---------- 8. Aportes de usuarios (cola de revisión) ----------
create table public.aportes (
  id                     bigint generated always as identity primary key,
  usuario_id             uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  tipo                   public.tipo_aporte not null default 'nuevo_medicamento',
  medicamento_id         bigint references public.medicamentos(id) on delete set null, -- si es corrección

  -- Datos propuestos por el usuario (NO incluyen veredicto)
  nombre_comercial       text not null check (char_length(nombre_comercial) between 2 and 150),
  dci                    text not null check (char_length(dci) between 2 and 200),
  concentracion          text,
  laboratorio            text,
  forma_farmaceutica     public.forma_farmaceutica,
  forma_geometrica       public.forma_geometrica,
  liberacion             public.tipo_liberacion,
  ranura                 public.tipo_ranura,
  color_descripcion      text,
  largo_mm               numeric(5,2) check (largo_mm > 0),
  ancho_mm               numeric(5,2) check (ancho_mm > 0),
  comentario             text check (char_length(comentario) <= 1000),

  -- Revisión
  estado                 public.estado_aporte not null default 'pendiente',
  revisado_por           uuid references public.perfiles(id),
  revisado_en            timestamptz,
  nota_revision          text,
  medicamento_resultante bigint references public.medicamentos(id) on delete set null,

  creado_en              timestamptz not null default now()
);

create index aportes_estado_idx  on public.aportes (estado, creado_en);
create index aportes_usuario_idx on public.aportes (usuario_id);

-- Antiabuso: máximo 10 aportes pendientes por usuario
create or replace function public.limitar_aportes_pendientes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.aportes
      where usuario_id = new.usuario_id and estado = 'pendiente') >= 10 then
    raise exception 'Tienes demasiados aportes pendientes de revisión (máx. 10).';
  end if;
  return new;
end;
$$;

create trigger aportes_limite
  before insert on public.aportes
  for each row execute function public.limitar_aportes_pendientes();

-- ---------- 9. Historial de cambios de veredicto (trazabilidad) ----------
create table public.historial_veredictos (
  id               bigint generated always as identity primary key,
  medicamento_id   bigint not null references public.medicamentos(id) on delete cascade,
  veredicto        public.veredicto_particion,
  criterio_id      smallint references public.criterios_particion(id),
  nota_veredicto   text,
  modificado_por   uuid,
  modificado_en    timestamptz not null default now()
);

-- ---------- 10. Triggers de mantenimiento ----------
create or replace function public.touch_medicamento()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();

  -- Congela la versión del criterio usada
  if new.criterio_id is not null then
    select version into new.version_criterio
    from public.criterios_particion where id = new.criterio_id;
  end if;

  -- Coherencia: el veredicto debe coincidir con el criterio
  if new.criterio_id is not null and new.veredicto is not null then
    if (select veredicto_asociado from public.criterios_particion
        where id = new.criterio_id) <> new.veredicto then
      raise exception 'El veredicto no coincide con el criterio seleccionado.';
    end if;
  end if;

  return new;
end;
$$;

create trigger medicamentos_touch
  before insert or update on public.medicamentos
  for each row execute function public.touch_medicamento();

create or replace function public.log_veredicto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.veredicto      is distinct from old.veredicto
     or new.criterio_id    is distinct from old.criterio_id
     or new.nota_veredicto is distinct from old.nota_veredicto then
    insert into public.historial_veredictos
      (medicamento_id, veredicto, criterio_id, nota_veredicto, modificado_por)
    values
      (new.id, new.veredicto, new.criterio_id, new.nota_veredicto, auth.uid());
  end if;
  return new;
end;
$$;

create trigger medicamentos_log_veredicto
  after insert or update on public.medicamentos
  for each row execute function public.log_veredicto();

-- ---------- 11. Búsqueda por nombre comercial o DCI ----------
create or replace function public.buscar_medicamentos(q text, lim int default 30)
returns table (
  id                 bigint,
  nombre_comercial   text,
  laboratorio        text,
  dcis               text,
  forma_farmaceutica public.forma_farmaceutica,
  liberacion         public.tipo_liberacion,
  forma_geometrica   public.forma_geometrica,
  color_hex          text,
  ranura             public.tipo_ranura,
  veredicto          public.veredicto_particion,
  relevancia         real
)
language sql
stable
set search_path = public, extensions
as $$
  with consulta as (
    select lower(public.f_unaccent(trim(q))) as qn
  )
  select
    m.id,
    m.nombre_comercial,
    m.laboratorio,
    string_agg(pa.dci || ' ' || mp.cantidad::text || ' ' || mp.unidad, ' + ') as dcis,
    m.forma_farmaceutica,
    m.liberacion,
    m.forma_geometrica,
    m.color_hex,
    m.ranura,
    m.veredicto,
    greatest(
      similarity(m.nombre_norm, c.qn),
      coalesce(max(similarity(pa.dci_norm, c.qn)), 0)
    ) as relevancia
  from public.medicamentos m
  cross join consulta c
  left join public.medicamento_principios mp on mp.medicamento_id = m.id
  left join public.principios_activos pa on pa.id = mp.principio_activo_id
  where m.estado = 'publicado'
    and length(c.qn) >= 2
    and (
      m.nombre_norm like '%' || c.qn || '%'
      or pa.dci_norm like '%' || c.qn || '%'
      or similarity(m.nombre_norm, c.qn) > 0.3
      or similarity(pa.dci_norm, c.qn) > 0.3
    )
  group by m.id, c.qn
  order by relevancia desc, m.nombre_comercial
  limit least(lim, 100);
$$;

-- ---------- 12. Resolución de aportes (solo admin) ----------
create or replace function public.resolver_aporte(
  p_aporte_id      bigint,
  p_estado         public.estado_aporte,   -- 'aprobado' o 'rechazado'
  p_nota           text default null,
  p_medicamento_id bigint default null     -- ficha creada/actualizada a partir del aporte
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede resolver aportes.';
  end if;
  if p_estado not in ('aprobado', 'rechazado') then
    raise exception 'Estado inválido: use aprobado o rechazado.';
  end if;

  update public.aportes
     set estado                 = p_estado,
         nota_revision          = p_nota,
         revisado_por           = auth.uid(),
         revisado_en            = now(),
         medicamento_resultante = p_medicamento_id
   where id = p_aporte_id;
end;
$$;

-- ---------- 13. Row Level Security ----------
alter table public.perfiles               enable row level security;
alter table public.principios_activos     enable row level security;
alter table public.criterios_particion    enable row level security;
alter table public.medicamentos           enable row level security;
alter table public.medicamento_principios enable row level security;
alter table public.aportes                enable row level security;
alter table public.historial_veredictos   enable row level security;

-- perfiles: cada usuario ve el suyo; admin ve todos. Nadie cambia su rol desde el cliente.
create policy perfiles_select_propio on public.perfiles
  for select using (id = auth.uid() or public.es_admin());

-- criterios: lectura pública de los activos; escritura solo admin
create policy criterios_select on public.criterios_particion
  for select using (activo or public.es_admin());
create policy criterios_admin_all on public.criterios_particion
  for all using (public.es_admin()) with check (public.es_admin());

-- principios activos: lectura pública; escritura admin
create policy pa_select on public.principios_activos
  for select using (true);
create policy pa_admin_all on public.principios_activos
  for all using (public.es_admin()) with check (public.es_admin());

-- medicamentos: público ve solo publicados; admin ve y edita todo
create policy med_select_publicados on public.medicamentos
  for select using (estado = 'publicado' or public.es_admin());
create policy med_admin_all on public.medicamentos
  for all using (public.es_admin()) with check (public.es_admin());

-- medicamento_principios: visibles si la ficha es visible
create policy mp_select on public.medicamento_principios
  for select using (
    exists (select 1 from public.medicamentos m
            where m.id = medicamento_id
              and (m.estado = 'publicado' or public.es_admin()))
  );
create policy mp_admin_all on public.medicamento_principios
  for all using (public.es_admin()) with check (public.es_admin());

-- aportes: el usuario crea y ve los suyos; admin gestiona todos
create policy aportes_insert_propio on public.aportes
  for insert to authenticated
  with check (usuario_id = auth.uid() and estado = 'pendiente');
create policy aportes_select_propio on public.aportes
  for select using (usuario_id = auth.uid() or public.es_admin());
create policy aportes_admin_update on public.aportes
  for update using (public.es_admin()) with check (public.es_admin());
create policy aportes_admin_delete on public.aportes
  for delete using (public.es_admin());

-- historial: solo admin
create policy hist_admin_select on public.historial_veredictos
  for select using (public.es_admin());

-- ---------- 14. Permisos de ejecución ----------
revoke execute on function public.resolver_aporte(bigint, public.estado_aporte, text, bigint) from public, anon;
grant  execute on function public.resolver_aporte(bigint, public.estado_aporte, text, bigint) to authenticated;
grant  execute on function public.buscar_medicamentos(text, int) to anon, authenticated;

-- ---------- 15. Criterios iniciales (BORRADOR: ajústelos según su criterio QF) ----------
insert into public.criterios_particion (codigo, titulo, fundamento, veredicto_asociado) values
('RANURA-LI',
 'Ranurado, liberación inmediata',
 'Comprimido de liberación inmediata con ranura funcional. Puede partirse por la ranura sin alterar la liberación del fármaco.',
 'partible'),
('SIN-RANURA-LI',
 'Sin ranura, liberación inmediata',
 'Comprimido de liberación inmediata sin ranura. Puede partirse con partidor, pero la división puede ser desigual y entregar dosis irregulares. Solo por indicación profesional.',
 'condicional'),
('RECUB-ESTETICO',
 'Recubrimiento solo estético o de sabor',
 'El recubrimiento no modifica la liberación. Puede partirse, aunque el sabor o la irritación local pueden verse afectados.',
 'condicional'),
('LIB-PROLONGADA',
 'Liberación prolongada o modificada',
 'Partir el comprimido destruye el mecanismo de liberación controlada y puede liberar toda la dosis de una vez, con riesgo de toxicidad.',
 'no_partible'),
('ENTERICO',
 'Recubrimiento entérico o gastrorresistente',
 'El recubrimiento protege el fármaco del ácido gástrico o al estómago del fármaco. Al partirlo se pierde esa protección.',
 'no_partible'),
('BUCODISPERSABLE',
 'Bucodispersable, sublingual o efervescente',
 'Forma diseñada para disolverse en boca, bajo la lengua o en agua. No debe partirse ni alterarse.',
 'no_partible'),
('MTE',
 'Margen terapéutico estrecho',
 'Pequeñas variaciones de dosis pueden causar ineficacia o toxicidad. Partir solo bajo indicación y control del profesional.',
 'condicional'),
('PELIGROSO',
 'Fármaco peligroso o citotóxico',
 'Su manipulación o el polvo generado al partirlo implican riesgo de exposición. No debe partirse.',
 'no_partible'),
('NO-SOLIDA',
 'Cápsula u otra forma no partible',
 'La forma farmacéutica no permite una división segura ni exacta de la dosis.',
 'no_partible');
