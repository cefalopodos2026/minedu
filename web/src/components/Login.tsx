'use client';

import { useState } from 'react';
import { iniciarSesion } from '@/lib/auth';

/** Emblema propio de la aplicación (no es el logotipo oficial del Ministerio) */
function Emblema() {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white shadow-lg">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="#C8102E" aria-hidden>
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
      await iniciarSesion(usuario, clave); // ClientApp detecta la sesión y muestra la aplicación
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  };

  const campo =
    'w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-[16px] text-slate-900 outline-none transition focus:border-[#C8102E] focus:bg-white focus:ring-4 focus:ring-red-100';

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-[#9B0D23] via-[#C8102E] to-[#7A0A1C] px-4 py-6 text-white">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5">
        {/* Encabezado: MINEDU + aplicación */}
        <section className="rounded-3xl bg-white/10 p-5 shadow-xl ring-1 ring-white/20 backdrop-blur">
          <div className="flex items-center gap-4">
            <Emblema />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-100">Perú · Educación</p>
              <h1 className="text-3xl font-extrabold leading-none tracking-tight">MINEDU</h1>
            </div>
          </div>
          <p className="mt-4 text-lg font-semibold leading-snug">Colegios del Perú</p>
          <p className="text-sm leading-snug text-red-50">
            Directorio y mapa de instituciones educativas con datos oficiales ESCALE
          </p>
          <p className="mt-3 border-t border-white/20 pt-3 text-sm">
            <b>APLICACIONES DONET</b> <span className="text-red-100">– Soluciones Empresariales</span>
          </p>
        </section>

        {/* Formulario */}
        <form onSubmit={enviar} className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl" noValidate>
          <h2 className="mb-5 flex items-center justify-center gap-2 text-2xl font-bold text-[#C8102E]">
            <span aria-hidden>🔐</span> Iniciar Sesión
          </h2>
          <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="usuario">
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
          <label className="mb-1 mt-4 block text-sm font-semibold text-slate-700" htmlFor="clave">
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
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              {ver ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando || !usuario.trim() || !clave}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#C8102E] to-[#E4572E] py-3.5 text-base font-bold text-white shadow-lg transition hover:brightness-105 disabled:opacity-50"
          >
            {enviando ? 'Ingresando…' : 'Iniciar Sesión'}
          </button>
        </form>
      </main>

      <footer className="mx-auto mt-6 w-full max-w-md border-t border-white/20 pt-4 text-center text-xs text-red-100">
        © 2026 <b className="text-white">APLICACIONES DONET</b> – Soluciones Empresariales
        <br />
        <span className="text-red-200">Fuente de datos: ESCALE – Ministerio de Educación del Perú</span>
      </footer>
    </div>
  );
}
