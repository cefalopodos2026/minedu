// Crea o actualiza los usuarios del aplicativo en Supabase Auth.
// - Usuarios y contraseñas: ../.env (APP_USUARIO_MAESTRO, APP_CLAVE_MAESTRO, APP_USUARIO_CONSULTA, APP_CLAVE_CONSULTA)
// - Conexión: ../.env.supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), obtenido con `vercel env pull`
// El rol va en app_metadata: solo el servidor (clave de servicio) puede asignarlo; el usuario no puede cambiarlo.
// Uso: node crear-usuarios.mjs
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const leerEnv = (f) =>
  Object.fromEntries(
    fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }),
  );
const app = leerEnv('../.env');
const sbEnv = leerEnv('../.env.supabase');

/** Mismo dominio interno que usa la pantalla de inicio (web/src/lib/auth.ts) */
export const correoDe = (usuario) => `${usuario.trim().toLowerCase()}@usuarios.donet.local`;

const usuarios = [
  { usuario: app.APP_USUARIO_MAESTRO, clave: app.APP_CLAVE_MAESTRO, rol: 'maestro' },
  { usuario: app.APP_USUARIO_CONSULTA, clave: app.APP_CLAVE_CONSULTA, rol: 'consulta' },
];
for (const u of usuarios) if (!u.usuario || !u.clave) throw new Error(`Falta usuario o clave del rol ${u.rol} en .env`);

const admin = createClient(sbEnv.SUPABASE_URL, sbEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: lista, error: errLista } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (errLista) throw errLista;

for (const u of usuarios) {
  const email = correoDe(u.usuario);
  const datos = {
    password: u.clave,
    email_confirm: true,
    app_metadata: { rol: u.rol },
    user_metadata: { usuario: u.usuario },
  };
  const existente = lista.users.find((x) => x.email === email);
  const { error } = existente
    ? await admin.auth.admin.updateUserById(existente.id, datos)
    : await admin.auth.admin.createUser({ email, ...datos });
  if (error) throw new Error(`${u.usuario}: ${error.message}`);
  console.log(`${existente ? 'actualizado' : 'creado'}: ${u.usuario} (rol ${u.rol})`);
}
