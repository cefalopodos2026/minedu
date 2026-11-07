-- =====================================================================
-- Directorio de Instituciones Educativas del Perú (fuente: ESCALE - MINEDU)
-- Padrón web de servicios educativos (corte 30-10-2026) + Censo Educativo 2025
-- Ejecutar en Supabase > SQL Editor (o vía scripts/load.mjs con DATABASE_URL)
-- =====================================================================
create extension if not exists pg_trgm;

drop function if exists public.buscar_iiee cascade;
drop function if exists public.resumen_iiee cascade;
drop function if exists public.puntos_iiee cascade;
drop function if exists public.filtrar_iiee cascade;

create table if not exists public.iiee (
  id                  text primary key,          -- cod_mod-anexo
  cod_mod             text not null,             -- código modular
  anexo               text not null,
  codinst             text,
  codlocal            text,                      -- código de local escolar
  nombre              text not null,
  nombre_norm         text not null,             -- nombre sin tildes, en mayúsculas (búsqueda)
  nivel_cod           text,
  nivel               text,                      -- nivel / modalidad
  forma               text,                      -- escolarizada / no escolarizada
  sexo                text,                      -- mixto / varones / mujeres
  gestion_cod         text,                      -- 1 pública directa, 2 pública gestión privada, 3 privada
  gestion             text,
  dependencia         text,
  director            text,
  telefono            text,                      -- texto original (padrón 2026; si falta, Censo 2025)
  telefono_fijo       text,                      -- fijos normalizados con código de ciudad: "043-427545 / ..."
  celular             text,                      -- celulares normalizados: "942 787 334 / ..."
  email               text,
  pagweb              text,
  direccion           text,
  localidad           text,
  centro_poblado      text,
  codcp_inei          text,
  area                text,                      -- urbana / rural
  ubigeo              text,
  cod_dpto            text,
  cod_prov            text,
  departamento        text,
  provincia           text,
  distrito            text,
  dre                 text,
  codooii             text,                      -- código UGEL / DRE
  ugel                text,
  lat                 double precision,
  lon                 double precision,
  tipo_programa       text,
  turno               text,                      -- Mañana, Tarde, Noche, Mañana-Tarde, ...
  turno_grupo         text,                      -- DIURNO / NOCTURNO / MIXTO
  ruc                 text,
  razon_social        text,
  promotor            text,
  estado              text,                      -- Activo / Inactivo
  fecha_registro      date,
  fecha_actualizacion date,
  talum               integer,                   -- alumnos (Censo Educativo 2025)
  talum_hom           integer,
  talum_muj           integer,
  tdoc                integer,                   -- docentes
  tsec                integer,                   -- secciones
  caracteristica      text,                      -- unidocente / polidocente ...
  grad_urbano         text,
  vraem               boolean,
  zona_frontera       boolean,
  en_censo_2025       boolean default false
);

create index if not exists iiee_cod_mod_idx   on public.iiee (cod_mod);
create index if not exists iiee_codlocal_idx  on public.iiee (codlocal);
create index if not exists iiee_ubigeo_idx    on public.iiee (ubigeo);
create index if not exists iiee_dpto_idx      on public.iiee (cod_dpto);
create index if not exists iiee_prov_idx      on public.iiee (cod_prov);
create index if not exists iiee_ugel_idx      on public.iiee (codooii);
create index if not exists iiee_nombre_trgm   on public.iiee using gin (nombre_norm gin_trgm_ops);
create index if not exists iiee_orden_idx     on public.iiee (departamento, provincia, distrito, nombre_norm);

create table if not exists public.ubigeo (
  ubigeo       text primary key,
  cod_dpto     text,
  cod_prov     text,
  departamento text,
  provincia    text,
  distrito     text
);

-- Seguridad: lectura pública, escritura solo con service_role
alter table public.iiee   enable row level security;
alter table public.ubigeo enable row level security;
drop policy if exists "lectura publica iiee" on public.iiee;
drop policy if exists "lectura publica ubigeo" on public.ubigeo;
create policy "lectura publica iiee"   on public.iiee   for select to anon, authenticated using (true);
create policy "lectura publica ubigeo" on public.ubigeo for select to anon, authenticated using (true);
grant select on public.iiee, public.ubigeo to anon, authenticated;

-- ---------------------------------------------------------------------
-- Filtro común. p_q: texto ya normalizado (mayúsculas sin tildes) o código
-- ---------------------------------------------------------------------
create or replace function public.filtrar_iiee(
  p_dpto text default null, p_prov text default null, p_dist text default null,
  p_q text default null, p_nivel text default null, p_gestion text default null,
  p_turno text default null, p_estado text default null, p_area text default null,
  p_ugel text default null
) returns setof public.iiee
language sql stable
set search_path = public
as $$
  select i.* from public.iiee i
  where (p_dpto is null or i.cod_dpto = p_dpto)
    and (p_prov is null or i.cod_prov = p_prov)
    and (p_dist is null or i.ubigeo   = p_dist)
    and (p_ugel is null or i.codooii  = p_ugel)
    and (p_nivel is null or i.nivel   = p_nivel)
    and (p_turno is null or i.turno_grupo = p_turno)
    and (p_estado is null or i.estado = p_estado)
    and (p_area is null or i.area = p_area)
    and (p_gestion is null
         or (p_gestion = 'PUBLICA' and i.gestion_cod in ('1','2'))
         or (p_gestion = 'PRIVADA' and i.gestion_cod = '3'))
    and (p_q is null or p_q = ''
         or (p_q ~ '^[0-9]{6,7}$' and (i.cod_mod = lpad(p_q, 7, '0') or i.codlocal = p_q))
         or i.nombre_norm like '%' || replace(p_q, ' ', '%') || '%');
$$;

-- Resultados paginados
create or replace function public.buscar_iiee(
  p_dpto text default null, p_prov text default null, p_dist text default null,
  p_q text default null, p_nivel text default null, p_gestion text default null,
  p_turno text default null, p_estado text default null, p_area text default null,
  p_ugel text default null, p_limit int default 50, p_offset int default 0
) returns setof public.iiee
language sql stable
set search_path = public
as $$
  select * from public.filtrar_iiee(p_dpto, p_prov, p_dist, p_q, p_nivel, p_gestion, p_turno, p_estado, p_area, p_ugel) f
  order by f.departamento, f.provincia, f.distrito, f.nombre_norm, f.cod_mod, f.anexo
  limit least(greatest(p_limit, 1), 1000) offset greatest(p_offset, 0);
$$;

-- Totales del filtro (cantidad de IIEE, alumnado diurno / nocturno, docentes...)
create or replace function public.resumen_iiee(
  p_dpto text default null, p_prov text default null, p_dist text default null,
  p_q text default null, p_nivel text default null, p_gestion text default null,
  p_turno text default null, p_estado text default null, p_area text default null,
  p_ugel text default null
) returns json
language sql stable
set search_path = public
as $$
  select json_build_object(
    'total',            count(*),
    'locales',          count(distinct f.codlocal),
    'con_coordenadas',  count(*) filter (where f.lat is not null),
    'con_telefono',     count(*) filter (where f.telefono is not null),
    'alumnos',          coalesce(sum(f.talum), 0),
    'alumnos_hom',      coalesce(sum(f.talum_hom), 0),
    'alumnos_muj',      coalesce(sum(f.talum_muj), 0),
    'alumnos_diurno',   coalesce(sum(f.talum) filter (where f.turno_grupo = 'DIURNO'), 0),
    'alumnos_nocturno', coalesce(sum(f.talum) filter (where f.turno_grupo = 'NOCTURNO'), 0),
    'alumnos_mixto',    coalesce(sum(f.talum) filter (where f.turno_grupo = 'MIXTO'), 0),
    'docentes',         coalesce(sum(f.tdoc), 0),
    'secciones',        coalesce(sum(f.tsec), 0)
  )
  from public.filtrar_iiee(p_dpto, p_prov, p_dist, p_q, p_nivel, p_gestion, p_turno, p_estado, p_area, p_ugel) f;
$$;

-- Puntos para el mapa (máx. p_max) en un solo JSON compacto
create or replace function public.puntos_iiee(
  p_dpto text default null, p_prov text default null, p_dist text default null,
  p_q text default null, p_nivel text default null, p_gestion text default null,
  p_turno text default null, p_estado text default null, p_area text default null,
  p_ugel text default null, p_max int default 8000
) returns json
language sql stable
set search_path = public
as $$
  select coalesce(json_agg(json_build_array(p.id, p.lat, p.lon, p.nombre, p.nivel, p.turno_grupo)), '[]'::json)
  from (
    select f.id, f.lat, f.lon, f.nombre, f.nivel, f.turno_grupo
    from public.filtrar_iiee(p_dpto, p_prov, p_dist, p_q, p_nivel, p_gestion, p_turno, p_estado, p_area, p_ugel) f
    where f.lat is not null and f.lon is not null
    limit least(greatest(p_max, 1), 20000)
  ) p;
$$;

grant execute on function public.filtrar_iiee, public.buscar_iiee, public.resumen_iiee, public.puntos_iiee to anon, authenticated;
