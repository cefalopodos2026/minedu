import ubigeoData from '@/data/ubigeo.json';
import ugelData from '@/data/ugel.json';
import nivelesData from '@/data/niveles.json';

export type Opcion = { value: string; label: string };
const U = ubigeoData as [string, string, string, string][];

/** [nivel, modalidad] según el padrón ESCALE */
const NIVELES = nivelesData as [string, string][];

/** Modalidades y subniveles oficiales (derivados del código NIV_MOD) */
export const MODALIDADES: { value: string; corto: string; subniveles: string[] }[] = [
  { value: 'Educación Básica Regular', corto: 'EBR', subniveles: ['Inicial', 'Primaria', 'Secundaria'] },
  { value: 'Educación Básica Especial', corto: 'EBE', subniveles: ['Inicial', 'Primaria', 'General'] },
  {
    value: 'Educación Básica Alternativa',
    corto: 'EBA',
    subniveles: ['Inicial e Intermedio', 'Avanzado', 'General', 'Primaria de adultos', 'Secundaria de adultos'],
  },
  { value: 'Educación Técnico-Productiva', corto: 'ETP', subniveles: ['CETPRO', 'Educación ocupacional'] },
  { value: 'Educación Superior', corto: 'Superior', subniveles: ['Tecnológica', 'Pedagógica', 'Artística'] },
];

export const corto = (modalidad: string | null) => MODALIDADES.find((m) => m.value === modalidad)?.corto ?? '';

export function subniveles(modalidad: string): Opcion[] {
  return (MODALIDADES.find((m) => m.value === modalidad)?.subniveles ?? []).map((s) => ({ value: s, label: s }));
}

/** Niveles detallados del padrón, solo los de la modalidad elegida */
export function niveles(modalidad: string): Opcion[] {
  return NIVELES.filter(([, m]) => !modalidad || m === modalidad).map(([n]) => ({ value: n, label: n }));
}
const UGELES = ugelData as [string, string, string][];

const ordenar = (a: Opcion, b: Opcion) => a.label.localeCompare(b.label, 'es');

export const DEPARTAMENTOS: Opcion[] = [...new Map(U.map((u) => [u[0].slice(0, 2), u[1]])).entries()]
  .map(([value, label]) => ({ value, label }))
  .sort(ordenar);

export function provincias(dpto: string): Opcion[] {
  if (!dpto) return [];
  return [...new Map(U.filter((u) => u[0].startsWith(dpto)).map((u) => [u[0].slice(0, 4), u[2]])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort(ordenar);
}

export function distritos(prov: string): Opcion[] {
  if (!prov) return [];
  return U.filter((u) => u[0].startsWith(prov))
    .map((u) => ({ value: u[0], label: u[3] }))
    .sort(ordenar);
}

export function ugeles(dpto: string): Opcion[] {
  return UGELES.filter((u) => !dpto || u[2] === dpto).map(([value, label]) => ({ value, label }));
}
