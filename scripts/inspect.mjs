import fs from 'node:fs';
import { readHeader, records } from './dbf.mjs';
const file = process.argv[2];
const fd = fs.openSync(file, 'r');
const h = readHeader(fd);
console.log('registros', h.nRecords, 'reclen', h.recordLen, 'codepage', h.codepage);
console.log(h.fields.map(f => `${f.name}:${f.type}${f.len}`).join(' '));
let i = 0;
for (const r of records(file)) { if (i++ >= 2) break; console.log(JSON.stringify(r)); }
