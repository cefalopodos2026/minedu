// Capturas de prueba de la app (escritorio, tablet, celular) usando Edge instalado.
// Uso: node screenshot.mjs <url_base> <carpeta_salida>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:3000';
const out = process.argv[3] || '.';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-first-run'],
});
const errores = [];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrir(vp, url) {
  const p = await browser.newPage();
  await p.setViewport(vp);
  p.on('console', (m) => m.type() === 'error' && errores.push(`[${vp.width}] ${m.text()}`));
  p.on('pageerror', (e) => errores.push(`[${vp.width}] pageerror ${e.message}`));
  await p.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  await espera(2500);
  return p;
}

// 1) Escritorio: búsqueda en Lima > Lima > San Juan de Lurigancho
let p = await abrir({ width: 1440, height: 900 }, `${base}/?dpto=15&prov=1501&dist=150132`);
await p.screenshot({ path: path.join(out, '1_escritorio_distrito.png') });

// seleccionar 3 colegios y abrir ficha del primero
const cajas = await p.$$('aside li input[type=checkbox]');
for (const c of cajas.slice(0, 3)) await c.click();
await (await p.$('aside li button')).click();
await espera(2500);
await p.screenshot({ path: path.join(out, '2_escritorio_ficha.png') });
await p.close();

// 2) Búsqueda por nombre
p = await abrir({ width: 1440, height: 900 }, `${base}/?q=${encodeURIComponent('san jose de cluny')}`);
await p.screenshot({ path: path.join(out, '3_escritorio_nombre.png') });
await p.close();

// 3) Celular: lista, mapa, ficha
const movil = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
p = await abrir(movil, `${base}/?dpto=04&prov=0401&q=colegio`);
await p.screenshot({ path: path.join(out, '4_movil_lista.png') });
const [, btnMapa] = await p.$$('nav button');
await btnMapa.tap();
await espera(2500);
await p.screenshot({ path: path.join(out, '5_movil_mapa.png') });
await (await p.$$('nav button'))[0].tap();
await espera(500);
await (await p.$('aside li button')).tap();
await espera(2500);
await p.screenshot({ path: path.join(out, '6_movil_ficha.png') });
await p.close();

// 4) Tablet vertical
p = await abrir({ width: 820, height: 1180, isMobile: true, hasTouch: true }, `${base}/?dpto=08&prov=0801&turno=NOCTURNO`);
await p.screenshot({ path: path.join(out, '7_tablet_lista.png') });
await p.close();

await browser.close();
console.log(errores.length ? 'ERRORES:\n' + [...new Set(errores)].join('\n') : 'Sin errores de consola');
