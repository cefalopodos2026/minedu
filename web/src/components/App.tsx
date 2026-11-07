'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Filtros, IIEE, Punto, Resumen } from '@/lib/types';
import { FILTROS_VACIOS } from '@/lib/types';
import { buscar, configurado, porId, puntos as fetchPuntos, resumen as fetchResumen } from '@/lib/supabase';
import { DEPARTAMENTOS, NIVELES, distritos, provincias, ugeles, type Opcion } from '@/lib/geo';
import { aCSV, descargar, num, TURNO_COLOR, TURNO_LABEL } from '@/lib/format';
import Ficha from './Ficha';
import RutaPanel from './RutaPanel';
import { calcularRuta, MAX_PARADAS, miUbicacion, type Coord, type Modo, type Ruta } from '@/lib/ruta';
import { abrirWhatsApp, textoWhatsApp } from '@/lib/compartir';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-slate-500">Cargando mapa…</div>,
});

const PAGINA = 50;
const MAX_PUNTOS = 15000;
const CLAVES: (keyof Filtros)[] = ['dpto', 'prov', 'dist', 'ugel', 'q', 'nivel', 'gestion', 'turno', 'estado', 'area'];

/* ------------------------------------------------------------------ */
function Select({
  label,
  value,
  onChange,
  opciones,
  todos = 'Todos',
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opciones: Opcion[];
  todos?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full truncate rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400"
      >
        <option value="">{todos}</option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Tarjeta({
  ie,
  sel,
  activo,
  onToggle,
  onAbrir,
  indice,
}: {
  ie: IIEE;
  sel: boolean;
  activo: boolean;
  onToggle: () => void;
  onAbrir: () => void;
  indice?: number;
}) {
  return (
    <li
      className={`flex gap-3 border-b border-slate-100 px-3 py-3 transition-colors ${
        activo ? 'bg-blue-50' : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <input
          type="checkbox"
          checked={sel}
          onChange={onToggle}
          className="h-5 w-5 cursor-pointer accent-red-600"
          aria-label={`Seleccionar ${ie.nombre}`}
        />
        {indice !== undefined && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {indice}
          </span>
        )}
      </div>
      <button onClick={onAbrir} className="min-w-0 flex-1 text-left">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-slate-900">{ie.nombre}</h3>
          {ie.talum != null && (
            <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-800 tabular-nums">
              {num(ie.talum)} alum.
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600">
          {ie.nivel} · {ie.gestion_cod === '3' ? 'Privada' : 'Pública'}
          {ie.estado !== 'Activo' && <span className="ml-1 font-semibold text-slate-500">· INACTIVO</span>}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {ie.distrito}, {ie.provincia}, {ie.departamento}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600">
          <span className="font-mono">Cód. {ie.cod_mod}</span>
          {ie.turno && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: TURNO_COLOR[ie.turno_grupo ?? ''] }} />
              {ie.turno}
            </span>
          )}
          {ie.telefono_fijo && <span>☎ {ie.telefono_fijo}</span>}
          {ie.celular && <span>📱 {ie.celular}</span>}
          {!ie.telefono_fijo && !ie.celular && ie.telefono && <span>☎ {ie.telefono}</span>}
          {ie.lat == null && <span className="text-amber-700">Sin coordenadas</span>}
        </div>
        {ie.director && <p className="mt-0.5 truncate text-xs text-slate-500">Dir.: {ie.director}</p>}
      </button>
    </li>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200">
      <div className="truncate text-sm font-bold tabular-nums" style={color ? { color } : undefined}>
        {valor}
      </div>
      <div className="truncate text-[10px] leading-tight text-slate-500">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export default function App() {
  // Estado inicial desde la URL (enlaces compartibles) y localStorage (selección guardada).
  // App se renderiza solo en el navegador (ver ClientApp), así que es seguro leer window aquí.
  const [filtros, setFiltros] = useState<Filtros>(() => {
    const sp = new URLSearchParams(location.search);
    const f = { ...FILTROS_VACIOS };
    for (const k of CLAVES) {
      const v = sp.get(k);
      if (v !== null) f[k] = v;
    }
    return f;
  });
  const [aplicados, setAplicados] = useState<Filtros>(filtros);
  const [listoPara, setListoPara] = useState<Filtros | null>(null);
  const cargando = listoPara !== aplicados;
  const [resultados, setResultados] = useState<IIEE[]>([]);
  const [res, setRes] = useState<Resumen | null>(null);
  const [pts, setPts] = useState<Punto[]>([]);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Map<string, IIEE>>(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem('iiee-seleccion') || '[]') as IIEE[];
      return new Map(guardado.map((s) => [s.id, s]));
    } catch {
      return new Map();
    }
  });
  const [activo, setActivo] = useState<IIEE | null>(null); // ficha abierta
  const [foco, setFoco] = useState<IIEE | null>(null); // IE resaltada en el mapa
  const [vistaMovil, setVistaMovil] = useState<'lista' | 'mapa'>('lista');
  const [panel, setPanel] = useState<'resultados' | 'seleccionados'>('resultados');
  const [masFiltros, setMasFiltros] = useState(false);
  const [soloSel, setSoloSel] = useState(false);
  const [ubicacion, setUbicacion] = useState<Coord | null>(null);
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [rutaCargando, setRutaCargando] = useState<string | null>(null); // mensaje de la fase en curso
  const [rutaError, setRutaError] = useState<string | null>(null);
  const [encuadre, setEncuadre] = useState(0);
  const [exportando, setExportando] = useState<string | null>(null);
  const reqId = useRef(0);

  const mostrarFicha = useCallback((ie: IIEE) => {
    setActivo(ie);
    setFoco(ie);
  }, []);

  /* ---------- ficha indicada en la URL (?ie=cod_mod-anexo) ---------- */
  useEffect(() => {
    const ie = new URLSearchParams(location.search).get('ie');
    if (ie && configurado)
      porId(ie)
        .then((r) => r && mostrarFicha(r))
        .catch(() => {});
  }, [mostrarFicha]);

  useEffect(() => {
    localStorage.setItem('iiee-seleccion', JSON.stringify([...seleccion.values()]));
  }, [seleccion]);

  /* ---------- aplicar filtros con retardo (para el texto) ---------- */
  useEffect(() => {
    const t = setTimeout(() => setAplicados(filtros), 400);
    return () => clearTimeout(t);
  }, [filtros]);

  /* ---------- sincronizar URL ---------- */
  useEffect(() => {
    const sp = new URLSearchParams();
    for (const k of CLAVES) if (aplicados[k] && aplicados[k] !== FILTROS_VACIOS[k]) sp.set(k, aplicados[k]);
    if (aplicados.estado !== FILTROS_VACIOS.estado) sp.set('estado', aplicados.estado || 'TODOS');
    if (activo) sp.set('ie', activo.id);
    const qs = sp.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }, [aplicados, activo]);

  /* ---------- consultar ---------- */
  useEffect(() => {
    if (!configurado) return;
    const id = ++reqId.current;
    (async () => {
      try {
        const [r, lista] = await Promise.all([fetchResumen(aplicados), buscar(aplicados, PAGINA, 0)]);
        if (id !== reqId.current) return;
        setRes(r);
        setResultados(lista);
        setError(null);
        setListoPara(aplicados);
        const acotado = aplicados.dpto || aplicados.ugel || aplicados.q.trim().length >= 3 || r.total <= MAX_PUNTOS;
        if (acotado) {
          const p = await fetchPuntos(aplicados, MAX_PUNTOS);
          if (id !== reqId.current) return;
          setPts(p);
          setSoloSel(false);
          setEncuadre((e) => e + 1);
        } else setPts([]);
      } catch (e) {
        if (id !== reqId.current) return;
        setError((e as Error).message || 'Error al consultar la base de datos');
        setListoPara(aplicados);
      }
    })();
  }, [aplicados]);

  const cargarMas = async () => {
    if (!aplicados) return;
    setCargandoMas(true);
    try {
      const mas = await buscar(aplicados, PAGINA, resultados.length);
      setResultados((r) => [...r, ...mas]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargandoMas(false);
    }
  };

  /* ---------- selección ---------- */
  const idsSel = useMemo(() => new Set(seleccion.keys()), [seleccion]);
  const listaSel = useMemo(() => [...seleccion.values()], [seleccion]);

  const toggleSel = useCallback(
    async (id: string) => {
      if (seleccion.has(id)) {
        setSeleccion((s) => {
          const n = new Map(s);
          n.delete(id);
          return n;
        });
        return;
      }
      const ie = resultados.find((r) => r.id === id) ?? (activo?.id === id ? activo : await porId(id));
      if (ie)
        setSeleccion((s) => {
          const n = new Map(s);
          n.set(ie.id, ie);
          return n;
        });
    },
    [seleccion, resultados, activo],
  );

  const seleccionarPagina = () =>
    setSeleccion((s) => {
      const n = new Map(s);
      resultados.forEach((r) => n.set(r.id, r));
      return n;
    });

  /* ---------- ruta óptima desde mi ubicación ---------- */
  const iniciarRuta = async (destinos: IIEE[], modo: Modo = 'auto') => {
    setRuta(null);
    setRutaError(null);
    setRutaCargando('Obteniendo su ubicación…');
    setActivo(null);
    setSoloSel(false);
    setVistaMovil('mapa');
    try {
      const origen = await miUbicacion();
      setUbicacion(origen);
      setRutaCargando('Calculando la ruta más corta por las calles…');
      setRuta(await calcularRuta(origen, destinos, modo));
    } catch (e) {
      setRutaError((e as Error).message);
    } finally {
      setRutaCargando(null);
    }
  };

  const cambiarModo = async (modo: Modo) => {
    if (!ruta) return;
    setRutaError(null);
    setRutaCargando(`Calculando la ruta ${modo === 'pie' ? 'a pie' : 'en auto'}…`);
    try {
      setRuta(await calcularRuta(ruta.origen, ruta.paradas, modo));
    } catch (e) {
      setRutaError((e as Error).message);
    } finally {
      setRutaCargando(null);
    }
  };

  const cerrarRuta = () => {
    setRuta(null);
    setRutaError(null);
  };

  const irAMiUbicacion = async () => {
    try {
      setUbicacion(await miUbicacion());
    } catch (e) {
      setRutaError((e as Error).message);
    }
  };

  const verSeleccionadosEnMapa = () => {
    setSoloSel(true);
    setActivo(null);
    setVistaMovil('mapa');
    setEncuadre((e) => e + 1);
  };

  /* ---------- ficha ---------- */
  const abrir = useCallback(
    async (id: string) => {
      const local = resultados.find((r) => r.id === id) ?? seleccion.get(id);
      if (local) mostrarFicha(local);
      else {
        try {
          const r = await porId(id);
          if (r) mostrarFicha(r);
        } catch (e) {
          setError((e as Error).message);
        }
      }
    },
    [resultados, seleccion, mostrarFicha],
  );

  /* ---------- exportar ---------- */
  const exportarResultados = async () => {
    if (!aplicados || !res) return;
    const total = Math.min(res.total, 20000);
    const filas: IIEE[] = [];
    try {
      for (let off = 0; off < total; off += 1000) {
        setExportando(`${num(off)} / ${num(total)}`);
        filas.push(...(await buscar(aplicados, 1000, off)));
      }
      descargar(`colegios_${new Date().toISOString().slice(0, 10)}.csv`, aCSV(filas));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExportando(null);
    }
  };

  /* ---------- cambios de filtro ---------- */
  const set = (k: keyof Filtros, v: string) =>
    setFiltros((f) => {
      const n = { ...f, [k]: v };
      if (k === 'dpto') {
        n.prov = '';
        n.dist = '';
        if (n.ugel && !ugeles(v).some((u) => u.value === n.ugel)) n.ugel = '';
      }
      if (k === 'prov') n.dist = '';
      return n;
    });

  const limpiar = () => setFiltros({ ...FILTROS_VACIOS });
  const nFiltrosExtra = (['nivel', 'gestion', 'turno', 'area', 'ugel'] as const).filter((k) => filtros[k]).length +
    (filtros.estado !== 'Activo' ? 1 : 0);

  const provs = useMemo(() => provincias(filtros.dpto), [filtros.dpto]);
  const dists = useMemo(() => distritos(filtros.prov), [filtros.prov]);
  const ugs = useMemo(() => ugeles(filtros.dpto), [filtros.dpto]);

  /* ================================================================ */
  if (!configurado) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-100 p-6">
        <div className="max-w-lg rounded-2xl bg-white p-6 shadow">
          <h1 className="text-xl font-bold">Falta configurar Supabase</h1>
          <p className="mt-2 text-sm text-slate-600">
            Defina las variables <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{' '}
            <code>.env.local</code> (local) o en Vercel → Settings → Environment Variables.
          </p>
        </div>
      </div>
    );
  }

  const hayPuntos = pts.length > 0;
  const total = res?.total ?? 0;

  return (
    <div className="flex h-dvh flex-col bg-slate-100 text-slate-900">
      {/* Encabezado */}
      <header className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-red-700 to-red-600 px-4 py-2.5 text-white shadow">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm-7 9.18v4L12 20l7-3.82v-4L12 16l-7-3.82z" />
        </svg>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold leading-tight sm:text-lg">Colegios del Perú</h1>
          <p className="truncate text-[11px] text-red-100">
            Directorio oficial ESCALE – MINEDU · Padrón oct-2026 · Censo Educativo 2025
          </p>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col pb-[calc(3rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[440px_1fr] lg:pb-0">
        {/* ===================== PANEL IZQUIERDO ===================== */}
        <aside
          className={`min-h-0 flex-1 flex-col border-r border-slate-200 bg-slate-50 lg:flex ${
            vistaMovil === 'lista' ? 'flex' : 'hidden'
          }`}
        >
          {/* Filtros */}
          <div className="shrink-0 space-y-2 border-b border-slate-200 bg-white p-3">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={filtros.q}
                onChange={(e) => set('q', e.target.value)}
                placeholder="Nombre del colegio, código modular o de local"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-[16px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select label="Departamento" value={filtros.dpto} onChange={(v) => set('dpto', v)} opciones={DEPARTAMENTOS} />
              <Select
                label="Provincia"
                value={filtros.prov}
                onChange={(v) => set('prov', v)}
                opciones={provs}
                disabled={!filtros.dpto}
              />
              <Select
                label="Distrito"
                value={filtros.dist}
                onChange={(v) => set('dist', v)}
                opciones={dists}
                disabled={!filtros.prov}
              />
            </div>
            {masFiltros && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                <Select
                  label="Nivel / modalidad"
                  value={filtros.nivel}
                  onChange={(v) => set('nivel', v)}
                  opciones={NIVELES.map((n) => ({ value: n, label: n }))}
                />
                <Select
                  label="Gestión"
                  value={filtros.gestion}
                  onChange={(v) => set('gestion', v)}
                  opciones={[
                    { value: 'PUBLICA', label: 'Pública' },
                    { value: 'PRIVADA', label: 'Privada' },
                  ]}
                />
                <Select
                  label="Turno"
                  value={filtros.turno}
                  onChange={(v) => set('turno', v)}
                  opciones={[
                    { value: 'DIURNO', label: 'Diurno (mañana/tarde)' },
                    { value: 'NOCTURNO', label: 'Nocturno' },
                    { value: 'MIXTO', label: 'Día y noche' },
                  ]}
                />
                <Select
                  label="Área"
                  value={filtros.area}
                  onChange={(v) => set('area', v)}
                  opciones={[
                    { value: 'Urbana', label: 'Urbana' },
                    { value: 'Rural', label: 'Rural' },
                  ]}
                />
                <Select
                  label="Estado"
                  value={filtros.estado === 'TODOS' ? '' : filtros.estado}
                  onChange={(v) => set('estado', v || 'TODOS')}
                  todos="Todos"
                  opciones={[
                    { value: 'Activo', label: 'Activo' },
                    { value: 'Inactivo', label: 'Inactivo' },
                  ]}
                />
                <Select label="UGEL" value={filtros.ugel} onChange={(v) => set('ugel', v)} opciones={ugs} todos="Todas" />
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <button onClick={() => setMasFiltros((m) => !m)} className="font-medium text-blue-700 hover:underline">
                {masFiltros ? 'Menos filtros' : `Más filtros${nFiltrosExtra ? ` (${nFiltrosExtra})` : ''}`}
              </button>
              <button onClick={limpiar} className="text-slate-500 hover:text-slate-800 hover:underline">
                Limpiar filtros
              </button>
            </div>
          </div>

          {/* Resumen */}
          {res && (
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="grid grid-cols-4 gap-1.5">
                <Kpi label="Colegios (servicios)" valor={num(res.total)} />
                <Kpi label="Locales" valor={num(res.locales)} />
                <Kpi label="Alumnos 2025" valor={num(res.alumnos)} color="#1d4ed8" />
                <Kpi label="Docentes" valor={num(res.docentes)} />
                <Kpi label="Alum. diurno" valor={num(res.alumnos_diurno)} color={TURNO_COLOR.DIURNO} />
                <Kpi label="Alum. nocturno" valor={num(res.alumnos_nocturno)} color={TURNO_COLOR.NOCTURNO} />
                <Kpi label="Alum. día y noche" valor={num(res.alumnos_mixto)} color={TURNO_COLOR.MIXTO} />
                <Kpi label="Con teléfono" valor={num(res.con_telefono)} />
              </div>
            </div>
          )}

          {/* Pestañas de lista */}
          <div className="flex shrink-0 border-b border-slate-200 bg-white text-sm">
            {(['resultados', 'seleccionados'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPanel(p)}
                className={`flex-1 border-b-2 px-3 py-2 font-medium ${
                  panel === p ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {p === 'resultados' ? `Resultados (${num(total)})` : `Seleccionados (${seleccion.size})`}
              </button>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 text-xs">
            {panel === 'resultados' ? (
              <>
                <button
                  onClick={seleccionarPagina}
                  disabled={!resultados.length}
                  className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                >
                  Seleccionar listados ({resultados.length})
                </button>
                <button
                  onClick={exportarResultados}
                  disabled={!total || !!exportando}
                  className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                >
                  {exportando ? `Exportando ${exportando}…` : `Exportar CSV${total > 20000 ? ' (20 000 primeros)' : ''}`}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={verSeleccionadosEnMapa}
                  disabled={!seleccion.size}
                  className="rounded-md bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-40"
                >
                  Ver en el mapa
                </button>
                <button
                  onClick={() => iniciarRuta(listaSel)}
                  disabled={!seleccion.size}
                  className="rounded-md bg-blue-600 px-2 py-1 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  Ruta óptima{seleccion.size > MAX_PARADAS ? ` (primeros ${MAX_PARADAS})` : ''}
                </button>
                <button
                  onClick={() => abrirWhatsApp(textoWhatsApp(listaSel))}
                  disabled={!seleccion.size}
                  className="rounded-md bg-[#25D366] px-2 py-1 font-medium text-white hover:brightness-95 disabled:opacity-40"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => descargar('colegios_seleccionados.csv', aCSV(listaSel))}
                  disabled={!seleccion.size}
                  className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                >
                  Exportar CSV
                </button>
                <button
                  onClick={() => setSeleccion(new Map())}
                  disabled={!seleccion.size}
                  className="rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                >
                  Quitar todos
                </button>
              </>
            )}
          </div>

          {/* Lista */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {error && (
              <div className="m-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">{error}</div>
            )}
            {panel === 'resultados' ? (
              cargando ? (
                <ul aria-busy>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className="space-y-2 border-b border-slate-100 p-4">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                    </li>
                  ))}
                </ul>
              ) : resultados.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  No se encontraron colegios con esos filtros.
                </p>
              ) : (
                <>
                  <ul className="bg-white">
                    {resultados.map((r) => (
                      <Tarjeta
                        key={r.id}
                        ie={r}
                        sel={idsSel.has(r.id)}
                        activo={activo?.id === r.id}
                        onToggle={() => toggleSel(r.id)}
                        onAbrir={() => abrir(r.id)}
                      />
                    ))}
                  </ul>
                  {resultados.length < total && (
                    <div className="p-3 text-center">
                      <button
                        onClick={cargarMas}
                        disabled={cargandoMas}
                        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {cargandoMas ? 'Cargando…' : `Ver más (${num(resultados.length)} de ${num(total)})`}
                      </button>
                    </div>
                  )}
                </>
              )
            ) : listaSel.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                Marque la casilla de uno o varios colegios para compararlos y verlos juntos en el mapa.
              </p>
            ) : (
              <ul className="bg-white">
                {listaSel.map((r, i) => (
                  <Tarjeta
                    key={r.id}
                    ie={r}
                    indice={i + 1}
                    sel
                    activo={activo?.id === r.id}
                    onToggle={() => toggleSel(r.id)}
                    onAbrir={() => abrir(r.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* ===================== MAPA ===================== */}
        <main className={`relative min-h-0 flex-1 lg:block ${vistaMovil === 'mapa' ? 'block' : 'hidden'}`}>
          <MapView
            puntos={pts}
            seleccionados={listaSel}
            activo={foco}
            soloSeleccionados={soloSel}
            encuadre={encuadre}
            onAbrir={abrir}
            onToggleSel={toggleSel}
            idsSel={idsSel}
            fichaAbierta={!!activo}
            ruta={ruta}
            ubicacion={ubicacion}
          />
          <button
            onClick={irAMiUbicacion}
            title="Mi ubicación"
            aria-label="Mi ubicación"
            className="absolute right-[10px] top-[132px] z-[500] grid h-[44px] w-[44px] place-items-center rounded-lg border-2 border-black/20 bg-white text-blue-600 hover:bg-slate-50"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
          <RutaPanel
            ruta={ruta}
            cargando={rutaCargando}
            error={rutaError}
            onModo={cambiarModo}
            onCerrar={cerrarRuta}
            onAbrir={abrir}
          />
          {/* Avisos y leyenda */}
          <div className="pointer-events-none absolute left-3 top-3 z-[500] flex max-w-[calc(100%-5rem)] flex-col gap-2">
            {soloSel ? (
              <div className="pointer-events-auto rounded-lg bg-white/95 px-3 py-2 text-xs shadow ring-1 ring-slate-200">
                Mostrando solo los {seleccion.size} seleccionados ·{' '}
                <button
                  className="font-semibold text-blue-700 underline"
                  onClick={() => {
                    setSoloSel(false);
                    setEncuadre((e) => e + 1);
                  }}
                >
                  ver todos los resultados
                </button>
              </div>
            ) : !hayPuntos && res && !cargando ? (
              <div className="pointer-events-auto rounded-lg bg-white/95 px-3 py-2 text-xs shadow ring-1 ring-slate-200">
                Elija un departamento o escriba un nombre para ver los colegios en el mapa.
              </div>
            ) : res && pts.length < res.con_coordenadas ? (
              <div className="pointer-events-auto rounded-lg bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow ring-1 ring-amber-200">
                El mapa muestra {num(pts.length)} de {num(res.con_coordenadas)} ubicaciones. Afine los filtros.
              </div>
            ) : null}
          </div>
          <div
            className={`pointer-events-none absolute bottom-6 right-3 z-[500] rounded-lg bg-white/95 px-3 py-2 text-[11px] shadow ring-1 ring-slate-200 ${
              ruta || rutaCargando || rutaError ? 'hidden lg:block' : ''
            }`}
          >
            {Object.entries(TURNO_LABEL).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white" style={{ background: TURNO_COLOR[k] }} />
                {v}
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Seleccionado
            </div>
          </div>
        </main>

        {/* ===================== FICHA ===================== */}
        {activo && (
          <div className="fixed inset-0 z-[1000] lg:absolute lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[480px] lg:shadow-2xl">
            <Ficha
              ie={activo}
              seleccionado={idsSel.has(activo.id)}
              onToggleSel={() => toggleSel(activo.id)}
              onCerrar={() => setActivo(null)}
              onAbrir={abrir}
              onRuta={() => iniciarRuta([activo])}
              onVerMapa={() => {
                const a = activo;
                setSoloSel(false);
                setVistaMovil('mapa');
                if (window.innerWidth < 1024) setActivo(null);
                // nuevo objeto -> el mapa vuelve a volar al punto ya visible
                setTimeout(() => setFoco({ ...a }), 120);
              }}
            />
          </div>
        )}
      </div>

      {/* Navegación inferior (móvil / tablet) */}
      <nav className="fixed inset-x-0 bottom-0 z-[900] grid grid-cols-3 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] text-sm shadow-[0_-2px_8px_rgba(0,0,0,0.06)] lg:hidden">
        {(['lista', 'mapa'] as const).map((v) => (
          <button
            key={v}
            onClick={() => {
              setVistaMovil(v);
              if (v === 'mapa') setTimeout(() => setEncuadre((e) => e + 1), 80);
            }}
            className={`h-12 font-semibold ${vistaMovil === v ? 'text-red-700' : 'text-slate-500'}`}
          >
            {v === 'lista' ? `📋 Lista (${num(total)})` : `🗺️ Mapa${seleccion.size ? ` · ${seleccion.size}` : ''}`}
          </button>
        ))}
        <button
          onClick={() => {
            setVistaMovil('mapa');
            if (ruta || rutaCargando) return;
            if (listaSel.length) iniciarRuta(listaSel);
            else setRutaError('Marque uno o varios colegios (casilla) o abra una ficha y pulse "Ruta".');
          }}
          className={`h-12 font-semibold ${ruta ? 'text-blue-700' : 'text-slate-500'}`}
        >
          🧭 Ruta{ruta ? ` · ${ruta.paradas.length}` : ''}
        </button>
      </nav>
    </div>
  );
}
