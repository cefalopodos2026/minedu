// Prueba del inicio de sesión: clave incorrecta, ingreso con cada rol, sesión persistente y salida.
// Uso: node prueba-login.mjs <url_base> <carpeta_capturas>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { CREDENCIALES } from './ingresar.mjs';

const base = process.argv[2] || 'http://localhost:3000';
const out = process.argv[3] || '.';
fs.mkdirSync(out, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const errores = [];
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallos++; };

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const p = await browser.newPage();
p.on('pageerror', (e) => errores.push('pageerror ' + e.message));
p.on('console', (m) => m.type() === 'error' && !/400|invalid/i.test(m.text()) && errores.push(m.text()));
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const escribir = async (u, c) => {
  // borrar como un usuario real (asignar e.value no actualiza el estado de React)
  // (el triple clic no selecciona todo en modo táctil: se usa Ctrl+A)
  for (const sel of ['#usuario', '#clave']) {
    await p.focus(sel);
    await p.keyboard.down('Control');
    await p.keyboard.press('KeyA');
    await p.keyboard.up('Control');
    await p.keyboard.press('Backspace');
  }
  await p.type('#usuario', u);
  await p.type('#clave', c);
  await p.click('button[type=submit]');
};

// 1) Pantalla de inicio
await p.goto(base, { waitUntil: 'networkidle0', timeout: 120000 });
await p.waitForSelector('#usuario');
await p.screenshot({ path: path.join(out, 'l1_login_movil.png') });
ok(await p.evaluate(() => document.body.innerText.includes('APLICACIONES DONET') && document.body.innerText.includes('MINEDU')),
  'la pantalla muestra MINEDU y APLICACIONES DONET');

// 2) Clave incorrecta
await escribir(CREDENCIALES.consulta[0], 'clave-incorrecta');
await p.waitForSelector('[role=alert]', { timeout: 30000 });
const msg = await p.$eval('[role=alert]', (e) => e.textContent);
ok(/incorrect/i.test(msg) && !(await p.$('aside')), `clave incorrecta rechazada: "${msg}"`);
await p.screenshot({ path: path.join(out, 'l2_login_error.png') });

// 3) Usuario de consulta
await escribir(...CREDENCIALES.consulta);
await p.waitForSelector('aside', { timeout: 60000 });
await espera(2500);
await p.setViewport({ width: 1440, height: 900 });
await espera(1500);
const cab1 = await p.$eval('header', (e) => e.innerText);
ok(cab1.includes(CREDENCIALES.consulta[0]) && cab1.includes('Consulta'), `ingreso consulta, cabecera: "${cab1.replace(/\n/g, ' | ')}"`);
const hayDatos = await p.evaluate(() => document.querySelectorAll('aside li').length);
ok(hayDatos > 0, `con sesión hay datos (${hayDatos} colegios listados)`);
await p.screenshot({ path: path.join(out, 'l3_app_consulta.png') });

// 4) La sesión se mantiene al recargar
await p.reload({ waitUntil: 'networkidle0' });
await p.waitForSelector('#usuario, aside', { timeout: 60000 });
ok(!!(await p.$('aside')) && !(await p.$('#usuario')), 'al recargar la página la sesión se mantiene');

// 5) Salir
await p.evaluate(() => [...document.querySelectorAll('header button')].find((b) => b.textContent === 'Salir')?.click());
await p.waitForSelector('#usuario', { timeout: 30000 });
ok(true, 'al pulsar "Salir" vuelve a la pantalla de inicio');
await p.setViewport({ width: 1440, height: 900 });
await espera(800);
await p.screenshot({ path: path.join(out, 'l4_login_escritorio.png') });

// 6) Usuario maestro
await escribir(...CREDENCIALES.maestro);
await p.waitForSelector('aside', { timeout: 60000 });
await espera(1500);
const cab2 = await p.$eval('header', (e) => e.innerText);
ok(cab2.includes(CREDENCIALES.maestro[0]) && cab2.includes('Usuario maestro'), `ingreso maestro, cabecera: "${cab2.replace(/\n/g, ' | ')}"`);

await browser.close();
console.log(errores.length ? 'ERRORES:\n' + [...new Set(errores)].join('\n') : 'Sin errores de consola');
process.exit(fallos ? 1 : 0);
