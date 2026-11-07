'use client';

import { useState } from 'react';
import { iniciarSesion } from '@/lib/auth';

const ROJO = '#C1121F';

/** Emblema propio de la aplicación (no es el escudo ni el logotipo oficial del Estado) */
function Emblema({ claro = false }: { claro?: boolean }) {
  return (
    <div
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${claro ? 'bg-white' : 'bg-[#C1121F]'}`}
      aria-hidden
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={claro ? ROJO : '#fff'}>
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm-7 9.18v4L12 20l7-3.82v-4L12 16l-7-3.82z" />
      </svg>
    </div>
  );
}

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(usuario, clave); // Sesion detecta la sesión y muestra la aplicación
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  };

  const campo =
    'w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-[16px] text-slate-900 outline-none transition focus:border-[#C1121F] focus:ring-2 focus:ring-red-100';

  return (
    <div className="flex min-h-dvh flex-col bg-[#F2F3F5] text-slate-900">
      {/* Banda superior roja */}
      <header className="bg-[#C1121F] text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Emblema claro />
          <span className="text-lg font-bold tracking-tight">MINEDU</span>
          <span className="h-6 w-px bg-white/50" aria-hidden />
          <span className="truncate text-base font-semibold">Colegios del Perú</span>
        </div>
      </header>

      {/* Encabezado blanco: título en negro y descripción */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Colegios del Perú</h1>
          <p className="max-w-md text-sm text-slate-600 sm:text-right">
            Directorio y mapa de instituciones educativas del Perú con datos oficiales ESCALE – MINEDU
          </p>
        </div>
      </section>

      {/* Acceso */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Acceso al sistema</h2>
        <form
          onSubmit={enviar}
          noValidate
          className="mx-auto w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <Emblema />
            <div>
              <p className="text-lg font-bold leading-tight text-slate-900">Iniciar sesión</p>
              <p className="text-sm text-slate-500">Ingrese su usuario y contraseña</p>
            </div>
          </div>

          <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="usuario">
            Usuario
          </label>
          <input
            id="usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={campo}
          />

          <label className="mb-1 mt-4 block text-sm font-semibold text-slate-800" htmlFor="clave">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="clave"
              type={ver ? 'text' : 'password'}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
              required
              className={`${campo} pr-20`}
            />
            <button
              type="button"
              onClick={() => setVer((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-[#0B5CAD] hover:underline"
            >
              {ver ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando || !usuario.trim() || !clave}
            className="mt-6 w-full rounded-md bg-[#C1121F] py-3 text-base font-semibold text-white transition hover:bg-[#A10E1A] disabled:opacity-50"
          >
            {enviando ? 'Ingresando…' : 'Iniciar Sesión'}
          </button>
        </form>
      </main>

      {/* Pie */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center text-xs text-slate-500 sm:text-left">
          © 2026 <b className="font-semibold text-slate-800">APLICACIONES DONET</b> – Soluciones Empresariales
          <span className="hidden sm:inline"> · </span>
          <br className="sm:hidden" />
          Fuente de datos: ESCALE – Ministerio de Educación del Perú
        </div>
      </footer>
    </div>
  );
}
