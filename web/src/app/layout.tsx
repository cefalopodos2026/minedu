import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Colegios del Perú – Directorio ESCALE MINEDU',
  description:
    'Ubique colegios del Perú por departamento, provincia, distrito o nombre. Código modular, director, teléfono, dirección, ubigeo, UGEL, turno, alumnado y mapa. Fuente: ESCALE – MINEDU.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#b91c1c',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
