const fs = require('fs');
const path = require('path');
const XLSX = require(path.resolve(__dirname, '../../node_modules/xlsx'));

const fApeu = process.argv[2];
const outPath = process.argv[3];
const wb = XLSX.readFile(fApeu);
const sheetRows = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null });

// 1. Categorias
const categorias = {};
sheetRows('BD CATEGORIA ITEM').slice(1).forEach((r) => {
  if (r[0] && r[1]) categorias[String(r[0]).trim()] = String(r[1]).trim();
});

// 2. Materiales y Equipos
const materiales = [];
sheetRows('MATERIALES').slice(1).forEach((r) => {
  const tipoRaw = String(r[0] || '').trim().toUpperCase();
  const cat = String(r[1] || '').trim().toUpperCase();
  const id = String(r[2] || '').trim();
  const desc = String(r[3] || r[4] || '').trim();
  const und = String(r[5] || '').trim();
  const pBase = Number(r[8]) || Number(r[10]) || 0;
  if (!desc || tipoRaw === 'GLOBALES') return;
  materiales.push({
    fuente: 'APEU',
    tipo_origen: tipoRaw === 'MAQUINARIA Y EQUIPOS' ? 'EQUIPO' : 'MATERIAL',
    categoria: cat,
    codigo_origen: id,
    descripcion: desc,
    unidad: und,
    precio_historico: pBase,
  });
});

// 3. BD UNIT MANO DE OBRA (rendimientos reales por actividad en APEU)
const bdUnitMo = {};
sheetRows('BD UNIT MANO DE OBRA').slice(1).forEach((r) => {
  const idMo = String(r[2] || '').trim();
  const baseCrew = String(r[3] || '').trim();
  const un = String(r[4] || '').trim();
  const rend = Number(r[5]) || 0;
  const vlrBase = Number(r[6]) || 0;
  const costoTotal = Number(r[7]) || 0;
  if (!idMo || !rend) return;
  if (!bdUnitMo[idMo]) {
    bdUnitMo[idMo] = {
      id_mo: idMo,
      cuadrilla_base: baseCrew,
      unidad: un,
      rendimiento_horas: rend,
      valor_base_historico: vlrBase,
      costo_total_historico: costoTotal,
      integrantes_extra: [],
    };
  } else {
    bdUnitMo[idMo].integrantes_extra.push({ rol: baseCrew, rendimiento: rend });
  }
});

// 4. BD ITEM UNITARIO metadata
const itemMeta = {};
sheetRows('BD ITEM UNITARIO').slice(1).forEach((r) => {
  if (r[1]) {
    itemMeta[String(r[1]).trim()] = {
      id_categoria: String(r[0] || '').trim(),
      categoria_nombre: categorias[String(r[0] || '').trim()] || String(r[0] || '').trim(),
      id_item: String(r[1]).trim(),
      descripcion: String(r[2] || r[1]).trim(),
      unidad: String(r[3] || 'UND').trim(),
    };
  }
});

// 4. UNITARIOS (headers + component lines)
const uRows = sheetRows('UNITARIOS');
const unitariosMap = new Map();

for (let i = 1; i < uRows.length; i++) {
  const r = uRows[i];
  if (!r || !r.some((v) => v !== null && String(v).trim() !== '')) continue;
  const c0 = String(r[0] || '').trim();
  const c1 = String(r[1] || '').trim();
  const c2 = String(r[2] || '').trim();
  const c3 = String(r[3] || '').trim();
  const c4 = String(r[4] || '').trim();
  const c5 = String(r[5] || '').trim();
  const cant = Number(r[6]) || 0;
  const vlrUnit = Number(r[7]) || 0;
  const vlrTotal = Number(r[8]) || 0;

  if (!c1 && !c2 && c0 && c5) {
    if (!unitariosMap.has(c0)) {
      const meta = itemMeta[c0] || {};
      unitariosMap.set(c0, {
        fuente: 'APEU',
        codigo_origen: c0,
        descripcion: meta.descripcion || c0,
        id_categoria: meta.id_categoria || '',
        categoria: meta.categoria_nombre || '',
        unidad: meta.unidad || c5,
        directo_historico: vlrTotal,
        lineas: [],
      });
    }
    continue;
  }

  if (c3) {
    if (!unitariosMap.has(c3)) {
      const meta = itemMeta[c3] || {};
      unitariosMap.set(c3, {
        fuente: 'APEU',
        codigo_origen: c3,
        descripcion: meta.descripcion || c3,
        id_categoria: meta.id_categoria || c1,
        categoria: meta.categoria_nombre || c2,
        unidad: meta.unidad || 'UND',
        directo_historico: 0,
        lineas: [],
      });
    }
    const parent = unitariosMap.get(c3);
    if (!parent.id_categoria && c1) parent.id_categoria = c1;
    if (!parent.categoria && c2) parent.categoria = categorias[c1] || c2;

    const idCompuesto = String(r[15] || '').trim() || null;
    const idMaterial = String(r[16] || '').trim() || null;
    const idEquipo = String(r[17] || '').trim() || null;
    const idMO = String(r[18] || '').trim() || null;
    const idHM = String(r[19] || '').trim() || null;
    const idDesp = String(r[20] || '').trim() || null;

    let tipoLinea = 'MATERIAL';
    if (idDesp || /^desperdicio/i.test(c4) || /^desperdicio/i.test(c0)) tipoLinea = 'DESPERDICIO';
    else if (idHM || /herramienta menor/i.test(c4) || /herramienta menor/i.test(c0)) tipoLinea = 'HERRAMIENTA_MENOR';
    else if (idMO || /^m de o/i.test(c4) || /^m de o/i.test(c0)) tipoLinea = 'MANO_OBRA';
    else if (idCompuesto) tipoLinea = 'SUB_APU';
    else if (idEquipo) tipoLinea = 'EQUIPO';

    parent.lineas.push({
      tipo_linea: tipoLinea,
      nombre_componente: c4 || c0,
      descripcion_fila: c0,
      unidad: c5,
      cantidad: cant,
      precio_historico: vlrUnit,
      parcial_historico: vlrTotal,
      ref_compuesto: idCompuesto,
      ref_material: idMaterial,
      ref_equipo: idEquipo,
      ref_mo: idMO,
    });
  }
}

fs.writeFileSync(outPath, JSON.stringify({
  categorias,
  bd_unit_mo: bdUnitMo,
  materiales,
  unitarios: [...unitariosMap.values()],
}, null, 1), 'utf8');
