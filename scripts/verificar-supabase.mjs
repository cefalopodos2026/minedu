// Verifica la base publicada en Supabase con la clave pública (anon), igual que el navegador:
//  1) SIN sesión no se puede leer nada;  2) con el usuario de CONSULTA se lee todo pero no se puede escribir.
// Uso: node verificar-supabase.mjs <archivo .env con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY>
// (las credenciales del usuario de consulta se leen de ../.env)
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { CREDENCIALES } from './ingresar.mjs';

const env = Object.fromEntries(
  fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }),
);
const nuevo = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'OK   ' : 'FALLA'} ${msg}`); if (!cond) fallos++; };
const t = async (fn) => { const t0 = Date.now(); const r = await fn(); return [r, Date.now() - t0]; };

// 1) Sin sesión: todo bloqueado
const anon = nuevo();
const a1 = await anon.rpc('resumen_iiee', { p_estado: 'Activo' });
ok(!!a1.error, `sin sesión: resumen bloqueado (${a1.error?.code ?? 'devolvió datos!'})`);
const a2 = await anon.rpc('buscar_iiee', { p_q: 'SAN JOSE', p_limit: 1 });
ok(!!a2.error || (a2.data ?? []).length === 0, `sin sesión: búsqueda bloqueada (${a2.error?.code ?? 'sin filas'})`);
const a3 = await anon.from('iiee').select('id').limit(1);
ok(!!a3.error || (a3.data ?? []).length === 0, `sin sesión: lectura directa de la tabla bloqueada (${a3.error?.code ?? 'sin filas'})`);

// 2) Con sesión del usuario de consulta
const sb = nuevo();
const ses = await sb.auth.signInWithPassword({
  email: `${CREDENCIALES.consulta[0]}@usuarios.donet.local`,
  password: CREDENCIALES.consulta[1],
});
ok(!ses.error, `inicio de sesión del usuario de consulta (${ses.error?.message ?? 'rol ' + ses.data.user?.app_metadata?.rol})`);

// Lectura
const [res, ms1] = await t(() => sb.rpc('resumen_iiee', { p_estado: 'Activo' }));
ok(!res.error && res.data.total === 115428, `resumen nacional activos: ${res.data?.total} servicios, ${res.data?.alumnos} alumnos, nocturno ${res.data?.alumnos_nocturno} (${ms1} ms)`);
const [bus, ms2] = await t(() => sb.rpc('buscar_iiee', { p_prov: '1501', p_q: 'SAN JOSE', p_estado: 'Activo', p_limit: 3 }));
ok(!bus.error && bus.data.length === 3, `buscar "san jose" en Lima: ${bus.data?.map((r) => r.nombre).join(' | ')} (${ms2} ms)`);
const [cod] = await t(() => sb.rpc('buscar_iiee', { p_q: '1507458' }));
ok(cod.data?.[0]?.telefono_fijo === '01-2701416' && cod.data?.[0]?.celular === '942 787 334',
  `código 1507458 -> fijo ${cod.data?.[0]?.telefono_fijo}, celular ${cod.data?.[0]?.celular}`);
const [pts, ms3] = await t(() => sb.rpc('puntos_iiee', { p_dist: '150132', p_estado: 'Activo' }));
ok(!pts.error && pts.data.length > 1000, `puntos del mapa en SJL: ${pts.data?.length} (${ms3} ms)`);
const [uno] = await t(() => sb.from('iiee').select('id,nombre,director').eq('id', '0415638-0').maybeSingle());
ok(uno.data?.id === '0415638-0', `lectura directa por id: ${uno.data?.nombre} / ${uno.data?.director}`);

// Modalidades, código de local y alumnado por turno
const [sup] = await t(() => sb.rpc('buscar_iiee', { p_dpto: '04', p_modalidad: 'Educación Superior', p_subnivel: 'Tecnológica', p_estado: 'Activo', p_limit: 2 }));
ok(!sup.error && sup.data.length === 2 && sup.data.every((r) => r.subnivel === 'Tecnológica' && r.codlocal),
  `filtro Superior Tecnológica (Arequipa): ${sup.data?.map((r) => `${r.nombre} [local ${r.codlocal}]`).join(' | ')}`);
const [lima] = await t(() => sb.rpc('resumen_iiee', { p_prov: '1501', p_estado: 'Activo' }));
const turnos = Object.entries(lima.data?.por_turno ?? {});
ok(turnos.length >= 5 && turnos.reduce((a, [, v]) => a + v.alumnos, 0) === lima.data.alumnos,
  `alumnado por turno en Lima suma el total (${turnos.map(([k, v]) => `${k}: ${v.alumnos}`).join(', ')})`);
ok((lima.data?.por_modalidad ?? []).some((m) => m.modalidad === 'Educación Básica Regular' && m.subnivel === 'Secundaria'),
  `por modalidad: ${(lima.data?.por_modalidad ?? []).length} combinaciones modalidad/nivel`);

// Escritura: debe estar PROHIBIDA para la clave pública
const ins = await sb.from('iiee').insert({ id: 'X-0', cod_mod: 'X', anexo: '0', nombre: 'PRUEBA', nombre_norm: 'PRUEBA' });
ok(!!ins.error, `insertar con clave pública bloqueado (${ins.error?.code ?? 'sin error!'})`);
const upd = await sb.from('iiee').update({ nombre: 'HACKEADO' }).eq('id', '0415638-0').select();
ok(!!upd.error || (upd.data ?? []).length === 0, `modificar con clave pública bloqueado (${upd.error?.code ?? 'sin filas afectadas'})`);
const del = await sb.from('iiee').delete().eq('id', '0415638-0').select();
ok(!!del.error || (del.data ?? []).length === 0, `borrar con clave pública bloqueado (${del.error?.code ?? 'sin filas afectadas'})`);
const [check] = await t(() => sb.from('iiee').select('nombre').eq('id', '0415638-0').single());
ok(check.data?.nombre === '122', `el registro sigue intacto: "${check.data?.nombre}"`);

console.log(fallos ? `\n${fallos} verificación(es) fallaron` : '\nTodas las verificaciones pasaron');
process.exit(fallos ? 1 : 0);
