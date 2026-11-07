'use client';

import dynamic from 'next/dynamic';

// La app usa sesión, URL, localStorage y Leaflet: se renderiza solo en el navegador.
const Sesion = dynamic(() => import('./Sesion'), {
  ssr: false,
  loading: () => (
    <div className="grid h-dvh place-items-center border-t-[6px] border-[#C1121F] bg-[#F2F3F5] text-sm text-slate-600">Cargando…</div>
  ),
});

export default function ClientApp() {
  return <Sesion />;
}
