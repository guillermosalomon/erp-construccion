const fs = require('fs');
const cp = { '€':0x80,'‚':0x82,'ƒ':0x83,'„':0x84,'…':0x85,'†':0x86,'‡':0x87,'ˆ':0x88,'‰':0x89,'Š':0x8A,'‹':0x8B,'Œ':0x8C,'Ž':0x8E,'‘':0x91,'’':0x92,'“':0x93,'”':0x94,'•':0x95,'–':0x96,'—':0x97,'˜':0x98,'™':0x99,'š':0x9A,'›':0x9B,'œ':0x9C,'ž':0x9E,'Ÿ':0x9F };
const esp = Object.keys(cp).join('');
const re = new RegExp('[\\u00c2-\\u00f4][\\u0080-\\u00ff' + esp + ']{1,3}(?:[\\u0080-\\u00ff' + esp + ']|[\\u00c2-\\u00f4][\\u0080-\\u00ff' + esp + '])*', 'g');
const dec = new TextDecoder('utf-8', { fatal: true });
function reparar(s) {
  return s.replace(re, (m) => {
    const bytes = [];
    for (const ch of m) { const c = ch.codePointAt(0); if (c < 256) bytes.push(c); else if (cp[ch] !== undefined) bytes.push(cp[ch]); else return m; }
    try { return dec.decode(Uint8Array.from(bytes)); } catch { return m; }
  });
}
let total = 0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8'); let r = reparar(t);
  if (r !== t) { fs.writeFileSync(f, r); total++; }
  console.log(f, r !== t ? 'reparado' : 'sin cambios');
}
