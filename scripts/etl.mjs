// ETL: Padrón web ESCALE (oct-2026) + Padrón Censo Educativo 2025 -> CSV para Supabase
// Uso: node scripts/etl.mjs <Padron_web.dbf> <Censo2025/Padron.dbf> <carpeta_salida>
import fs from 'node:fs';
import path from 'node:path';
import { records } from './dbf.mjs';
import { cp850 } from './cp850.mjs';

const [padronWeb, padronCenso, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/[^A-Z0-9Ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
const nn = (v) => (v === '' || v === undefined ? null : v);
// Fechas del padrón en DD-MM-AAAA; algunas vienen como MM-DD-AAAA o inválidas -> se corrigen o quedan null
const fechaValida = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return y >= 1800 && y <= 2100 && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
const fecha = (s) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s || '');
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  if (fechaValida(y, mo, d)) return `${m[3]}-${m[2]}-${m[1]}`;
  if (fechaValida(y, d, mo)) return `${m[3]}-${m[1]}-${m[2]}`;
  return null;
};
const turnoGrupo = (t) => {
  if (!t) return null;
  const noche = /Noche/i.test(t), dia = /Ma.ana|Tarde/i.test(t);
  return noche && dia ? 'MIXTO' : noche ? 'NOCTURNO' : 'DIURNO';
};

// 1) Censo 2025: alumnos/docentes/secciones por cod_mod+anexo
const censo = new Map();
for (const r of records(padronCenso)) {
  censo.set(`${r.COD_MOD}-${r.ANEXO}`, {
    talum: r.TALUM, talum_hom: r.TALUM_HOM, talum_muj: r.TALUM_MUJ,
    tdoc: r.TDOC, tsec: r.TSEC, caracteristica: nn(r.D_COD_CAR),
    grad_urbano: nn(r.GRAD_2000), vraem: r.VRAEM === '1', zona_frontera: r.ZFRONTERA === '1',
  });
}
console.log('censo 2025:', censo.size);

const COLS = ['id','cod_mod','anexo','codinst','codlocal','nombre','nombre_norm','nivel_cod','nivel','forma',
  'sexo','gestion_cod','gestion','dependencia','director','telefono','email','pagweb','direccion','localidad',
  'centro_poblado','codcp_inei','area','ubigeo','cod_dpto','cod_prov','departamento','provincia','distrito',
  'dre','codooii','ugel','lat','lon','tipo_programa','turno','turno_grupo','ruc','razon_social','promotor',
  'estado','fecha_registro','fecha_actualizacion','talum','talum_hom','talum_muj','tdoc','tsec',
  'caracteristica','grad_urbano','vraem','zona_frontera','en_censo_2025'];
const esc = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const out = fs.createWriteStream(path.join(outDir, 'iiee.csv'));
out.write(COLS.join(',') + '\n');
const ubigeo = new Map();
const seen = new Set();
let n = 0, dup = 0, conCenso = 0, conCoord = 0, conTel = 0;

for (const r of records(padronWeb, { decoder: cp850 })) {
  const id = `${r.COD_MOD}-${r.ANEXO}`;
  if (seen.has(id)) { dup++; continue; }
  seen.add(id);
  const c = censo.get(id);
  if (c) conCenso++;
  const lat = r.NLAT_IE && Math.abs(r.NLAT_IE) > 0.0001 ? r.NLAT_IE : null;
  const lon = r.NLONG_IE && Math.abs(r.NLONG_IE) > 0.0001 ? r.NLONG_IE : null;
  if (lat && lon) conCoord++;
  if (r.TELEFONO) conTel++;
  const row = {
    id, cod_mod: r.COD_MOD, anexo: r.ANEXO, codinst: nn(r.CODINST), codlocal: nn(r.CODLOCAL),
    nombre: r.CEN_EDU, nombre_norm: norm(r.CEN_EDU), nivel_cod: nn(r.NIV_MOD), nivel: nn(r.D_NIV_MOD),
    forma: nn(r.D_FORMA), sexo: nn(r.D_TIPSSEXO), gestion_cod: nn(r.GESTION), gestion: nn(r.D_GESTION),
    dependencia: nn(r.D_GES_DEP), director: nn(r.DIRECTOR), telefono: nn(r.TELEFONO), email: nn(r.EMAIL),
    pagweb: nn(r.PAGWEB), direccion: nn(r.DIR_CEN), localidad: nn(r.LOCALIDAD), centro_poblado: nn(r.CEN_POB),
    codcp_inei: nn(r.CODCP_INEI), area: nn(r.DAREACENSO), ubigeo: nn(r.CODGEO),
    cod_dpto: r.CODGEO ? r.CODGEO.slice(0, 2) : null, cod_prov: r.CODGEO ? r.CODGEO.slice(0, 4) : null,
    departamento: nn(r.D_DPTO), provincia: nn(r.D_PROV), distrito: nn(r.D_DIST), dre: nn(r.D_REGION),
    codooii: nn(r.CODOOII), ugel: nn(r.D_DREUGEL), lat, lon, tipo_programa: nn(r.D_TIPOPROG),
    turno: nn(r.D_COD_TUR), turno_grupo: turnoGrupo(r.D_COD_TUR), ruc: nn(r.NRORUC),
    razon_social: nn(r.RZSOCIAL), promotor: nn(r.PROMOTOR), estado: nn(r.D_ESTADO),
    fecha_registro: fecha(r.FECHAREG), fecha_actualizacion: fecha(r.FECHA_ACT),
    talum: c?.talum ?? null, talum_hom: c?.talum_hom ?? null, talum_muj: c?.talum_muj ?? null,
    tdoc: c?.tdoc ?? null, tsec: c?.tsec ?? null, caracteristica: c?.caracteristica ?? null,
    grad_urbano: c?.grad_urbano ?? null, vraem: c ? c.vraem : null, zona_frontera: c ? c.zona_frontera : null,
    en_censo_2025: !!c,
  };
  out.write(COLS.map((k) => esc(row[k])).join(',') + '\n');
  if (row.ubigeo && !ubigeo.has(row.ubigeo)) ubigeo.set(row.ubigeo, [row.departamento, row.provincia, row.distrito]);
  n++;
}
out.end();

const u = fs.createWriteStream(path.join(outDir, 'ubigeo.csv'));
u.write('ubigeo,cod_dpto,cod_prov,departamento,provincia,distrito\n');
for (const [k, [d, p, di]] of [...ubigeo].sort()) u.write([k, k.slice(0, 2), k.slice(0, 4), d, p, di].map(esc).join(',') + '\n');
u.end();
console.log({ filas: n, duplicados: dup, conCenso, conCoord, conTel, ubigeos: ubigeo.size });
