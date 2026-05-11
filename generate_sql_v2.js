const fs = require('fs');
const XLSX = require('xlsx');

const workbook = XLSX.readFile('public/APU_ERP_2.xlsx');
const sheetName = workbook.SheetNames[0];
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

const apuCategories = {};

for (let i = 0; i < data.length; i++) {
  const row = data[i] || [];
  const cat = row[0];
  const apuName = row[1];
  
  // Si la columna A tiene texto en mayúsculas y la columna B tiene texto
  if (cat && typeof cat === 'string' && cat === cat.toUpperCase() && apuName && typeof apuName === 'string') {
    apuCategories[apuName.trim()] = cat.trim();
  }
}

console.log('Found', Object.keys(apuCategories).length, 'unique APUs directly mapped to Categories in Col A');

let sql = '-- Migración EXACTA para arreglar las categorías de TODOS los APUs\n';
sql += '-- Generado mapeando directamente la Columna A del Excel\n\n';

for (const [nombre, categoria] of Object.entries(apuCategories)) {
  const noSpacesNombre = nombre.replace(/\s+/g, '').replace(/'/g, "''");
  const safeCategoria = categoria.replace(/'/g, "''");
  sql += `UPDATE apu SET categoria_apu = '${safeCategoria}' WHERE REPLACE(nombre, ' ', '') = '${noSpacesNombre}';\n`;
}

fs.writeFileSync('fix-apu-categories.sql', sql);
console.log('Successfully wrote the ultimate fix-apu-categories.sql');
