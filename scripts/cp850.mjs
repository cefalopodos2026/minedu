// Decodificador CP850 (DOS Latin-1), usado por Padron_web.dbf (codepage byte = 0x02)
const HIGH = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ';
export const cp850 = {
  decode(buf) {
    let s = '';
    for (const b of buf) s += b < 128 ? String.fromCharCode(b) : HIGH[b - 128];
    return s;
  },
};
