// Prueba: filtro por modalidad/nivel, resumen por turno y modalidad, lista con códigos y dirección exacta,
// y ficha con alumnado del local por turno. Uso: node prueba-modalidades.mjs <url_base> <carpeta_capturas>
import puppeteer from 'puppeteer-core';
import { ingresar } from './ingresar.mjs';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:3000';
const out = process.argv[3] || '.';
fs.mkdirSync(out, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const errores = [];
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
async function abrir(vp, url) {
  const p = await browser.newPage();
  p.on('pageerror', (e) => errores.push('pageerror ' + e.message));
  p.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await p.setViewport(vp);
  await p.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  await ingresar(p);
  await espera(2500);
  return p;
}
const clic = (p, texto) =>
  p.evaluate((t) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(t) && b.offsetParent)?.click(), texto);

// 1) Escritorio: Superior Tecnológica en Arequipa + detalle por turno y modalidad
const sup = encodeURIComponent('Educación Superior');
let p = await abrir({ width: 1440, height: 900 }, `${base}/?dpto=04&modalidad=${sup}&subnivel=${encodeURIComponent('Tecnológica')}`);
await clic(p, 'Alumnado por turno y por modalidad');
await espera(800);
await p.screenshot({ path: path.join(out, 'm1_escritorio_superior.png') });
const lista = await p.evaluate(() =>
  [...document.querySelectorAll('aside li')].slice(0, 2).map((li) => li.innerText.replace(/\n+/g, ' | ')),
);
await p.close();

// 2) Escritorio: Lima Metropolitana (todas las modalidades) con detalle abierto
p = await abrir({ width: 1440, height: 900 }, `${base}/?dpto=15&prov=1501`);
await clic(p, 'Alumnado por turno y por modalidad');
await espera(800);
const detalle = await p.evaluate(() => [...document.querySelectorAll('aside .rounded-lg.bg-white.p-2')].map((d) => d.innerText.split('\n').length));
await p.screenshot({ path: path.join(out, 'm2_escritorio_lima_detalle.png') });
await p.close();

// 3) Celular: ficha de un local con servicios de varios turnos (EBA nocturna + EBR diurna)
const movil = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
p = await abrir(movil, `${base}/?ie=0607580-0`);
await p.screenshot({ path: path.join(out, 'm3_movil_ficha_cabecera.png') });
await p.evaluate(() => [...document.querySelectorAll('h3')].find((h) => h.textContent.startsWith('Local escolar'))?.scrollIntoView());
await espera(1200);
await p.screenshot({ path: path.join(out, 'm4_movil_ficha_local_turnos.png') });
const turnosLocal = await p.evaluate(() => {
  const h = [...document.querySelectorAll('h3')].find((x) => x.textContent.startsWith('Local escolar'));
  return [...h.parentElement.querySelectorAll('table')[0].querySelectorAll('tbody tr')].map((tr) => tr.innerText.replace(/\t/g, ' | '));
});
await p.close();

// 4) Celular: lista con filtro EBR Secundaria
p = await abrir(movil, `${base}/?dpto=08&prov=0801&modalidad=${encodeURIComponent('Educación Básica Regular')}&subnivel=Secundaria`);
await p.screenshot({ path: path.join(out, 'm5_movil_lista_secundaria.png') });
await p.close();

await browser.close();
console.log(JSON.stringify({ lista, filasDetalle: detalle, turnosLocal }, null, 2));
console.log(errores.length ? 'ERRORES:\n' + [...new Set(errores)].join('\n') : 'Sin errores de consola');
