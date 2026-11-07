'use client';

import { useEffect, useState } from 'react';
import type { IIEE } from '@/lib/types';
import { delLocal } from '@/lib/supabase';
import { abrirWhatsApp, textoWhatsApp } from '@/lib/compartir';
import { direccionExacta, fechaPE, num, telefonos, TURNO_COLOR, TURNO_LABEL, waCelular } from '@/lib/format';

interface Props {
  ie: IIEE;
  seleccionado: boolean;
  onToggleSel: () => void;
  onCerrar: () => void;
  onVerMapa: () => void;
  /** trazar la ruta desde la ubicación actual hasta este colegio */
  onRuta: () => void;
  onAbrir: (id: string) => void;
}

function Fila({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] gap-2 py-1.5 border-b border-slate-100 last:border-0 text-sm">
      <dt className="text-slate-500">{k}</dt>
      <dd className={`text-slate-900 break-words ${mono ? 'font-mono' : ''}`}>{v ?? '—'}</dd>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</h3>
      {children}
    </section>
  );
}

function Accion(p: {
  onClick: () => void;
  icono: string;
  texto: string;
  activo?: boolean;
  verde?: boolean;
  disabled?: boolean;
}) {
  const color = p.verde
    ? 'bg-[#25D366] text-white'
    : p.activo
      ? 'bg-red-600 text-white'
      : 'bg-slate-100 text-slate-700 hover:bg-slate-200';
  return (
    <button
      onClick={p.onClick}
      disabled={p.disabled}
      className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 disabled:opacity-40 ${color}`}
    >
      <span className="text-lg leading-none">{p.icono}</span>
      {p.texto}
    </button>
  );
}

/** Botones para llamar (y escribir por WhatsApp a los celulares) */
function Telefonos({ lista, whatsapp }: { lista: { texto: string; marcar: string }[]; whatsapp?: boolean }) {
  return (
    <span className="flex flex-wrap gap-2">
      {lista.map((t) => (
        <span key={t.marcar} className="inline-flex flex-wrap gap-1">
          <a
            href={`tel:${t.marcar}`}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1z" />
            </svg>
            {t.texto}
          </a>
          {whatsapp && (
            <a
              href={waCelular(t.marcar)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-[#25D366] px-2 py-1 text-xs font-semibold text-white hover:brightness-95"
              aria-label={`WhatsApp ${t.texto}`}
            >
              WhatsApp
            </a>
          )}
        </span>
      ))}
    </span>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <div className="text-xl font-bold" style={color ? { color } : undefined}>
        {valor}
      </div>
      <div className="text-[11px] leading-tight text-slate-500">{label}</div>
    </div>
  );
}

export default function Ficha({ ie, seleccionado, onToggleSel, onCerrar, onVerMapa, onRuta, onAbrir }: Props) {
  const [cargado, setCargado] = useState<{ codlocal: string; filas: IIEE[] } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const local = cargado && cargado.codlocal === ie.codlocal ? cargado.filas : null;

  useEffect(() => {
    let vivo = true;
    const cl = ie.codlocal;
    if (cl)
      delLocal(cl)
        .then((filas) => vivo && setCargado({ codlocal: cl, filas }))
        .catch(() => vivo && setCargado({ codlocal: cl, filas: [] }));
    return () => {
      vivo = false;
    };
  }, [ie.codlocal]);

  const fijos = telefonos(ie.telefono_fijo);
  const celulares = telefonos(ie.celular);
  // texto original del padrón si no se pudo normalizar ningún número
  const sinTelefono = fijos.length || celulares.length ? '—' : ie.telefono || 'No registrado en el padrón';
  const tieneCoord = ie.lat != null && ie.lon != null;
  const activosLocal = (local ?? []).filter((s) => s.estado === 'Activo');
  const sumaLocal = (g?: string) =>
    activosLocal.filter((s) => !g || s.turno_grupo === g).reduce((a, s) => a + (s.talum ?? 0), 0);
  // alumnado del local por cada turno (Mañana, Tarde, Noche, Mañana-Tarde, ...)
  const porTurnoLocal = Object.entries(
    activosLocal.reduce<Record<string, { servicios: number; alumnos: number }>>((acc, s) => {
      const t = s.turno ?? 'Sin turno';
      acc[t] ??= { servicios: 0, alumnos: 0 };
      acc[t].servicios++;
      acc[t].alumnos += s.talum ?? 0;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].alumnos - a[1].alumnos);

  const compartir = async () => {
    const url = `${location.origin}${location.pathname}?ie=${encodeURIComponent(ie.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: ie.nombre, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1800);
      }
    } catch {
      /* cancelado */
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Cabecera */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start gap-3">
          <button
            onClick={onCerrar}
            className="mt-0.5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar ficha"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-tight text-slate-900">{ie.nombre}</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {ie.modalidad ? `${ie.modalidad} · ${ie.subnivel}` : ie.nivel} · {ie.gestion}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">📍 {direccionExacta(ie)}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  ie.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {ie.estado}
              </span>
              {ie.turno && (
                <span
                  className="rounded-full px-2 py-0.5 font-medium text-white"
                  style={{ background: TURNO_COLOR[ie.turno_grupo ?? ''] ?? '#64748b' }}
                >
                  Turno {ie.turno}
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-slate-700">
                Cód. modular {ie.cod_mod}
              </span>
              {ie.codlocal && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-slate-700">
                  Cód. local {ie.codlocal}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Acciones rápidas: botones grandes, cómodos en el celular */}
        <div className="mt-3 grid grid-cols-5 gap-1.5 text-[11px] font-semibold sm:text-xs">
          <Accion
            onClick={onToggleSel}
            activo={seleccionado}
            icono={seleccionado ? '✓' : '+'}
            texto={seleccionado ? 'Elegido' : 'Elegir'}
          />
          <Accion onClick={onRuta} icono="🧭" texto="Ruta" disabled={!tieneCoord} />
          <Accion onClick={onVerMapa} icono="🗺️" texto="Mapa" disabled={!tieneCoord} />
          <Accion onClick={() => abrirWhatsApp(textoWhatsApp([ie]))} icono="💬" texto="WhatsApp" verde />
          <Accion onClick={compartir} icono="🔗" texto={copiado ? 'Copiado' : 'Enlace'} />
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        <Seccion titulo="Alumnado y docentes (Censo Educativo 2025)">
          {ie.en_censo_2025 ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Kpi label="Alumnos" valor={num(ie.talum)} color="#1d4ed8" />
                <Kpi label="Hombres" valor={num(ie.talum_hom)} />
                <Kpi label="Mujeres" valor={num(ie.talum_muj)} />
                <Kpi label="Docentes" valor={num(ie.tdoc)} />
                <Kpi label="Secciones" valor={num(ie.tsec)} />
                <Kpi
                  label={ie.turno_grupo ? `Alumnado ${TURNO_LABEL[ie.turno_grupo].toLowerCase()}` : 'Turno'}
                  valor={ie.turno ?? '—'}
                  color={TURNO_COLOR[ie.turno_grupo ?? '']}
                />
              </div>
              {ie.caracteristica && ie.caracteristica !== 'No aplica' && (
                <p className="mt-2 text-xs text-slate-500">Característica: {ie.caracteristica}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Este servicio no figura en el Censo Educativo 2025 (puede estar inactivo o ser de reciente creación).
            </p>
          )}
        </Seccion>

        <Seccion titulo="Contacto">
          <dl>
            <Fila k="Director(a)" v={ie.director} />
            <Fila
              k="Teléfono fijo"
              v={fijos.length ? <Telefonos lista={fijos} /> : sinTelefono}
            />
            <Fila k="Celular" v={celulares.length ? <Telefonos lista={celulares} whatsapp /> : sinTelefono} />
            <Fila
              k="Correo"
              v={ie.email ? <a className="text-blue-700 underline" href={`mailto:${ie.email}`}>{ie.email}</a> : '—'}
            />
            <Fila
              k="Página web"
              v={
                ie.pagweb ? (
                  <a
                    className="text-blue-700 underline"
                    href={/^https?:/i.test(ie.pagweb) ? ie.pagweb : `http://${ie.pagweb}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ie.pagweb}
                  </a>
                ) : (
                  '—'
                )
              }
            />
          </dl>
        </Seccion>

        <Seccion titulo="Ubicación">
          <dl>
            <Fila k="Dirección exacta" v={<b className="font-semibold">{direccionExacta(ie)}</b>} />
            <Fila k="Dirección (vía)" v={ie.direccion} />
            <Fila k="Localidad" v={ie.localidad} />
            <Fila k="Centro poblado" v={ie.centro_poblado} />
            <Fila k="Área" v={ie.area} />
            <Fila k="Distrito" v={ie.distrito} />
            <Fila k="Provincia" v={ie.provincia} />
            <Fila k="Departamento" v={ie.departamento} />
            <Fila k="Ubigeo" v={ie.ubigeo} mono />
            <Fila k="DRE" v={ie.dre} />
            <Fila k="UGEL" v={ie.ugel ? `${ie.ugel} (${ie.codooii})` : '—'} />
            <Fila k="Coordenadas" v={tieneCoord ? `${ie.lat}, ${ie.lon}` : 'Sin georreferencia'} mono />
          </dl>
          {tieneCoord && (
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                href={`https://www.google.com/maps/search/?api=1&query=${ie.lat},${ie.lon}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir en Google Maps
              </a>
              <button
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                onClick={onRuta}
              >
                Cómo llegar desde mi ubicación
              </button>
            </div>
          )}
        </Seccion>

        <Seccion titulo="Identificación">
          <dl>
            <Fila k="Código modular" v={ie.cod_mod} mono />
            <Fila k="Anexo" v={ie.anexo} mono />
            <Fila k="Código de local" v={ie.codlocal} mono />
            <Fila k="Código institución" v={ie.codinst} mono />
            <Fila k="Modalidad" v={ie.modalidad} />
            <Fila k="Nivel / ciclo" v={ie.subnivel} />
            <Fila k="Nivel detallado" v={ie.nivel} />
            <Fila k="Forma" v={ie.forma} />
            {ie.tipo_programa && <Fila k="Tipo de programa" v={ie.tipo_programa} />}
            <Fila k="Alumnado (sexo)" v={ie.sexo} />
            <Fila k="Gestión" v={ie.gestion} />
            <Fila k="Dependencia" v={ie.dependencia} />
            {ie.ruc && <Fila k="RUC" v={ie.ruc} mono />}
            {ie.razon_social && <Fila k="Razón social" v={ie.razon_social} />}
            {ie.promotor && <Fila k="Promotor" v={ie.promotor} />}
            <Fila k="Estado" v={ie.estado} />
            <Fila k="Fecha de creación" v={fechaPE(ie.fecha_registro)} />
            <Fila k="Actualizado" v={fechaPE(ie.fecha_actualizacion)} />
            {ie.vraem && <Fila k="VRAEM" v="Sí" />}
            {ie.zona_frontera && <Fila k="Zona de frontera" v="Sí" />}
          </dl>
        </Seccion>

        {ie.codlocal && (
          <Seccion titulo={`Local escolar ${ie.codlocal}: servicios que funcionan en el mismo local`}>
            {local === null ? (
              <p className="text-sm text-slate-500">Cargando…</p>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Kpi label="Alumnos del local" valor={num(sumaLocal())} color="#1d4ed8" />
                  <Kpi label="Turno día" valor={num(sumaLocal('DIURNO'))} color={TURNO_COLOR.DIURNO} />
                  <Kpi label="Turno noche" valor={num(sumaLocal('NOCTURNO'))} color={TURNO_COLOR.NOCTURNO} />
                  <Kpi label="Día y noche" valor={num(sumaLocal('MIXTO'))} color={TURNO_COLOR.MIXTO} />
                </div>
                {/* Alumnado del local por cada turno */}
                <table className="mb-3 w-full text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-1 font-medium">Turno</th>
                      <th className="py-1 text-right font-medium">Servicios</th>
                      <th className="py-1 text-right font-medium">Alumnos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porTurnoLocal.map(([t, v]) => (
                      <tr key={t} className="border-t border-slate-100">
                        <td className="py-1">{t}</td>
                        <td className="py-1 text-right tabular-nums">{v.servicios}</td>
                        <td className="py-1 text-right font-semibold tabular-nums">{num(v.alumnos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="-mx-1 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="px-1 py-1 font-medium">Servicio</th>
                        <th className="px-1 py-1 font-medium">Turno</th>
                        <th className="px-1 py-1 text-right font-medium">Alumnos</th>
                        <th className="px-1 py-1 text-right font-medium">Docentes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {local.map((s) => (
                        <tr
                          key={s.id}
                          className={`border-t border-slate-100 ${s.id === ie.id ? 'bg-blue-50' : ''} ${
                            s.estado !== 'Activo' ? 'text-slate-400' : ''
                          }`}
                        >
                          <td className="px-1 py-1.5">
                            <button
                              className="text-left hover:underline"
                              onClick={() => s.id !== ie.id && onAbrir(s.id)}
                            >
                              <span className="font-medium">{s.nivel}</span>
                              <span className="block text-xs text-slate-500">
                                {s.cod_mod}
                                {s.anexo !== '0' ? `-${s.anexo}` : ''} · {s.nombre}
                                {s.estado !== 'Activo' ? ' · Inactivo' : ''}
                              </span>
                            </button>
                          </td>
                          <td className="px-1 py-1.5">{s.turno ?? '—'}</td>
                          <td className="px-1 py-1.5 text-right tabular-nums">{num(s.talum)}</td>
                          <td className="px-1 py-1.5 text-right tabular-nums">{num(s.tdoc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Seccion>
        )}

        <p className="px-1 pb-4 text-[11px] leading-snug text-slate-500">
          Fuente: ESCALE – Ministerio de Educación del Perú. Padrón de servicios educativos (corte{' '}
          {fechaPE(ie.fecha_actualizacion)}) y Censo Educativo 2025 (alumnos, docentes y secciones). El director y el
          teléfono son los registrados en el padrón oficial; confírmelos con la UGEL si necesita datos más recientes.
        </p>
      </div>
    </div>
  );
}
