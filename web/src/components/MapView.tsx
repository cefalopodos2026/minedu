'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { IIEE, Punto } from '@/lib/types';
import { TURNO_COLOR, TURNO_LABEL } from '@/lib/format';
import type { Coord, Ruta } from '@/lib/ruta';

interface Props {
  puntos: Punto[];
  seleccionados: IIEE[];
  activo: IIEE | null;
  soloSeleccionados: boolean;
  /** cambia cada vez que se pide reencuadrar el mapa */
  encuadre: number;
  onAbrir: (id: string) => void;
  onToggleSel: (id: string) => void;
  idsSel: Set<string>;
  /** hay una ficha abierta tapando el lado derecho (escritorio) */
  fichaAbierta: boolean;
  /** ruta óptima trazada por las calles */
  ruta: Ruta | null;
  /** ubicación actual del usuario */
  ubicacion: Coord | null;
}

/** halo azul claro alrededor de "Usted está aquí" (tamaño fijo en píxeles, distinto de los colegios) */
const HALO: L.CircleMarkerOptions = { radius: 20, stroke: false, fillColor: '#3b82f6', fillOpacity: 0.22, interactive: false };

const PERU: L.LatLngBoundsExpression = [[-18.4, -81.4], [-0.03, -68.6]];

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function popupHtml(id: string, nombre: string, nivel: string | null, turno: string | null, sel: boolean) {
  return `<div class="popup-ie">
    <div class="popup-nombre">${escapar(nombre)}</div>
    <div class="popup-meta">${escapar(nivel ?? '')}${turno ? ' · ' + (TURNO_LABEL[turno] ?? turno) : ''}</div>
    <div class="popup-acciones">
      <button data-accion="abrir" data-id="${id}">Ver ficha</button>
      <button data-accion="sel" data-id="${id}" class="sec">${sel ? 'Quitar selección' : 'Seleccionar'}</button>
    </div>
  </div>`;
}

const pin = (n: number | string, color = '#dc2626') =>
  L.divIcon({
    className: 'pin-sel',
    html: `<div style="--c:${color}"><span>${n}</span></div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });

export default function MapView(props: Props) {
  const {
    puntos, seleccionados, activo, soloSeleccionados, encuadre, onAbrir, onToggleSel, idsSel, fichaAbierta, ruta, ubicacion,
  } = props;
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const selLayerRef = useRef<L.LayerGroup | null>(null);
  const activoRef = useRef<L.Marker | null>(null);
  const rutaLayerRef = useRef<L.LayerGroup | null>(null);
  const ubicLayerRef = useRef<L.LayerGroup | null>(null);
  /** acción a ejecutar cuando el mapa oculto (pestaña Lista en celular) vuelva a verse */
  const pendienteRef = useRef<(() => void) | null>(null);
  const cbRef = useRef({ onAbrir, onToggleSel });
  const idsSelRef = useRef(idsSel);
  useEffect(() => {
    cbRef.current = { onAbrir, onToggleSel };
    idsSelRef.current = idsSel;
  });

  // Inicializar mapa una sola vez
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { preferCanvas: true, zoomControl: false, attributionControl: true });
    map.fitBounds(PERU);
    L.control.zoom({ position: 'topright' }).addTo(map);
    const calles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    const satelite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: 'Imágenes &copy; Esri' },
    );
    L.control.layers({ Calles: calles, Satélite: satelite }, undefined, { position: 'topright' }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    clusterRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      disableClusteringAtZoom: 17,
      iconCreateFunction: (c) => {
        const n = c.getChildCount();
        const s = n < 10 ? 30 : n < 100 ? 36 : n < 1000 ? 42 : 48;
        return L.divIcon({
          html: `<div><span>${n >= 1000 ? Math.round(n / 100) / 10 + 'k' : n}</span></div>`,
          className: 'cluster-ie',
          iconSize: [s, s],
        });
      },
    }).addTo(map);
    selLayerRef.current = L.layerGroup().addTo(map);
    rutaLayerRef.current = L.layerGroup().addTo(map);
    ubicLayerRef.current = L.layerGroup().addTo(map);

    // Delegación de eventos de los botones de los popups
    const cont = map.getContainer();
    const handler = (e: Event) => {
      const t = (e.target as HTMLElement).closest('button[data-accion]') as HTMLButtonElement | null;
      if (!t) return;
      const id = t.dataset.id!;
      if (t.dataset.accion === 'abrir') cbRef.current.onAbrir(id);
      else {
        cbRef.current.onToggleSel(id);
        map.closePopup();
      }
    };
    cont.addEventListener('click', handler);

    // Ajustar tamaño cuando el contenedor cambia (pestañas en móvil)
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(divRef.current);

    mapRef.current = map;
    return () => {
      ro.disconnect();
      cont.removeEventListener('click', handler);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Puntos del filtro (agrupados)
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    if (soloSeleccionados) return;
    const markers = puntos.map(([id, lat, lon, nombre, nivel, turno]) => {
      const m = L.circleMarker([lat, lon], {
        radius: 6,
        color: '#fff',
        weight: 1.5,
        fillColor: TURNO_COLOR[turno ?? ''] ?? '#2563eb',
        fillOpacity: 0.9,
      });
      m.bindPopup(() => popupHtml(id, nombre, nivel, turno, idsSelRef.current.has(id)));
      m.bindTooltip(escapar(nombre), { direction: 'top', offset: [0, -6] });
      return m;
    });
    cluster.addLayers(markers);
  }, [puntos, soloSeleccionados]);

  // Seleccionados (pines numerados, sin agrupar)
  useEffect(() => {
    const layer = selLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (ruta) return;
    seleccionados.forEach((s, i) => {
      if (s.lat == null || s.lon == null) return;
      L.marker([s.lat, s.lon], { icon: pin(i + 1), zIndexOffset: 1000 })
        .bindPopup(() => popupHtml(s.id, s.nombre, s.nivel, s.turno_grupo, true))
        .bindTooltip(escapar(s.nombre), { direction: 'top', offset: [0, -34] })
        .addTo(layer);
    });
  }, [seleccionados, ruta]);

  // Reencuadrar cuando se pide
  useEffect(() => {
    const map = mapRef.current;
    if (!map || encuadre === 0) return;
    const coords: L.LatLngTuple[] = soloSeleccionados
      ? seleccionados.filter((s) => s.lat != null && s.lon != null).map((s) => [s.lat!, s.lon!])
      : puntos.map((p) => [p[1], p[2]]);
    map.invalidateSize();
    if (coords.length === 1) map.setView(coords[0], 16);
    else if (coords.length > 1) map.fitBounds(L.latLngBounds(coords), { padding: [30, 30], maxZoom: 16 });
    else map.fitBounds(PERU);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encuadre]);

  // IE activa (ficha abierta): pin verde y centrar
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    activoRef.current?.remove();
    activoRef.current = null;
    if (activo?.lat != null && activo?.lon != null) {
      map.invalidateSize();
      const ll = L.latLng(activo.lat, activo.lon);
      activoRef.current = L.marker(ll, { icon: pin('★', '#059669'), zIndexOffset: 2000 })
        .bindTooltip(escapar(activo.nombre), { direction: 'top', offset: [0, -34], permanent: false })
        .addTo(map);
      const size = map.getSize();
      const zoom = Math.max(map.getZoom() || 0, 16);
      if (size.x === 0 || size.y === 0) {
        // mapa oculto (pestaña Lista en celular): se centrará al mostrarse
        pendienteRef.current = () => map.setView(ll, zoom);
        return;
      }
      // En escritorio la ficha tapa ~480px a la derecha: desplazar el centro
      const tapa = window.innerWidth >= 1024 && fichaAbierta ? Math.min(240, size.x / 3) : 0;
      const centro = tapa ? map.unproject(map.project(ll, zoom).add([tapa, 0]), zoom) : ll;
      map.flyTo(centro, zoom, { duration: 0.8 });
    }
  }, [activo, fichaAbierta]);

  // Al volver a mostrarse el mapa, centrar la IE pendiente
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onResize = () => {
      const accion = pendienteRef.current;
      const s = map.getSize();
      if (accion && s.x > 0 && s.y > 0) {
        pendienteRef.current = null;
        accion();
      }
    };
    map.on('resize', onResize);
    return () => {
      map.off('resize', onResize);
    };
  }, []);

  // Ruta óptima: línea por las calles, origen y paradas numeradas en orden de visita
  useEffect(() => {
    const map = mapRef.current;
    const layer = rutaLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!ruta) return;
    L.polyline(ruta.linea, { color: '#fff', weight: 9, opacity: 0.9 }).addTo(layer);
    const linea = L.polyline(ruta.linea, { color: '#1d4ed8', weight: 5, opacity: 0.95 }).addTo(layer);
    L.circleMarker([ruta.origen.lat, ruta.origen.lon], HALO).addTo(layer);
    L.circleMarker([ruta.origen.lat, ruta.origen.lon], {
      radius: 9, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1,
    })
      .bindTooltip('Usted está aquí', { direction: 'top', offset: [0, -8] })
      .addTo(layer);
    ruta.paradas.forEach((p, i) => {
      L.marker([p.lat!, p.lon!], { icon: pin(i + 1, '#1d4ed8'), zIndexOffset: 1500 })
        .bindTooltip(escapar(p.nombre), { direction: 'top', offset: [0, -34] })
        .on('click', () => cbRef.current.onAbrir(p.id))
        .addTo(layer);
    });
    const encuadrar = () => {
      const alto = map.getSize().y;
      // dejar libre la parte inferior, donde está el panel de la ruta
      map.fitBounds(linea.getBounds(), {
        paddingTopLeft: [30, 30],
        paddingBottomRight: [30, window.innerWidth >= 1024 ? 30 : Math.round(alto * 0.45)],
        maxZoom: 17,
      });
    };
    const s = map.getSize();
    if (s.x === 0 || s.y === 0) pendienteRef.current = encuadrar;
    else encuadrar();
  }, [ruta]);

  // Ubicación actual (botón "Mi ubicación")
  useEffect(() => {
    const map = mapRef.current;
    const layer = ubicLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!ubicacion || ruta) return; // con ruta, el origen ya se dibuja en la ruta
    L.circleMarker([ubicacion.lat, ubicacion.lon], HALO).addTo(layer);
    L.circleMarker([ubicacion.lat, ubicacion.lon], {
      radius: 9, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1,
    })
      .bindTooltip('Usted está aquí', { direction: 'top', offset: [0, -8] })
      .addTo(layer);
    const ir = () => map.setView([ubicacion.lat, ubicacion.lon], 15);
    const s = map.getSize();
    if (s.x === 0 || s.y === 0) pendienteRef.current = ir;
    else ir();
  }, [ubicacion, ruta]);

  return <div ref={divRef} className="h-full w-full" />;
}
