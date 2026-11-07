// Prueba automatizada (celular): ubicación, ruta óptima, modo a pie, WhatsApp y ficha con teléfonos.
// Uso: node prueba-ruta.mjs <url_base> <carpeta_capturas>
import puppeteer from 'puppeteer-core';
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
await browser.defaultBrowserContext().overridePermissions(new URL(base).origin, ['geolocation']);
const p = await browser.newPage();
p.on('pageerror', (e) => errores.push('pageerror ' + e.message));
p.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.setGeolocation({ latitude: -11.9965, longitude: -77.0055 }); // San Juan de Lurigancho
// capturar los enlaces que se abren (WhatsApp) sin salir de la página
await p.evaluateOnNewDocument(() => {
  window.__abiertos = [];
  window.open = (u) => {
    window.__abiertos.push(u);
    return null;
  };
});
await p.goto(`${base}/?dpto=15&prov=1501&dist=150132&q=jesus`, { waitUntil: 'networkidle0', timeout: 120000 });
await espera(2000);

// 1) marcar 3 colegios y pedir la ruta desde la barra inferior
const cajas = await p.$$('aside li input[type=checkbox]');
for (const c of cajas.slice(0, 3)) await c.tap();
const nav = await p.$$('nav button');
await nav[2].tap(); // Ruta
await p.waitForFunction(() => document.body.innerText.includes('Ruta óptima a'), { timeout: 60000 });
await espera(2500);
await p.screenshot({ path: path.join(out, 'r1_ruta_auto.png') });
// resumen del panel de ruta (botón con aria-expanded que contiene "Ruta óptima a")
const leerRuta = () =>
  p.evaluate(() => [...document.querySelectorAll('[aria-expanded]')].find((e) => e.textContent.includes('Ruta óptima a'))?.textContent);
const resumenAuto = await leerRuta();

// 2) cambiar a "A pie"
await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('A pie'))?.click());
// esperar la respuesta real del servicio de rutas (puede tardar ~10 s)
await p.waitForFunction(
  () => !document.body.innerText.includes('Calculando') && document.body.innerText.includes('Ruta óptima a'),
  { timeout: 60000 },
);
await espera(1500);
await p.screenshot({ path: path.join(out, 'r2_ruta_pie.png') });
const resumenPie = await leerRuta();

// 3) compartir la ruta por WhatsApp
await p.evaluate(() =>
  [...document.querySelectorAll('button')].find((b) => b.textContent === 'WhatsApp' && b.offsetParent !== null)?.click(),
);
const wa = await p.evaluate(() => window.__abiertos.at(-1));

// 4) enlace de navegación de Google Maps
const navegar = await p.evaluate(() => [...document.querySelectorAll('a')].find((a) => a.textContent === 'Navegar')?.href);

// 5) abrir la ficha de la primera parada (desde el panel de ruta)
await (await p.$('ol li button')).tap();
await espera(2500);
await p.screenshot({ path: path.join(out, 'r3_ficha.png') });

// 6) ficha de un colegio con fijo y celular (SAN JOSE DE BETANCOURT, 1507458)
await p.goto(`${base}/?ie=1507458-0`, { waitUntil: 'networkidle0' });
await espera(2500);
await p.screenshot({ path: path.join(out, 'r4_ficha_telefonos.png') });
const telefonos = await p.evaluate(() =>
  [...document.querySelectorAll('a[href^="tel:"], a[href^="https://wa.me/51"]')].map((a) => a.getAttribute('href')),
);

await browser.close();
console.log(JSON.stringify({ resumenAuto, resumenPie, navegar, telefonos }, null, 2));
console.log('WhatsApp:', decodeURIComponent((wa || '').split('text=')[1] || '(no abrió)').slice(0, 900));
console.log(errores.length ? 'ERRORES:\n' + [...new Set(errores)].join('\n') : 'Sin errores de consola');
