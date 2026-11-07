import type { IIEE } from './types';
import { direccionExacta, num } from './format';
import { enlaceGoogleMaps, km, tiempo, type Ruta } from './ruta';

/** Máximo de colegios en un mensaje (WhatsApp corta los enlaces muy largos) */
const MAX_EN_MENSAJE = 15;

function bloque(ie: IIEE, n?: number): string {
  const l: string[] = [];
  l.push(`${n !== undefined ? `${n}. ` : ''}*${ie.nombre}*`);
  l.push(`${ie.modalidad ? `${ie.modalidad} · ${ie.subnivel}` : (ie.nivel ?? '')} · ${ie.gestion_cod === '3' ? 'Privada' : 'Pública'}`);
  l.push(`🏫 Cód. modular ${ie.cod_mod}${ie.codlocal ? ` · Cód. local ${ie.codlocal}` : ''}`);
  l.push(`📍 ${direccionExacta(ie)}`);
  if (ie.director) l.push(`👤 Director(a): ${ie.director}`);
  if (ie.telefono_fijo) l.push(`☎️ Fijo: ${ie.telefono_fijo}`);
  if (ie.celular) l.push(`📱 Celular: ${ie.celular}`);
  if (ie.talum != null) l.push(`👥 ${num(ie.talum)} alumnos (2025)${ie.turno ? ` · Turno ${ie.turno}` : ''}`);
  if (ie.lat != null && ie.lon != null) l.push(`🗺️ https://www.google.com/maps/search/?api=1&query=${ie.lat},${ie.lon}`);
  return l.join('\n');
}

/** Mensaje con uno o varios colegios y, si existe, la ruta óptima */
export function textoWhatsApp(colegios: IIEE[], ruta?: Ruta | null): string {
  const partes: string[] = [];
  const lista = ruta ? ruta.paradas : colegios;
  if (lista.length === 1 && !ruta) {
    partes.push(bloque(lista[0]));
    partes.push(`🔗 ${location.origin}/?ie=${encodeURIComponent(lista[0].id)}`);
  } else {
    partes.push(`*${ruta ? 'Ruta a colegios' : 'Colegios seleccionados'}* (${lista.length})`);
    lista.slice(0, MAX_EN_MENSAJE).forEach((c, i) => partes.push(bloque(c, i + 1)));
    if (lista.length > MAX_EN_MENSAJE) partes.push(`… y ${lista.length - MAX_EN_MENSAJE} colegios más.`);
  }
  if (ruta) {
    partes.push(
      `${ruta.modo === 'pie' ? '🚶' : '🚗'} *Ruta óptima* desde mi ubicación: ${km(ruta.distancia)} · ${tiempo(ruta.duracion)}\n${enlaceGoogleMaps(ruta)}`,
    );
  }
  partes.push('_Fuente: ESCALE – MINEDU_');
  return partes.join('\n\n');
}

/** Abre WhatsApp (app en el celular, WhatsApp Web en PC) con el mensaje listo para elegir el contacto */
export function abrirWhatsApp(texto: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
}
