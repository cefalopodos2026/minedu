'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configurado, sb } from '@/lib/supabase';
import { cerrarSesion, usuarioDe } from '@/lib/auth';
import App from './App';
import Login from './Login';

/** Muestra el inicio de sesión hasta que haya una sesión válida; luego la aplicación */
export default function Sesion() {
  // undefined = verificando sesión guardada; null = sin sesión
  const [sesion, setSesion] = useState<Session | null | undefined>(configurado ? undefined : null);

  useEffect(() => {
    if (!configurado) return;
    // INITIAL_SESSION llega de inmediato con la sesión guardada (o null); luego, cada inicio o cierre de sesión
    const { data } = sb().auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configurado) return <App usuario={null} onSalir={() => {}} />; // muestra el aviso de configuración
  if (sesion === undefined) {
    return <div className="grid h-dvh place-items-center border-t-[6px] border-[#C1121F] bg-[#F2F3F5] text-sm text-slate-600">Verificando sesión…</div>;
  }
  if (!sesion) return <Login />;
  return <App usuario={usuarioDe(sesion)} onSalir={cerrarSesion} />;
}
