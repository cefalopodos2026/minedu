// Lector DBF (dBase III/FoxPro) en streaming, sin dependencias.
import fs from 'node:fs';

export function readHeader(fd) {
  const h = Buffer.alloc(32);
  fs.readSync(fd, h, 0, 32, 0);
  const nRecords = h.readUInt32LE(4);
  const headerLen = h.readUInt16LE(8);
  const recordLen = h.readUInt16LE(10);
  const fb = Buffer.alloc(headerLen - 32);
  fs.readSync(fd, fb, 0, fb.length, 32);
  const fields = [];
  let offset = 1; // byte 0 = flag de borrado
  for (let p = 0; p + 32 <= fb.length && fb[p] !== 0x0d; p += 32) {
    const name = fb.toString('latin1', p, p + 11).replace(/\0.*$/, '').trim();
    const type = String.fromCharCode(fb[p + 11]);
    const len = fb[p + 16];
    const dec = fb[p + 17];
    fields.push({ name, type, len, dec, offset });
    offset += len;
  }
  return { nRecords, headerLen, recordLen, fields, codepage: h[29] };
}

export function* records(file, { decoder } = {}) {
  const fd = fs.openSync(file, 'r');
  const hdr = readHeader(fd);
  const dec = decoder || new TextDecoder('windows-1252');
  const batch = 5000;
  const buf = Buffer.alloc(hdr.recordLen * batch);
  let pos = hdr.headerLen;
  for (let i = 0; i < hdr.nRecords; i += batch) {
    const n = Math.min(batch, hdr.nRecords - i);
    fs.readSync(fd, buf, 0, n * hdr.recordLen, pos);
    pos += n * hdr.recordLen;
    for (let k = 0; k < n; k++) {
      const base = k * hdr.recordLen;
      if (buf[base] === 0x2a) continue; // borrado
      const row = {};
      for (const f of hdr.fields) {
        const raw = buf.subarray(base + f.offset, base + f.offset + f.len);
        // quitar NUL y caracteres de control que aparecen en algunos registros
        let v = dec.decode(raw).replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s{2,}/g, ' ').trim();
        if (f.type === 'N' || f.type === 'F') v = v === '' ? null : Number(v);
        else if (f.type === 'L') v = /[YyTt]/.test(v);
        row[f.name] = v;
      }
      yield row;
    }
  }
  fs.closeSync(fd);
}
