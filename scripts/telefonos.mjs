// Normalización de teléfonos del padrón ESCALE: separa fijos y celulares.
// - Celular Perú: 9 dígitos que empiezan con 9.
// - Fijo: código de ciudad + número -> Lima/Callao "01" + 7 dígitos; provincias "0XX" + 6 dígitos.
//   Si el fijo viene sin código de ciudad, se completa según el departamento del colegio.

// Código de larga distancia por código de departamento (2 primeros dígitos del ubigeo)
const AREA = {
  '01': '041', '02': '043', '03': '083', '04': '054', '05': '066', '06': '076', '07': '01', '08': '084',
  '09': '067', '10': '062', '11': '056', '12': '064', '13': '044', '14': '074', '15': '01', '16': '065',
  '17': '082', '18': '053', '19': '063', '20': '073', '21': '051', '22': '042', '23': '052', '24': '072',
  '25': '061',
};

/** Devuelve { tipo: 'fijo'|'celular', num } normalizado, o null si no es un número válido */
export function clasificar(digitos, codDpto) {
  let d = digitos;
  if (d.length === 11 && d.startsWith('51')) d = d.slice(2); // +51 (código de país)
  if (/^9\d{8}$/.test(d)) return { tipo: 'celular', num: d };
  if (/^01\d{7}$/.test(d) || /^0[2-8]\d{7}$/.test(d)) return { tipo: 'fijo', num: d };
  const area = AREA[codDpto];
  if (area === '01' && /^[1-9]\d{6}$/.test(d)) return { tipo: 'fijo', num: '01' + d };
  if (area && area !== '01' && /^[2-9]\d{5}$/.test(d)) return { tipo: 'fijo', num: area + d };
  return null;
}

/**
 * Extrae los números de un texto libre:
 * "043-427545 - 043-421811", "427545-421811", "(01) 477-0409 / +51 987 654 321", ...
 */
function extraer(texto, codDpto) {
  if (!texto) return [];
  const res = [];
  // 1) separar por los separadores que hay ENTRE números
  for (const tramo of texto.split(/\s*[\/,;|]\s*|\s+-\s+|\s+y\s+/i)) {
    // 2) si el tramo completo (solo dígitos) es un número válido, usarlo: "(01) 477-0409" -> "014770409"
    const todo = tramo.replace(/\D/g, '');
    if (clasificar(todo, codDpto)) {
      res.push(todo);
      continue;
    }
    // 3) si no, varios números pegados con guion: "427545-421811", "043-465836-295181"
    const unido = tramo.replace(/\(?\b(0\d{1,2})\)?[\s.\-]+(?=\d{6,7}\b)/g, '$1');
    res.push(...(unido.match(/\d{6,}/g) ?? []));
  }
  return res;
}

const formato = ({ tipo, num }) =>
  tipo === 'celular'
    ? `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6)}`
    : num.startsWith('01')
      ? `01-${num.slice(2)}`
      : `${num.slice(0, 3)}-${num.slice(3)}`;

/**
 * Une los teléfonos de varias fuentes en orden de prioridad (la más reciente primero)
 * y quita duplicados. Devuelve los textos formateados de fijos y celulares.
 */
export function unirTelefonos(fuentes, codDpto) {
  const vistos = new Set();
  const fijos = [];
  const celulares = [];
  for (const texto of fuentes) {
    for (const dig of extraer(texto, codDpto)) {
      const t = clasificar(dig, codDpto);
      if (!t || vistos.has(t.num)) continue;
      vistos.add(t.num);
      (t.tipo === 'celular' ? celulares : fijos).push(formato(t));
    }
  }
  return {
    telefono_fijo: fijos.length ? fijos.join(' / ') : null,
    celular: celulares.length ? celulares.join(' / ') : null,
  };
}
