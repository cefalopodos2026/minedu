import type { Session } from '@supabase/supabase-js';
import { sb } from './supabase';

export type Rol = 'maestro' | 'consulta';
export interface Usuario {
  usuario: string;
  rol: Rol | null;
}

/** El usuario escribe un nombre ("donet"); Supabase Auth trabaja con correo: se usa un dominio interno fijo */
export const correoDe = (usuario: string) => `${usuario.trim().toLowerCase()}@usuarios.donet.local`;

export function usuarioDe(s: Session | null): Usuario | null {
  if (!s) return null;
  const rol = s.user.app_metadata?.rol;
  return {
    usuario: (s.user.user_metadata?.usuario as string) ?? s.user.email?.split('@')[0] ?? '',
    rol: rol === 'maestro' || rol === 'consulta' ? rol : null,
  };
}

export async function iniciarSesion(usuario: string, clave: string): Promise<void> {
  const { error } = await sb().auth.signInWithPassword({ email: correoDe(usuario), password: clave });
  if (error) {
    throw new Error(
      /invalid/i.test(error.message)
        ? 'Usuario o contraseña incorrectos.'
        : 'No se pudo iniciar sesión. Verifique su conexión e intente nuevamente.',
    );
  }
}

export async function cerrarSesion(): Promise<void> {
  await sb().auth.signOut();
}

export const ROL_LABEL: Record<Rol, string> = { maestro: 'Usuario maestro', consulta: 'Consulta' };
