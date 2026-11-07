// Servidor de PRUEBA local que imita la API REST de Supabase usando PGlite (Postgres embebido).
// Sirve para validar supabase/schema.sql y la app sin una cuenta de Supabase.
// Uso: node dev-mock.mjs   (escucha en http://localhost:54321)
// En web/.env.local: NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321  NEXT_PUBLIC_SUPABASE_ANON_KEY=dev
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, '.pglite');
const nueva = !fs.existsSync(dataDir);
const db = new PGlite(dataDir, { extensions: { pg_trgm } });

if (nueva) {
  console.log('Creando base local y cargando datos (una sola vez)...');
  await db.exec(`do $$ begin
    if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  end $$;`);
  await db.exec(fs.readFileSync(path.join(here, '../supabase/schema.sql'), 'utf8'));
  for (const t of ['ubigeo', 'iiee']) {
    const csv = fs.readFileSync(path.join(here, `../data/out/${t}.csv`));
    const header = csv.subarray(0, csv.indexOf(10)).toString();
    const t0 = Date.now();
    await db.query(`copy public.${t} (${header}) from '/dev/blob' with (format csv, header true)`, [], {
      blob: new Blob([csv]),
    });
    console.log(`  ${t}: cargado en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  await db.exec('analyze;');
}
const { rows } = await db.query('select count(*)::int n from iiee');
console.log('iiee:', rows[0].n, 'filas');

const JSON_FN = new Set(['resumen_iiee', 'puntos_iiee']);
const SETOF_FN = new Set(['buscar_iiee']);

function send(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(body));
}

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, null);
    const url = new URL(req.url, 'http://x');
    const t0 = Date.now();
    try {
      const m = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
      if (m && req.method === 'POST') {
        const fn = m[1];
        let raw = '';
        for await (const c of req) raw += c;
        const params = JSON.parse(raw || '{}');
        const keys = Object.keys(params).filter((k) => /^p_\w+$/.test(k));
        const args = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
        const vals = keys.map((k) => params[k]);
        if (JSON_FN.has(fn)) {
          const r = await db.query(`select public.${fn}(${args}) as r`, vals);
          send(res, 200, r.rows[0].r);
        } else if (SETOF_FN.has(fn)) {
          const r = await db.query(`select * from public.${fn}(${args})`, vals);
          send(res, 200, r.rows);
        } else send(res, 404, { message: 'función desconocida' });
        console.log(`rpc ${fn} ${Date.now() - t0}ms`);
        return;
      }
      const t = url.pathname.match(/^\/rest\/v1\/(iiee|ubigeo)$/);
      if (t && req.method === 'GET') {
        const where = [];
        const vals = [];
        for (const [k, v] of url.searchParams) {
          if (['select', 'order', 'limit', 'offset'].includes(k) || !/^\w+$/.test(k)) continue;
          if (v.startsWith('eq.')) {
            vals.push(v.slice(3));
            where.push(`${k} = $${vals.length}`);
          }
        }
        const order = (url.searchParams.get('order') || '')
          .split(',')
          .filter(Boolean)
          .map((o) => {
            const [c, dir] = o.split('.');
            return /^\w+$/.test(c) ? `${c} ${dir === 'desc' ? 'desc' : 'asc'}` : null;
          })
          .filter(Boolean);
        const limit = Number(url.searchParams.get('limit')) || 1000;
        const sql = `select * from public.${t[1]} ${where.length ? 'where ' + where.join(' and ') : ''} ${
          order.length ? 'order by ' + order.join(', ') : ''
        } limit ${Math.min(limit, 1000)}`;
        const r = await db.query(sql, vals);
        if ((req.headers.accept || '').includes('vnd.pgrst.object')) {
          if (r.rows.length === 1) return send(res, 200, r.rows[0]);
          return send(res, 406, { code: 'PGRST116', message: 'no rows', details: 'The result contains 0 rows' });
        }
        send(res, 200, r.rows);
        console.log(`get ${t[1]} ${Date.now() - t0}ms`);
        return;
      }
      send(res, 404, { message: 'no encontrado' });
    } catch (e) {
      console.error(e);
      send(res, 400, { message: e.message });
    }
  })
  .listen(54321, () => console.log('Mock Supabase en http://localhost:54321'));
