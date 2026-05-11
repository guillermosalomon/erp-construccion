const fs = require('fs');
const apuCategories = JSON.parse(fs.readFileSync('public/apu-categories.json'));

let sql = '-- Migración para arreglar las categorías de los APUs\n';
sql += '-- Generado desde APU_ERP_2.xlsx\n\n';

for (const [nombre, categoria] of Object.entries(apuCategories)) {
  const noSpacesNombre = nombre.replace(/\s+/g, '').replace(/'/g, "''");
  const safeCategoria = categoria.replace(/'/g, "''");
  sql += `UPDATE apu SET categoria_apu = '${safeCategoria}' WHERE REPLACE(nombre, ' ', '') = '${noSpacesNombre}';\n`;
}

fs.writeFileSync('fix-apu-categories.sql', sql);
console.log('Successfully wrote fix-apu-categories.sql');
