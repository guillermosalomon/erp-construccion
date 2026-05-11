const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'APU_ERP.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['INSUMOS'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Normalizar unidades del Excel al formato del ERP
const UNIDAD_MAP = {
  'bto': 'saco',
  'm3': 'm3',
  'lt': 'lt',
  'kg': 'kg',
  'var': 'un',
  'un': 'un',
  'ml': 'm',
  'lb': 'kg',
  'jgo': 'un',
  'gal': 'gl',
  'pliego': 'un',
  'bolsa': 'un',
  'dia': 'día',
  'hr': 'hr',
  'ton': 'un',
  '1/4 gal': 'gl',
  'caps': 'un',
  'rollo': 'rollo',
  'm2': 'm2',
};

// Normalizar tipo del Excel al formato del ERP
const TIPO_MAP = {
  'material': 'MATERIAL',
  'maquinaria y equipos': 'EQUIPO',
  'transporte': 'TRANSPORTE',
};

const insumos = [];
let skipped = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const tipo = (row[0] || '').trim();
  const categoria = (row[1] || '').trim();
  const nombre = (row[2] || '').trim();
  const unidadRaw = (row[3] || '').trim();

  // Skip empty rows or header-like rows
  if (!nombre || !tipo || nombre === 'IMPORTADOS') {
    skipped++;
    continue;
  }

  const unidadNorm = UNIDAD_MAP[unidadRaw.toLowerCase()] || 'un';
  const tipoNorm = TIPO_MAP[tipo.toLowerCase()] || 'MATERIAL';

  insumos.push({
    nombre,
    tipo: tipoNorm,
    categoria: categoria,
    unidad: unidadNorm,
    precio_unitario: 0, // Sin precio, se llenará desde el marketplace
  });
}

console.log(`Total insumos extraídos: ${insumos.length}`);
console.log(`Filas saltadas: ${skipped}`);

// Get unique categories
const categorias = [...new Set(insumos.map(i => i.categoria).filter(Boolean))];
console.log(`\nCategorías únicas (${categorias.length}):`);
categorias.forEach(c => {
  const count = insumos.filter(i => i.categoria === c).length;
  console.log(`  - ${c} (${count} insumos)`);
});

// Generate the seed JSON file
const fs = require('fs');
const outputPath = path.join(__dirname, 'public', 'seed-insumos.json');
fs.writeFileSync(outputPath, JSON.stringify({ categorias, insumos }, null, 2));
console.log(`\nArchivo generado: ${outputPath}`);
