import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { AIU } from '@/lib/cotizador/config';
import { agruparPorCapitulo, calcularPresupuesto } from '@/lib/cotizador/engine';
import { costoAPU, datosCargo, bucketInsumo } from '@/lib/apu-engine';
import { crearClienteLectura, cargarDatosCatalogo } from '@/lib/server/catalogo-data';

/**
 * Exportación Excel del Cotizador (formato referente Hospital Civil Ipiales, estilo Kalarti).
 * Reglas: sin códigos (APU, insumos, ítems) y sin datos de proveedores.
 *  - Gratuito: PRESUPUESTO + AIU
 *  - Completo ($19.900): + APU, MATERIALES (precios almacén Kalarti), MANO DE OBRA, CRONOGRAMA
 */

// Paleta Kalarti
const COLOR_DARK = 'FF0F172A';
const COLOR_BLUE = 'FF1E293B';
const COLOR_ACCENT = 'FF10B981';
const COLOR_LIGHT = 'FFE2E8F0';
const COLOR_SOFT = 'FFF1F5F9';
const COLOR_BORDER = 'FFCBD5E1';
const MONEY = '"$"#,##0';
const QTY = '#,##0.00';
const QTY4 = '#,##0.0000';

const BORDER = {
  top: { style: 'thin', color: { argb: COLOR_BORDER } },
  left: { style: 'thin', color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
  right: { style: 'thin', color: { argb: COLOR_BORDER } },
};

const BUCKETS = [
  { key: 'equipo', titulo: 'EQUIPO Y HERRAMIENTA' },
  { key: 'material', titulo: 'MATERIALES' },
  { key: 'mano_obra', titulo: 'MANO DE OBRA' },
  { key: 'transporte', titulo: 'TRANSPORTE Y OTROS' },
];

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

function titulo(ws, row, text, lastCol) {
  ws.mergeCells(row, 1, row, lastCol);
  const c = ws.getCell(row, 1);
  c.value = text;
  c.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  c.fill = fill(COLOR_DARK);
  c.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 26;
}

function encabezado(ws, row, values, argb = COLOR_BLUE) {
  const r = ws.getRow(row);
  r.values = values;
  r.height = 22;
  r.eachCell((c) => {
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = fill(argb);
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = BORDER;
  });
}

function bordes(row, n) {
  for (let i = 1; i <= n; i++) row.getCell(i).border = BORDER;
}

const descripcionItem = (apu) => {
  const nombre = String(apu?.nombre || 'Ítem de obra').trim().replace(/\.+$/, '');
  return apu?.descripcion ? `${nombre}. ${String(apu.descripcion).trim()}` : nombre;
};

/** Normaliza componentes enviados por el cliente al formato de líneas del motor */
function lineasDesdeComponentes(comps = []) {
  return comps.map((c) => ({
    bucket: c.bucket || bucketInsumo(c.tipo),
    tipo: c.tipo,
    id: null,
    nombre: c.nombre,
    unidad: c.unidad,
    cantidad: Number(c.cantidad) || 0,
    precio: Number(c.precio_unitario ?? c.precio) || 0,
    parcial: Number(c.parcial) || 0,
    ...(c.subComponentes ? { sub: lineasDesdeComponentes(c.subComponentes) } : {}),
  }));
}

/** Suma por bucket de un conjunto de líneas */
function subtotalesLineas(lineas = []) {
  const r = { equipo: 0, material: 0, mano_obra: 0, transporte: 0 };
  lineas.forEach((l) => {
    if (l.sub && l.sub.length) {
      const s = subtotalesLineas(l.sub);
      Object.keys(r).forEach((k) => { r[k] += s[k] * (Number(l.cantidad) || 0); });
    } else {
      r[l.bucket in r ? l.bucket : 'material'] += Number(l.parcial) || 0;
    }
  });
  return r;
}

/**
 * Recorre las líneas (expandiendo básicos) acumulando insumos y horas de cuadrilla.
 * La herramienta menor (% de M.O.) no es insumo y no se lista en MATERIALES.
 */
function explotar(lineas, mult, insumos, horas, horasDia) {
  (lineas || []).forEach((l) => {
    const cant = (Number(l.cantidad) || 0) * mult;
    if (l.sub && l.sub.length) {
      explotar(l.sub, cant, insumos, horas, horasDia);
      return;
    }
    if (l.bucket === 'mano_obra') {
      const key = l.id || l.nombre;
      const h = horas.get(key) || { id: l.id, nombre: l.nombre, horas: 0, valor: 0 };
      h.horas += String(l.unidad).toUpperCase() === 'DIA' ? cant * horasDia : cant;
      h.valor += (Number(l.parcial) || 0) * mult;
      horas.set(key, h);
      return;
    }
    if (!l.id && l.unidad === '%') return; // herramienta menor
    const key = `${l.id || l.nombre}|${l.unidad}`;
    const it = insumos.get(key) || { bucket: l.bucket, nombre: l.nombre, unidad: l.unidad, cantidad: 0, precio: Number(l.precio) || 0 };
    it.cantidad += cant;
    insumos.set(key, it);
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      tipo = 'completo', // 'gratuito' (resumen) | 'completo' (de pago $19.900)
      proyectoNombre = 'Presupuesto de Obra Civil',
      ubicacion = 'Pasto (Nariño) - Sede Principal',
      items = [],
      catalogoMap = {},
      fechaInicio = new Date().toISOString().split('T')[0],
      duracionDias = 0,
      clienteNombre = 'Cliente Kalarti',
      cronograma = null,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No hay ítems para exportar' }, { status: 400 });
    }

    // ── Recalcular en servidor con el motor único (no confiar en precios del cliente) ──
    let datos = null;
    try {
      datos = await cargarDatosCatalogo(crearClienteLectura());
    } catch (e) {
      console.warn('Export: sin datos de servidor, se usan los del cliente:', e?.message);
    }
    const ctx = datos?.ctx || null;
    const apuById = new Map((datos?.apus || []).map((a) => [a.id, a]));

    const catalogo = {};
    items.forEach((it) => {
      const cli = catalogoMap[it.apu_id] || {};
      const srv = apuById.get(it.apu_id);
      if (ctx && srv) {
        const res = costoAPU(ctx, srv.id);
        catalogo[it.apu_id] = {
          nombre: srv.nombre,
          descripcion: srv.descripcion || '',
          unidad: srv.unidad || cli.unidad || 'UND',
          capitulo: srv.categoria_apu || cli.capitulo || 'GENERAL',
          precio_unitario: Math.round(res.total),
          lineas: res.lineas,
          cuadrilla_nombre: cli.cuadrilla_nombre,
        };
      } else {
        catalogo[it.apu_id] = {
          nombre: cli.nombre,
          descripcion: cli.descripcion || '',
          unidad: cli.unidad || 'UND',
          capitulo: cli.capitulo || cli.categoria || 'GENERAL',
          precio_unitario: Number(cli.precio_unitario) || 0,
          lineas: lineasDesdeComponentes(cli.componentes),
          cuadrilla_nombre: cli.cuadrilla_nombre,
        };
      }
    });

    const totals = calcularPresupuesto(items, catalogo);
    const grupos = agruparPorCapitulo(items, catalogo);
    const numeroPorApu = new Map();
    grupos.forEach((g) => g.items.forEach((it) => numeroPorApu.set(it.apu_id, it.numero)));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kalarti Constructores & Consultores';
    workbook.created = new Date();

    // ════════════════════════════════════════════════════════════════════════
    // HOJA: PRESUPUESTO
    // ════════════════════════════════════════════════════════════════════════
    const wsP = workbook.addWorksheet('PRESUPUESTO', { views: [{ showGridLines: false }] });
    wsP.columns = [{ width: 9 }, { width: 72 }, { width: 8 }, { width: 11 }, { width: 16 }, { width: 18 }];
    titulo(wsP, 1, 'KALARTI CONSTRUCTORES & CONSULTORES — PRESUPUESTO DE OBRA', 6);

    const cabecera = [
      ['OBJETO', String(proyectoNombre).toUpperCase()],
      ['CLIENTE', String(clienteNombre).toUpperCase()],
      ['UBICACIÓN', String(ubicacion).toUpperCase()],
      ['FECHA', fechaInicio],
    ];
    cabecera.forEach(([k, v], i) => {
      const r = 2 + i;
      wsP.getCell(r, 1).value = k;
      wsP.getCell(r, 1).font = { name: 'Arial', size: 9, bold: true };
      wsP.getCell(r, 1).fill = fill(COLOR_LIGHT);
      wsP.mergeCells(r, 2, r, 6);
      wsP.getCell(r, 2).value = v;
      wsP.getCell(r, 2).font = { name: 'Arial', size: 10, bold: i === 0 };
      wsP.getCell(r, 1).border = BORDER;
      wsP.getCell(r, 2).border = BORDER;
    });

    encabezado(wsP, 7, ['ÍTEM', 'DESCRIPCIÓN', 'UND', 'CANT.', 'VR. UNITARIO', 'VR. TOTAL'], COLOR_DARK);
    let rowIdx = 8;

    grupos.forEach((g) => {
      const capRow = wsP.getRow(rowIdx);
      capRow.values = [g.numero, String(g.capitulo).toUpperCase(), '', '', '', g.subtotal];
      capRow.height = 20;
      capRow.eachCell({ includeEmpty: true }, (c) => {
        c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = fill(COLOR_BLUE);
        c.border = BORDER;
      });
      capRow.getCell(1).alignment = { horizontal: 'center' };
      capRow.getCell(6).numFmt = MONEY;
      rowIdx++;

      g.items.forEach((it) => {
        const apu = it.apu || {};
        const r = wsP.getRow(rowIdx);
        r.values = [it.numero, descripcionItem(apu), apu.unidad || 'UND', Number(it.cantidad) || 0, Number(apu.precio_unitario) || 0, Number(it.valor) || 0];
        r.font = { name: 'Arial', size: 9 };
        r.alignment = { vertical: 'top', wrapText: true };
        r.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
        r.getCell(3).alignment = { horizontal: 'center', vertical: 'top' };
        r.getCell(4).numFmt = QTY;
        r.getCell(5).numFmt = MONEY;
        r.getCell(6).numFmt = MONEY;
        bordes(r, 6);
        rowIdx++;
      });

      const sub = wsP.getRow(rowIdx);
      sub.values = ['', `SUBTOTAL ${String(g.capitulo).toUpperCase()}`, '', '', '', g.subtotal];
      sub.font = { name: 'Arial', size: 9, bold: true };
      sub.getCell(2).alignment = { horizontal: 'right' };
      sub.getCell(6).numFmt = MONEY;
      for (let i = 1; i <= 6; i++) sub.getCell(i).fill = fill(COLOR_SOFT);
      bordes(sub, 6);
      rowIdx += 2;
    });

    const filaTotal = (label, val, { bold = false, accent = false } = {}) => {
      const r = wsP.getRow(rowIdx);
      wsP.mergeCells(rowIdx, 2, rowIdx, 5);
      r.getCell(2).value = label;
      r.getCell(6).value = val;
      r.getCell(2).alignment = { horizontal: 'right' };
      r.getCell(6).numFmt = MONEY;
      [2, 6].forEach((i) => {
        r.getCell(i).font = { name: 'Arial', size: 10, bold, color: accent ? { argb: 'FFFFFFFF' } : undefined };
        if (accent) r.getCell(i).fill = fill(COLOR_ACCENT);
        r.getCell(i).border = BORDER;
      });
      rowIdx++;
    };
    filaTotal('COSTO DIRECTO', totals.costoDirecto, { bold: true });
    filaTotal(`ADMINISTRACIÓN (${AIU.admin}%)`, totals.admin);
    filaTotal(`IMPREVISTOS (${AIU.imprev}%)`, totals.imprev);
    filaTotal(`UTILIDAD (${AIU.utilidad}%)`, totals.utilidad);
    filaTotal(`IVA SOBRE UTILIDAD (${AIU.ivaSobreUtilidad}%)`, totals.iva);
    filaTotal('VALOR TOTAL', totals.total, { bold: true, accent: true });

    // ════════════════════════════════════════════════════════════════════════
    // HOJA: AIU
    // ════════════════════════════════════════════════════════════════════════
    const wsAiu = workbook.addWorksheet('AIU', { views: [{ showGridLines: false }] });
    wsAiu.columns = [{ width: 8 }, { width: 52 }, { width: 14 }, { width: 18 }, { width: 20 }];
    titulo(wsAiu, 1, `ANÁLISIS DEL AIU — ${String(proyectoNombre).toUpperCase()}`, 5);
    encabezado(wsAiu, 3, ['ÍTEM', 'CONCEPTO', '%', 'BASE', 'VALOR']);
    const pctTotal = totals.costoDirecto > 0 ? `${((totals.total / totals.costoDirecto) * 100).toFixed(2)}%` : '—';
    const aiuItems = [
      [1, 'Costo directo de obra', '100%', totals.costoDirecto, totals.costoDirecto],
      [2, 'Administración (dirección técnica, residencia, logística)', `${AIU.admin}%`, totals.costoDirecto, totals.admin],
      [3, 'Imprevistos', `${AIU.imprev}%`, totals.costoDirecto, totals.imprev],
      [4, 'Utilidad', `${AIU.utilidad}%`, totals.costoDirecto, totals.utilidad],
      [5, 'IVA sobre utilidad', `${AIU.ivaSobreUtilidad}%`, totals.utilidad, totals.iva],
      [6, 'VALOR TOTAL CON AIU', pctTotal, totals.costoDirecto, totals.total],
    ];
    aiuItems.forEach((v, i) => {
      const r = wsAiu.getRow(4 + i);
      r.values = v;
      r.font = { name: 'Arial', size: 9, bold: i === aiuItems.length - 1 };
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(3).alignment = { horizontal: 'center' };
      r.getCell(4).numFmt = MONEY;
      r.getCell(5).numFmt = MONEY;
      if (i === aiuItems.length - 1) for (let k = 1; k <= 5; k++) r.getCell(k).fill = fill('FFD1FAE5');
      bordes(r, 5);
    });

    // ════════════════════════════════════════════════════════════════════════
    // VERSIÓN COMPLETA (de pago)
    // ════════════════════════════════════════════════════════════════════════
    if (tipo !== 'gratuito') {
      const horasDia = ctx?.horasDia || 8;
      const horasMes = ctx?.horasMes || 240;
      const smlv = ctx?.smlv || 0;

      // ── HOJA: APU ──
      const wsA = workbook.addWorksheet('APU', { views: [{ showGridLines: false }] });
      wsA.columns = [{ width: 52 }, { width: 8 }, { width: 12 }, { width: 15 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
      titulo(wsA, 1, 'ANÁLISIS DE PRECIOS UNITARIOS', 8);
      let r = 3;

      grupos.forEach((g) => g.items.forEach((it) => {
        const apu = it.apu || {};
        // Fila título: [ítem, descripción, unidad]
        const tRow = wsA.getRow(r);
        wsA.mergeCells(r, 2, r, 7);
        tRow.getCell(1).value = `ÍTEM ${it.numero}`;
        tRow.getCell(2).value = descripcionItem(apu);
        tRow.getCell(8).value = apu.unidad || 'UND';
        tRow.height = Math.min(90, 18 + Math.floor(descripcionItem(apu).length / 95) * 12);
        [1, 2, 8].forEach((i) => {
          const c = tRow.getCell(i);
          c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = fill(COLOR_BLUE);
          c.alignment = { vertical: 'middle', wrapText: true, horizontal: i === 8 ? 'center' : 'left' };
          c.border = BORDER;
        });
        r++;

        encabezado(wsA, r, ['DESCRIPCIÓN', 'UND', 'REND/CANT', 'PRECIO', 'EQUIPO', 'MATERIAL', 'M. OBRA', 'OTROS'], 'FF334155');
        r++;

        const colBucket = { equipo: 5, material: 6, mano_obra: 7, transporte: 8 };
        (apu.lineas || []).forEach((l) => {
          const lr = wsA.getRow(r);
          lr.getCell(1).value = l.nombre;
          lr.getCell(2).value = l.unidad;
          lr.getCell(3).value = Number(l.cantidad) || 0;
          lr.getCell(4).value = Math.round(Number(l.precio) || 0);
          const col = colBucket[l.bucket] || 6;
          lr.getCell(col).value = Math.round(Number(l.parcial) || 0);
          lr.font = { name: 'Arial', size: 9 };
          lr.getCell(2).alignment = { horizontal: 'center' };
          lr.getCell(3).numFmt = QTY4;
          for (let i = 4; i <= 8; i++) lr.getCell(i).numFmt = MONEY;
          bordes(lr, 8);
          r++;
        });

        const st = subtotalesLineas(apu.lineas || []);
        const cd = wsA.getRow(r);
        wsA.mergeCells(r, 1, r, 3);
        cd.getCell(1).value = 'C. DIRECTO';
        cd.getCell(4).value = Number(apu.precio_unitario) || Math.round(st.equipo + st.material + st.mano_obra + st.transporte);
        cd.getCell(5).value = Math.round(st.equipo);
        cd.getCell(6).value = Math.round(st.material);
        cd.getCell(7).value = Math.round(st.mano_obra);
        cd.getCell(8).value = Math.round(st.transporte);
        cd.getCell(1).alignment = { horizontal: 'right' };
        for (let i = 1; i <= 8; i++) {
          const c = cd.getCell(i);
          c.font = { name: 'Arial', size: 9, bold: true };
          c.fill = fill('FFD1FAE5');
          c.border = BORDER;
          if (i >= 4) c.numFmt = MONEY;
        }
        r += 3;
      }));

      // Explosión de insumos y horas de cuadrilla para todo el presupuesto
      const insumosTot = new Map();
      const horasTot = new Map();
      items.forEach((it) => {
        const apu = catalogo[it.apu_id];
        explotar(apu?.lineas, Number(it.cantidad) || 0, insumosTot, horasTot, horasDia);
      });

      // ── HOJA: MATERIALES (precios almacén Kalarti) ──
      const wsM = workbook.addWorksheet('MATERIALES', { views: [{ showGridLines: false }] });
      wsM.columns = [{ width: 56 }, { width: 9 }, { width: 14 }, { width: 20 }, { width: 20 }];
      titulo(wsM, 1, 'MATERIALES, EQUIPOS Y TRANSPORTE — PRECIOS ALMACÉN KALARTI', 5);
      wsM.mergeCells(2, 1, 2, 5);
      wsM.getCell(2, 1).value = 'Cantidades consolidadas del presupuesto. Precios almacén Kalarti.';
      wsM.getCell(2, 1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
      encabezado(wsM, 4, ['DESCRIPCIÓN', 'UND', 'CANTIDAD', 'PRECIO ALMACÉN KALARTI', 'VALOR TOTAL']);
      let m = 5;
      let granTotal = 0;
      ['material', 'equipo', 'transporte'].forEach((bk) => {
        const lista = [...insumosTot.values()].filter((x) => x.bucket === bk).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
        if (!lista.length) return;
        const gr = wsM.getRow(m);
        wsM.mergeCells(m, 1, m, 5);
        gr.getCell(1).value = BUCKETS.find((b) => b.key === bk)?.titulo || bk.toUpperCase();
        gr.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        gr.getCell(1).fill = fill(COLOR_BLUE);
        m++;
        let subtotal = 0;
        lista.forEach((x) => {
          const val = Math.round(x.cantidad * x.precio);
          subtotal += val;
          const row = wsM.getRow(m);
          row.values = [x.nombre, x.unidad, x.cantidad, Math.round(x.precio), val];
          row.font = { name: 'Arial', size: 9 };
          row.getCell(2).alignment = { horizontal: 'center' };
          row.getCell(3).numFmt = QTY;
          row.getCell(4).numFmt = MONEY;
          row.getCell(5).numFmt = MONEY;
          bordes(row, 5);
          m++;
        });
        const sr = wsM.getRow(m);
        sr.getCell(4).value = 'SUBTOTAL';
        sr.getCell(5).value = subtotal;
        sr.getCell(5).numFmt = MONEY;
        sr.font = { name: 'Arial', size: 9, bold: true };
        granTotal += subtotal;
        m += 2;
      });
      const tr = wsM.getRow(m);
      tr.getCell(4).value = 'TOTAL';
      tr.getCell(5).value = granTotal;
      tr.getCell(5).numFmt = MONEY;
      [4, 5].forEach((i) => {
        tr.getCell(i).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        tr.getCell(i).fill = fill(COLOR_ACCENT);
      });

      // ── HOJA: MANO DE OBRA ──
      const wsMO = workbook.addWorksheet('MANO DE OBRA', { views: [{ showGridLines: false }] });
      wsMO.columns = [{ width: 40 }, { width: 12 }, { width: 14 }, { width: 20 }, { width: 16 }, { width: 16 }];
      titulo(wsMO, 1, 'MANO DE OBRA — SALARIOS Y CUADRILLAS', 6);
      let w = 3;
      const cuadrillasUsadas = [...horasTot.values()];

      if (ctx && smlv > 0) {
        const diasMes = horasMes / horasDia;
        wsMO.getCell(w, 1).value = `SMLV: $${Math.round(smlv).toLocaleString('es-CO')}  ·  Jornal = mensual / ${diasMes}  ·  Valor H-H = jornal / ${horasDia}`;
        wsMO.getCell(w, 1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
        w += 2;

        // 1) Tabla de salarios de los integrantes de las cuadrillas usadas
        const integrantesIds = new Set();
        cuadrillasUsadas.forEach((cq) => {
          const ints = cq.id ? ctx.integrantes.get(cq.id) || [] : [];
          if (ints.length) ints.forEach((d) => integrantesIds.add(d.cargo_hijo_id));
          else if (cq.id) integrantesIds.add(cq.id);
        });
        wsMO.mergeCells(w, 1, w, 6);
        wsMO.getCell(w, 1).value = 'TABLA DE SALARIOS';
        wsMO.getCell(w, 1).font = { name: 'Arial', size: 10, bold: true };
        w++;
        encabezado(wsMO, w, ['CARGO', 'N.º SMLV', 'FACTOR PRESTACIONAL', 'SALARIO MENSUAL INTEGRAL', 'JORNAL', 'VALOR H-H']);
        w++;
        [...integrantesIds]
          .map((id) => ctx.cargos.get(id))
          .filter(Boolean)
          .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'))
          .forEach((cg) => {
            const n = Number(cg.factor_smlv) || 1;
            const f = Number(cg.factor_multiplicador) || 1;
            const mensual = smlv * n * f;
            const jornal = mensual / diasMes;
            const row = wsMO.getRow(w);
            row.values = [cg.nombre, n, f, Math.round(mensual), Math.round(jornal), Math.round(jornal / horasDia)];
            row.font = { name: 'Arial', size: 9 };
            row.getCell(2).numFmt = '0.00';
            row.getCell(3).numFmt = '0.00';
            [4, 5, 6].forEach((i) => { row.getCell(i).numFmt = MONEY; });
            bordes(row, 6);
            w++;
          });
        w += 2;

        // 2) Cuadrillas con integrantes y valor hora
        wsMO.mergeCells(w, 1, w, 6);
        wsMO.getCell(w, 1).value = 'CUADRILLAS';
        wsMO.getCell(w, 1).font = { name: 'Arial', size: 10, bold: true };
        w++;
        cuadrillasUsadas.filter((cq) => cq.id).forEach((cq) => {
          const padre = ctx.cargos.get(cq.id);
          const multPadre = Number(padre?.factor_multiplicador) || 1;
          const ints = ctx.integrantes.get(cq.id) || [];
          encabezado(wsMO, w, [String(padre?.nombre || cq.nombre).toUpperCase(), 'CANTIDAD', 'VALOR H-H', 'PARCIAL', '', '']);
          w++;
          ints.forEach((d) => {
            const hijo = ctx.cargos.get(d.cargo_hijo_id);
            const fEf = d.factor_smlv ? Number(d.factor_smlv) : datosCargo(ctx, d.cargo_hijo_id).factor;
            const vhh = ((smlv * fEf) / horasMes) * multPadre;
            const cant = Number(d.cantidad) || 0;
            const row = wsMO.getRow(w);
            row.values = [hijo?.nombre || 'Integrante', cant, Math.round(vhh), Math.round(vhh * cant)];
            row.font = { name: 'Arial', size: 9 };
            row.getCell(2).numFmt = '0.00';
            row.getCell(3).numFmt = MONEY;
            row.getCell(4).numFmt = MONEY;
            bordes(row, 4);
            w++;
          });
          const tot = wsMO.getRow(w);
          tot.getCell(1).value = 'VALOR HORA CUADRILLA';
          tot.getCell(4).value = Math.round(datosCargo(ctx, cq.id).precioHora);
          tot.getCell(4).numFmt = MONEY;
          tot.font = { name: 'Arial', size: 9, bold: true };
          for (let i = 1; i <= 4; i++) { tot.getCell(i).fill = fill('FFD1FAE5'); tot.getCell(i).border = BORDER; }
          w += 2;
        });
        w++;
      }

      // 3) Horas totales por cuadrilla en el presupuesto
      wsMO.mergeCells(w, 1, w, 6);
      wsMO.getCell(w, 1).value = 'HORAS DE CUADRILLA EN EL PRESUPUESTO';
      wsMO.getCell(w, 1).font = { name: 'Arial', size: 10, bold: true };
      w++;
      encabezado(wsMO, w, ['CUADRILLA', 'HORAS', 'JORNALES', 'VALOR HORA', 'VALOR TOTAL', '']);
      w++;
      let totalMO = 0;
      cuadrillasUsadas.forEach((cq) => {
        const vh = cq.horas > 0 ? cq.valor / cq.horas : 0;
        totalMO += cq.valor;
        const row = wsMO.getRow(w);
        row.values = [cq.nombre, cq.horas, cq.horas / horasDia, Math.round(vh), Math.round(cq.valor)];
        row.font = { name: 'Arial', size: 9 };
        row.getCell(2).numFmt = QTY;
        row.getCell(3).numFmt = QTY;
        row.getCell(4).numFmt = MONEY;
        row.getCell(5).numFmt = MONEY;
        bordes(row, 5);
        w++;
      });
      const tmo = wsMO.getRow(w);
      tmo.getCell(4).value = 'TOTAL';
      tmo.getCell(5).value = Math.round(totalMO);
      tmo.getCell(5).numFmt = MONEY;
      [4, 5].forEach((i) => {
        tmo.getCell(i).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        tmo.getCell(i).fill = fill(COLOR_ACCENT);
      });

      // ── HOJA: CRONOGRAMA ──
      const wsC = workbook.addWorksheet('CRONOGRAMA', { views: [{ showGridLines: false }] });
      wsC.columns = [{ width: 9 }, { width: 50 }, { width: 32 }, { width: 12 }, { width: 14 }, { width: 14 }];
      titulo(wsC, 1, `PROGRAMACIÓN DE OBRA (${duracionDias} DÍAS HÁBILES)`, 6);
      encabezado(wsC, 3, ['ÍTEM', 'ACTIVIDAD', 'CUADRILLA', 'DÍAS', 'INICIO', 'FIN']);
      let c = 4;
      const filasCrono = cronograma?.tareas?.length
        ? cronograma.tareas.map((t) => [numeroPorApu.get(t.apu_id) || '', catalogo[t.apu_id]?.nombre || t.nombre, t.cuadrilla?.nombre || 'Cuadrilla general', t.dias, t.fecha_inicio, t.fecha_fin])
        : grupos.flatMap((g) => g.items.map((it) => [it.numero, it.apu?.nombre, it.apu?.cuadrilla_nombre || 'Cuadrilla general', '', fechaInicio, '']));
      filasCrono.forEach((vals) => {
        const row = wsC.getRow(c);
        row.values = vals;
        row.font = { name: 'Arial', size: 9 };
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
        bordes(row, 6);
        c++;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const fileName = tipo === 'gratuito'
      ? `Kalarti_Presupuesto_Resumen_${String(proyectoNombre).replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
      : `Kalarti_Presupuesto_Completo_${String(proyectoNombre).replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error generando Excel:', error);
    return NextResponse.json({ error: 'Error al exportar presupuesto: ' + error.message }, { status: 500 });
  }
}
