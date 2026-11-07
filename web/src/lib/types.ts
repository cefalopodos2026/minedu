export interface IIEE {
  id: string;
  cod_mod: string;
  anexo: string;
  codinst: string | null;
  codlocal: string | null;
  nombre: string;
  nivel_cod: string | null;
  nivel: string | null;
  forma: string | null;
  sexo: string | null;
  gestion_cod: string | null;
  gestion: string | null;
  dependencia: string | null;
  director: string | null;
  telefono: string | null;
  email: string | null;
  pagweb: string | null;
  direccion: string | null;
  localidad: string | null;
  centro_poblado: string | null;
  codcp_inei: string | null;
  area: string | null;
  ubigeo: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  dre: string | null;
  codooii: string | null;
  ugel: string | null;
  lat: number | null;
  lon: number | null;
  tipo_programa: string | null;
  turno: string | null;
  turno_grupo: 'DIURNO' | 'NOCTURNO' | 'MIXTO' | null;
  ruc: string | null;
  razon_social: string | null;
  promotor: string | null;
  estado: string | null;
  fecha_registro: string | null;
  fecha_actualizacion: string | null;
  talum: number | null;
  talum_hom: number | null;
  talum_muj: number | null;
  tdoc: number | null;
  tsec: number | null;
  caracteristica: string | null;
  grad_urbano: string | null;
  vraem: boolean | null;
  zona_frontera: boolean | null;
  en_censo_2025: boolean | null;
}

export interface Resumen {
  total: number;
  locales: number;
  con_coordenadas: number;
  con_telefono: number;
  alumnos: number;
  alumnos_hom: number;
  alumnos_muj: number;
  alumnos_diurno: number;
  alumnos_nocturno: number;
  alumnos_mixto: number;
  docentes: number;
  secciones: number;
}

/** [id, lat, lon, nombre, nivel, turno_grupo] */
export type Punto = [string, number, number, string, string | null, string | null];

export interface Filtros {
  dpto: string;
  prov: string;
  dist: string;
  ugel: string;
  q: string;
  nivel: string;
  gestion: string;
  turno: string;
  estado: string;
  area: string;
}

export const FILTROS_VACIOS: Filtros = {
  dpto: '', prov: '', dist: '', ugel: '', q: '', nivel: '', gestion: '', turno: '', estado: 'Activo', area: '',
};
