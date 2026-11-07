'use client';

import dynamic from 'next/dynamic';

// La app usa URL, localStorage y Leaflet: se renderiza solo en el navegador.
const App = dynamic(() => import('./App'), {
  ssr: false,
  loading: () => (
    <div className="grid h-dvh place-items-center bg-slate-100 text-sm text-slate-500">Cargando directorio…</div>
  ),
});

export default function ClientApp() {
  return <App />;
}
