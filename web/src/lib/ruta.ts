import type { IIEE } from './types';

export type Modo = 'auto' | 'pie';
export type Coord = { lat: number; lon: number };

export interface Ruta {
  modo: Modo;
  origen: Coord;
  /** colegios en el orden óptimo de visita */
  paradas: IIEE[];
  /** distancia (m) y duración (s) de cada tramo: origen→1, 1→2, ... */
  tramos: { distancia: number; duracion: number }[];
  distancia: number;
  duracion: number;
  /** línea de la ruta por las calles [lat, lon][] */
  linea: [number, number][];
}

/** Máximo de colegios por ruta (límite razonable del servicio público y de Google Maps) */
export const MAX_PARADAS = 25;

// OSRM sobre OpenStreetMap, servidor público de FOSSGIS (gratuito, sin clave)
const OSRM: Record<Modo, string> = {
  auto: 'https://routing.openstreetmap.de/routed-car/trip/v1/driving',
  pie: 'https://routing.openstreetmap.de/routed-foot/trip/v1/foot',
};

/** Ubicación actual del dispositivo (GPS del celular o del navegador) */
export function miUbicacion(): Promise<Coord> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Este navegador no permite obtener la ubicación.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? 'Permiso de ubicación denegado. Actívelo en el navegador para calcular la ruta.'
              : 'No se pudo obtener su ubicación. Verifique que el GPS esté activo.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

/**
 * Ruta por calles desde el origen visitando todos los colegios.
 * Con varios colegios el servicio "trip" calcula el orden óptimo de visita.
 */
export async function calcularRuta(origen: Coord, colegios: IIEE[], modo: Modo): Promise<Ruta> {
  const destinos = colegios.filter((c) => c.lat != null && c.lon != null).slice(0, MAX_PARADAS);
  if (!destinos.length) throw new Error('Los colegios elegidos no tienen coordenadas.');
  const coords = [origen, ...destinos.map((d) => ({ lat: d.lat!, lon: d.lon! }))]
    .map((c) => `${c.lon.toFixed(6)},${c.lat.toFixed(6)}`)
    .join(';');
  const url = `${OSRM[modo]}/${coords}?source=first&roundtrip=false&destination=any&overview=full&geometries=geojson`;
  let r: Response;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  } catch {
    throw new Error('El servicio de rutas tardó demasiado o no hay conexión. Intente nuevamente.');
  }
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || j.code !== 'Ok') {
    throw new Error(
      j?.code === 'NoTrips' || j?.code === 'NoRoute'
        ? 'No se encontró una ruta por calles hasta esos colegios.'
        : 'El servicio de rutas no respondió. Intente nuevamente.',
    );
  }
  const viaje = j.trips[0];
  // waypoints[i].waypoint_index = posición del punto de entrada i dentro del viaje
  const paradas = destinos
    .map((d, i) => ({ d, pos: j.waypoints[i + 1].waypoint_index as number }))
    .sort((a, b) => a.pos - b.pos)
    .map((x) => x.d);
  return {
    modo,
    origen,
    paradas,
    tramos: viaje.legs.map((l: { distance: number; duration: number }) => ({
      distancia: l.distance,
      duracion: l.duration,
    })),
    distancia: viaje.distance,
    duracion: viaje.duration,
    linea: viaje.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]),
  };
}

/** Navegación paso a paso en Google Maps con las paradas en el orden óptimo */
export function enlaceGoogleMaps(ruta: Ruta): string {
  const p = ruta.paradas.map((c) => `${c.lat},${c.lon}`);
  const destino = p[p.length - 1];
  // Google Maps admite hasta 9 paradas intermedias en un enlace
  const intermedias = p.slice(0, -1).slice(0, 9);
  const params = new URLSearchParams({
    api: '1',
    origin: `${ruta.origen.lat},${ruta.origen.lon}`,
    destination: destino,
    travelmode: ruta.modo === 'pie' ? 'walking' : 'driving',
  });
  if (intermedias.length) params.set('waypoints', intermedias.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export const km = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
export function tiempo(s: number) {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}
