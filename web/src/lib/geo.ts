import ubigeoData from '@/data/ubigeo.json';
import ugelData from '@/data/ugel.json';
import nivelesData from '@/data/niveles.json';

export type Opcion = { value: string; label: string };
const U = ubigeoData as [string, string, string, string][];

export const NIVELES = nivelesData as string[];
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
