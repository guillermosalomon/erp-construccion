const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'public', 'APU_ERP_2.xlsx'));
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log(`Hoja: "${wb.SheetNames[0]}", Total filas: ${data.length}\n`);

// Print first 120 rows
for (let i = 0; i < Math.min(120, data.length); i++) {
  const row = data[i];
  const parts = [];
  for (let j = 0; j < Math.min(row.length, 8); j++) {
    const v = String(row[j]).trim();
    if (v) parts.push(`[${j}]${v}`);
  }
  if (parts.length > 0) {
    console.log(`R${i}: ${parts.join(' | ')}`);
  }
}

// Count unique APU names (headers = rows where col2 has name, col3 has unit, col4 has rendimiento, and no col0/col1)
let apuCount = 0;
const categories = new Set();
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  const c0 = String(row[0]).trim();
  const c2 = String(row[2]).trim();
  const c3 = String(row[3]).trim();
  const c4 = String(row[4]).trim();
  
  if (c0) categories.add(c0);
  
  // APU header: no col0, no col1, col2 has name, col3 has unit, col4 has rendimiento
  if (!c0 && c2 && c3 && c4) {
    apuCount++;
  }
}

console.log(`\n--- RESUMEN ---`);
console.log(`Total APUs: ${apuCount}`);
console.log(`Categorías: ${[...categories].join(', ')}`);
