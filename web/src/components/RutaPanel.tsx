'use client';

import { useState } from 'react';
import { enlaceGoogleMaps, km, tiempo, type Modo, type Ruta } from '@/lib/ruta';
import { abrirWhatsApp, textoWhatsApp } from '@/lib/compartir';

interface Props {
  ruta: Ruta | null;
  /** mensaje de la fase en curso, o null */
  cargando: string | null;
  error: string | null;
  onModo: (m: Modo) => void;
  onCerrar: () => void;
  onAbrir: (id: string) => void;
}

/** Tarjeta flotante sobre el mapa con la ruta óptima (resumen, paradas y acciones) */
export default function RutaPanel({ ruta, cargando, error, onModo, onCerrar, onAbrir }: Props) {
  const [abierto, setAbierto] = useState(true);
  if (!ruta && !cargando && !error) return null;

  return (
    <div className="absolute inset-x-2 bottom-2 z-[600] max-h-[60%] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 lg:inset-x-auto lg:bottom-4 lg:left-4 lg:w-[400px]">
      {cargando ? (
        <div className="flex items-center gap-3 p-4 text-sm text-slate-700">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          {cargando}
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 p-4 text-sm">
          <p className="flex-1 text-red-700">{error}</p>
          <button onClick={onCerrar} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
            Cerrar
          </button>
        </div>
      ) : (
        ruta && (
          <div className="flex max-h-full flex-col">
            {/* Cabecera: resumen + modo */}
            <div className="flex items-center gap-2 border-b border-slate-100 p-3">
              <button
                onClick={() => setAbierto((a) => !a)}
                className="min-w-0 flex-1 text-left"
                aria-expanded={abierto}
              >
                <div className="text-lg font-bold leading-tight text-slate-900">
                  {tiempo(ruta.duracion)} <span className="text-sm font-medium text-slate-500">· {km(ruta.distancia)}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Ruta óptima a {ruta.paradas.length} colegio{ruta.paradas.length > 1 ? 's' : ''} desde su ubicación
                </div>
              </button>
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                {(['auto', 'pie'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => m !== ruta.modo && onModo(m)}
                    className={`rounded-md px-2.5 py-1.5 ${ruta.modo === m ? 'bg-white text-blue-700 shadow' : 'text-slate-500'}`}
                  >
                    {m === 'auto' ? '🚗 Auto' : '🚶 A pie'}
                  </button>
                ))}
              </div>
            </div>

            {/* Paradas en orden */}
            {abierto && (
              <ol className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-sm">
                {ruta.paradas.map((p, i) => (
                  <li key={p.id} className="flex items-start gap-2 py-1.5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-700 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <button onClick={() => onAbrir(p.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-medium text-slate-900">{p.nombre}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {p.nivel} · {p.distrito}
                      </span>
                    </button>
                    {ruta.tramos[i] && (
                      <span className="shrink-0 text-right text-xs text-slate-500 tabular-nums">
                        {km(ruta.tramos[i].distancia)}
                        <br />
                        {tiempo(ruta.tramos[i].duracion)}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {/* Acciones */}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 p-3 text-sm font-semibold">
              <a
                href={enlaceGoogleMaps(ruta)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-blue-600 px-2 py-2.5 text-center text-white hover:bg-blue-700"
              >
                Navegar
              </a>
              <button
                onClick={() => abrirWhatsApp(textoWhatsApp(ruta.paradas, ruta))}
                className="rounded-xl bg-[#25D366] px-2 py-2.5 text-white hover:brightness-95"
              >
                WhatsApp
              </button>
              <button onClick={onCerrar} className="rounded-xl bg-slate-100 px-2 py-2.5 text-slate-700 hover:bg-slate-200">
                Cerrar
              </button>
            </div>
            <p className="px-3 pb-2 text-[10px] text-slate-400">
              Ruta: OSRM / © OpenStreetMap. Tiempos estimados sin tráfico.
            </p>
          </div>
        )
      )}
    </div>
  );
}
