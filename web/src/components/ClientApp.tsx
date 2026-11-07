'use client';

import dynamic from 'next/dynamic';

// La app usa sesión, URL, localStorage y Leaflet: se renderiza solo en el navegador.
const Sesion = dynamic(() => import('./Sesion'), {
  ssr: false,
  loading: () => (
    <div className="grid h-dvh place-items-center bg-[#C8102E] text-sm text-white">Cargando…</div>
  ),
});

export default function ClientApp() {
  return <Sesion />;
}
