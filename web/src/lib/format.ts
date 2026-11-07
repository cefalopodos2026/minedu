import type { IIEE } from './types';

/** Igual que el ETL: mayúsculas, sin tildes, solo A-Z 0-9 Ñ y espacios */
export function normalizar(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const nf = new Intl.NumberFormat('es-PE');
export const num = (n: number | null | undefined) => (n === null || n === undefined ? '—' : nf.format(n));

export const TURNO_COLOR: Record<string, string> = {
  DIURNO: '#2563eb',
  NOCTURNO: '#7c3aed',
  MIXTO: '#ea580c',
};
export const TURNO_LABEL: Record<string, string> = {
  DIURNO: 'Diurno',
  NOCTURNO: 'Nocturno',
  MIXTO: 'Día y noche',
};

export function fechaPE(iso: string | null): string {
  if (!iso) return '—';
  // acepta "2026-10-30" y también "2026-10-30T00:00:00.000Z"
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Separa la lista normalizada del ETL ("043-420252 / 01-4770409") en números marcables */
export function telefonos(t: string | null): { texto: string; marcar: string }[] {
  if (!t) return [];
  return t.split(' / ').map((s) => ({ texto: s, marcar: s.replace(/\D/g, '') }));
}

/** Enlace de WhatsApp para un celular peruano (9 dígitos) con mensaje opcional */
export function waCelular(cel: string, texto?: string): string {
  const q = texto ? `?text=${encodeURIComponent(texto)}` : '';
  return `https://wa.me/51${cel.replace(/\D/g, '')}${q}`;
}

/** Dirección exacta: vía y número + localidad / centro poblado + distrito, provincia, departamento */
export function direccionExacta(ie: IIEE): string {
  const partes = [ie.direccion, ie.localidad, ie.centro_poblado, ie.distrito, ie.provincia, ie.departamento]
    .map((p) => (p ?? '').trim())
    .filter(Boolean);
  // quitar repeticiones (p. ej. localidad = centro poblado = distrito)
  return partes.filter((p, i) => partes.indexOf(p) === i).join(', ');
}

const CSV_COLS: [keyof IIEE, string][] = [
  ['cod_mod', 'Código modular'], ['anexo', 'Anexo'], ['codlocal', 'Código local'], ['nombre', 'Nombre'],
  ['modalidad', 'Modalidad'], ['subnivel', 'Nivel / ciclo'], ['nivel', 'Nivel detallado (ESCALE)'], ['forma', 'Forma'], ['gestion', 'Gestión'], ['dependencia', 'Dependencia'],
  ['director', 'Director(a)'], ['telefono_fijo', 'Teléfono fijo'], ['celular', 'Celular'],
  ['telefono', 'Teléfono (texto original)'], ['email', 'Email'], ['pagweb', 'Página web'],
  ['direccion', 'Dirección'], ['localidad', 'Localidad'], ['centro_poblado', 'Centro poblado'], ['area', 'Área'],
  ['ubigeo', 'Ubigeo'], ['departamento', 'Departamento'], ['provincia', 'Provincia'], ['distrito', 'Distrito'],
  ['dre', 'DRE'], ['codooii', 'Código UGEL'], ['ugel', 'UGEL'], ['turno', 'Turno'], ['turno_grupo', 'Día/Noche'],
  ['talum', 'Alumnos 2025'], ['talum_hom', 'Alumnos hombres'], ['talum_muj', 'Alumnas mujeres'],
  ['tdoc', 'Docentes 2025'], ['tsec', 'Secciones 2025'], ['sexo', 'Tipo (sexo)'], ['caracteristica', 'Característica'],
  ['estado', 'Estado'], ['lat', 'Latitud'], ['lon', 'Longitud'], ['ruc', 'RUC'], ['razon_social', 'Razón social'],
  ['fecha_registro', 'Fecha de registro'], ['fecha_actualizacion', 'Fecha de actualización'],
];

export function aCSV(rows: IIEE[]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // separador ; y BOM para que Excel en español lo abra directamente
  const head = CSV_COLS.map(([, h]) => h).join(';');
  const body = rows.map((r) => CSV_COLS.map(([k]) => esc(r[k])).join(';')).join('\r\n');
  return '﻿' + head + '\r\n' + body;
}

export function descargar(nombre: string, contenido: string) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
