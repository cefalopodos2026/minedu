import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Filtros, IIEE, Punto, Resumen } from './types';
import { normalizar } from './format';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && key);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!configurado) throw new Error('Supabase no configurado (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  if (!client) client = createClient(url!, key!, { auth: { persistSession: false } });
  return client;
}

function params(f: Filtros) {
  const n = (v: string) => (v ? v : null);
  return {
    p_dpto: n(f.dpto),
    p_prov: n(f.prov),
    p_dist: n(f.dist),
    p_ugel: n(f.ugel),
    p_q: n(normalizar(f.q)),
    p_nivel: n(f.nivel),
    p_gestion: n(f.gestion),
    p_turno: n(f.turno),
    p_estado: n(f.estado === 'TODOS' ? '' : f.estado),
    p_area: n(f.area),
  };
}

export async function buscar(f: Filtros, limit = 50, offset = 0): Promise<IIEE[]> {
  const { data, error } = await sb().rpc('buscar_iiee', { ...params(f), p_limit: limit, p_offset: offset });
  if (error) throw error;
  return data as IIEE[];
}

export async function resumen(f: Filtros): Promise<Resumen> {
  const { data, error } = await sb().rpc('resumen_iiee', params(f));
  if (error) throw error;
  return data as Resumen;
}

export async function puntos(f: Filtros, max = 8000): Promise<Punto[]> {
  const { data, error } = await sb().rpc('puntos_iiee', { ...params(f), p_max: max });
  if (error) throw error;
  return (data ?? []) as Punto[];
}

export async function porId(id: string): Promise<IIEE | null> {
  const { data, error } = await sb().from('iiee').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as IIEE | null;
}

export async function delLocal(codlocal: string): Promise<IIEE[]> {
  const { data, error } = await sb()
    .from('iiee')
    .select('*')
    .eq('codlocal', codlocal)
    .order('estado')
    .order('nivel')
    .limit(200);
  if (error) throw error;
  return data as IIEE[];
}
