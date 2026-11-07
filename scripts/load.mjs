// Carga de datos a Supabase.
// Modo A (recomendado): DATABASE_URL=postgresql://... node load.mjs   -> crea esquema + COPY masivo
// Modo B: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node load.mjs -> upsert por API REST
//         (en modo B ejecuta antes supabase/schema.sql en el SQL Editor de Supabase)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../data/out');
const SCHEMA = path.resolve(here, '../supabase/schema.sql');

function* parseCsv(text) {
  let i = 0, field = '', row = [], q = false;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); yield row; row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); yield row; }
}

async function viaPg(url) {
  const { default: pg } = await import('pg');
  const { from: copyFrom } = await import('pg-copy-streams');
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Creando esquema...');
  await client.query(fs.readFileSync(SCHEMA, 'utf8'));
  if (process.env.SOLO_ESQUEMA) {
    // aplica cambios de seguridad/funciones sin vaciar ni recargar los datos
    console.log('Esquema aplicado (SOLO_ESQUEMA): datos sin cambios.');
    await client.end();
    return;
  }
  for (const t of ['ubigeo', 'iiee']) {
    await client.query(`truncate public.${t}`);
    const header = fs.readFileSync(path.join(OUT, `${t}.csv`), 'utf8').split('\n', 1)[0];
    console.log(`COPY ${t}...`);
    const stream = client.query(copyFrom(`copy public.${t} (${header}) from stdin with (format csv, header true)`));
    await pipeline(fs.createReadStream(path.join(OUT, `${t}.csv`)), stream);
    const { rows } = await client.query(`select count(*)::int n from public.${t}`);
    console.log(`  ${t}: ${rows[0].n} filas`);
  }
  await client.query('analyze public.iiee; analyze public.ubigeo;');
  await client.end();
}

async function viaRest(url, key) {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const NUM = new Set(['lat', 'lon', 'talum', 'talum_hom', 'talum_muj', 'tdoc', 'tsec']);
  const BOOL = new Set(['vraem', 'zona_frontera', 'en_censo_2025']);
  for (const t of ['ubigeo', 'iiee']) {
    const it = parseCsv(fs.readFileSync(path.join(OUT, `${t}.csv`), 'utf8'));
    const cols = it.next().value;
    let batch = [], n = 0;
    const flush = async () => {
      for (let intento = 1; ; intento++) {
        const { error } = await sb.from(t).upsert(batch);
        if (!error) break;
        if (intento >= 5) throw new Error(`${t}: ${error.message}`);
        await new Promise((r) => setTimeout(r, 2000 * intento));
      }
      n += batch.length; batch = [];
      process.stdout.write(`\r  ${t}: ${n} filas`);
    };
    for (const r of it) {
      if (r.length < cols.length) continue;
      const o = {};
      cols.forEach((c, k) => {
        const v = r[k];
        o[c] = v === '' ? null : NUM.has(c) ? Number(v) : BOOL.has(c) ? v === 'true' : v;
      });
      batch.push(o);
      if (batch.length >= 1000) await flush();
    }
    if (batch.length) await flush();
    console.log();
  }
}

const { DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (DATABASE_URL) await viaPg(DATABASE_URL);
else if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) await viaRest(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
else { console.error('Defina DATABASE_URL o SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
console.log('Carga completa.');
