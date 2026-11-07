import { records } from './dbf.mjs';
const f = process.argv[2]; const cols = process.argv.slice(3);
const c = Object.fromEntries(cols.map(k => [k, new Map()])); let n = 0;
for (const r of records(f)) { n++; for (const k of cols) c[k].set(r[k], (c[k].get(r[k]) || 0) + 1); }
console.log('total', n);
for (const k of cols) console.log(k, JSON.stringify([...c[k]].sort((a,b)=>b[1]-a[1]).slice(0,40)));
