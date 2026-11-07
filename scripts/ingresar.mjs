// Ayudante de pruebas: inicia sesión en la app si aparece la pantalla de inicio.
// Las credenciales se leen de ../.env (nunca se escriben en el código).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  fs.readFileSync(path.join(here, '../.env'), 'utf8').split(/\r?\n/).filter((l) => /^APP_[A-Z_]+=/.test(l))
    .map((l) => l.split('=')),
);

export const CREDENCIALES = {
  maestro: [env.APP_USUARIO_MAESTRO, env.APP_CLAVE_MAESTRO],
  consulta: [env.APP_USUARIO_CONSULTA, env.APP_CLAVE_CONSULTA],
};

/** Si la página muestra el inicio de sesión, ingresa con el rol indicado y espera a la aplicación */
export async function ingresar(page, rol = 'consulta') {
  await page.waitForSelector('#usuario, aside', { timeout: 60000 });
  if (!(await page.$('#usuario'))) return; // ya hay sesión
  const [u, c] = CREDENCIALES[rol];
  await page.type('#usuario', u);
  await page.type('#clave', c);
  await page.click('button[type=submit]');
  await page.waitForSelector('aside', { timeout: 60000 });
  await page.waitForNetworkIdle({ idleTime: 800, timeout: 60000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
}
