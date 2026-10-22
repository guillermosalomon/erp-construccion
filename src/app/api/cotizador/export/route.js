import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { AIU, formatMoney } from '@/lib/cotizador/config';
import { agruparPorCapitulo, calcularPresupuesto } from '@/lib/cotizador/engine';
import materialesReferente from '@/lib/cotizador/materiales_referente.json';

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

    const totals = calcularPresupuesto(items, catalogoMap);
    const grupos = agruparPorCapitulo(items, catalogoMap);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kalarti Constructores & Consultores';
    workbook.created = new Date();

    // Paleta de colores Kalarti / Institucional
    const COLOR_DARK = 'FF0F172A';
    const COLOR_BLUE = 'FF1E293B';
    const COLOR_ACCENT = 'FF10B981';
    const COLOR_ROW_ALT = 'FFF8FAFC';
    const COLOR_BORDER = 'FFE2E8F0';

    const borderStyle = {
      top: { style: 'thin', color: { argb: COLOR_BORDER } },
      left: { style: 'thin', color: { argb: COLOR_BORDER } },
      bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
      right: { style: 'thin', color: { argb: COLOR_BORDER } },
    };

    // ════════════════════════════════════════════════════════════════════════
    // HOJA 1: CUADRO PRESUPUESTO (Formato Referente con especificaciones concatenadas)
    // ════════════════════════════════════════════════════════════════════════
    const wsPresupuesto = workbook.addWorksheet('CUADRO PRESUPUESTO', {
      views: [{ showGridLines: true }]
    });

    wsPresupuesto.columns = [
      { width: 10 }, // A: ITEM
      { width: 68 }, // B: DESCRIPCION
      { width: 12 }, // C: UNIDAD
      { width: 14 }, // D: CANT.
      { width: 18 }, // E: PRECIO
      { width: 22 }, // F: TOTAL
    ];

    // Encabezado institucional idéntico al referente
    wsPresupuesto.mergeCells('A2:B2');
    const cellObjetoLabel = wsPresupuesto.getCell('A2');
    cellObjetoLabel.value = 'OBJETO';
    cellObjetoLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
    cellObjetoLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Resaltado amarillo referente

    wsPresupuesto.mergeCells('C2:F2');
    const cellObjetoVal = wsPresupuesto.getCell('C2');
    cellObjetoVal.value = proyectoNombre.toUpperCase();
    cellObjetoVal.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
    cellObjetoVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

    // Fila 3: Ubicación y Fecha
    wsPresupuesto.mergeCells('A3:B3');
    wsPresupuesto.getCell('A3').value = `UBICACIÓN: ${ubicacion.toUpperCase()}`;
    wsPresupuesto.getCell('A3').font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };

    wsPresupuesto.mergeCells('C3:F3');
    wsPresupuesto.getCell('C3').value = `FECHA: ${fechaInicio} | CLIENTE: ${clienteNombre.toUpperCase()} | DURACIÓN: ${duracionDias} DÍAS`;
    wsPresupuesto.getCell('C3').font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };

    // Fila 4: Cabeceras de columnas
    const headerCols = ['ITEM', 'DESCRIPCION', 'UNIDAD', 'CANT.', 'PRECIO', 'TOTAL'];
    const hRow = wsPresupuesto.getRow(4);
    hRow.values = headerCols;
    hRow.height = 24;
    hRow.eachCell((c) => {
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DARK } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = borderStyle;
    });

    let rowIdx = 6;
    let capIndex = 1;

    grupos.forEach((g) => {
      // Fila de Capítulo Principal
      const capRow = wsPresupuesto.getRow(rowIdx);
      capRow.values = [capIndex, g.capitulo.toUpperCase(), '', '', '', g.subtotal];
      capRow.height = 22;
      capRow.eachCell((c) => {
        c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE } };
        c.border = borderStyle;
      });
      wsPresupuesto.getCell(`F${rowIdx}`).numFmt = '"$"#,##0.00';
      rowIdx++;

      let subIndex = 1;
      g.items.forEach((it) => {
        const itRow = wsPresupuesto.getRow(rowIdx);
        const itemCode = `${capIndex}.${subIndex++}`;
        const apu = it.apu || catalogoMap[it.apu_id] || {};
        
        itRow.values = [
          itemCode,
          apu.nombre || it.descripcion || 'Ítem de obra',
          apu.unidad || 'UND',
          Number(it.cantidad) || 0,
          Number(apu.precio_unitario) || 0,
          Number(it.valor) || 0,
        ];
        itRow.height = 24;
        itRow.alignment = { vertical: 'middle' };
        itRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        itRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        itRow.getCell(4).numFmt = '#,##0.00';
        itRow.getCell(5).numFmt = '"$"#,##0.00';
        itRow.getCell(6).numFmt = '"$"#,##0.00';

        itRow.eachCell(c => { c.border = borderStyle; });
        rowIdx++;
      });

      capIndex++;
    });

    // ── Resumen de Costos Directos y AIU ──
    rowIdx++;
    const addAiuRow = (label, val, isBold = false, isAccent = false) => {
      const r = wsPresupuesto.getRow(rowIdx);
      r.values = ['', '', '', '', label, val];
      r.height = 22;
      r.getCell(5).font = { name: 'Arial', size: 10, bold: isBold, color: isAccent ? { argb: 'FFFFFFFF' } : undefined };
      r.getCell(6).font = { name: 'Arial', size: 10, bold: isBold, color: isAccent ? { argb: 'FFFFFFFF' } : undefined };
      r.getCell(6).numFmt = '"$"#,##0.00';
      if (isAccent) {
        r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ACCENT } };
        r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ACCENT } };
      }
      r.getCell(5).border = borderStyle;
      r.getCell(6).border = borderStyle;
      rowIdx++;
    };

    addAiuRow('COSTO DIRECTO TOTAL', totals.costoDirecto, true);
    addAiuRow(`ADMINISTRACIÓN (${AIU.admin}%)`, totals.admin);
    addAiuRow(`IMPREVISTOS (${AIU.imprev}%)`, totals.imprev);
    addAiuRow(`UTILIDAD (${AIU.utilidad}%)`, totals.utilidad);
    addAiuRow(`IVA SOBRE UTILIDAD (${AIU.ivaSobreUtilidad}%)`, totals.iva);
    addAiuRow('TOTAL PRESUPUESTO DE OBRA', totals.total, true, true);

    // ════════════════════════════════════════════════════════════════════════
    // SI ES LA VERSIÓN COMPLETA DE PAGO ($19.900 COP / Suscripción)
    // ════════════════════════════════════════════════════════════════════════
    if (tipo !== 'gratuito') {
      // ── Hoja 2: AIU DETALLADO ──
      const wsAiu = workbook.addWorksheet('AIU', { views: [{ showGridLines: true }] });
      wsAiu.columns = [
        { width: 10 },
        { width: 44 },
        { width: 14 },
        { width: 16 },
        { width: 20 },
      ];
      wsAiu.mergeCells('A1:E1');
      wsAiu.getCell('A1').value = `ANÁLISIS DE AIU (ADMINISTRACIÓN, IMPREVISTOS Y UTILIDADES) — ${proyectoNombre.toUpperCase()}`;
      wsAiu.getCell('A1').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      wsAiu.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DARK } };
      wsAiu.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      wsAiu.getRow(1).height = 26;

      wsAiu.getRow(3).values = ['ITEM', 'CONCEPTO', 'PORCENTAJE', 'BASE CÁLCULO', 'VALOR LIQUIDADO'];
      wsAiu.getRow(3).font = { bold: true };
      wsAiu.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

      const aiuItems = [
        [1, 'COSTOS DIRECTOS TOTALES DE OBRA', '100%', totals.costoDirecto, totals.costoDirecto],
        [2, 'ADMINISTRACIÓN (Dirección técnica, residencia, logística)', `${AIU.admin}%`, totals.costoDirecto, totals.admin],
        [3, 'IMPREVISTOS (Riesgos técnicos, fluctuaciones)', `${AIU.imprev}%`, totals.costoDirecto, totals.imprev],
        [4, 'UTILIDAD (Honorarios y beneficio del constructor)', `${AIU.utilidad}%`, totals.costoDirecto, totals.utilidad],
        [5, 'IVA SOBRE UTILIDAD (Régimen tributario construcción)', `${AIU.ivaSobreUtilidad}%`, totals.utilidad, totals.iva],
        [6, 'VALOR TOTAL DEL CONTRATO CON AIU', '124.95%', totals.costoDirecto, totals.total],
      ];

      aiuItems.forEach((r, i) => {
        const row = wsAiu.getRow(4 + i);
        row.values = r;
        row.getCell(4).numFmt = '"$"#,##0.00';
        row.getCell(5).numFmt = '"$"#,##0.00';
        if (i === aiuItems.length - 1) {
          row.font = { bold: true };
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        }
      });

      // ── Hoja 3: APU DESGLOSE ANALÍTICO ──
      const wsApu = workbook.addWorksheet('APU DESGLOSE', { views: [{ showGridLines: true }] });
      wsApu.columns = [
        { width: 12 }, // Código
        { width: 44 }, // Descripción / Insumo
        { width: 12 }, // Unidad
        { width: 14 }, // Rendimiento / Cantidad
        { width: 18 }, // Precio Unitario
        { width: 20 }, // Valor Parcial
      ];

      wsApu.mergeCells('A1:F1');
      wsApu.getCell('A1').value = `ANÁLISIS DE PRECIOS UNITARIOS (APU) DETALLADOS`;
      wsApu.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      wsApu.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DARK } };
      wsApu.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      let apuRowIdx = 3;
      items.forEach((it) => {
        const apu = catalogoMap[it.apu_id] || {};
        const headerRow = wsApu.getRow(apuRowIdx);
        headerRow.values = [apu.codigo || 'APU', apu.nombre || it.descripcion, apu.unidad || 'UND', 'CANT. OBRA:', it.cantidad, apu.precio_unitario];
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE } };
        wsApu.getCell(`F${apuRowIdx}`).numFmt = '"$"#,##0.00';
        apuRowIdx++;

        // Subheaders
        const subH = wsApu.getRow(apuRowIdx);
        subH.values = ['TIPO', 'COMPONENTE / MATERIAL / MANO DE OBRA', 'UNIDAD', 'REND / FACTOR', 'PRECIO UNITARIO', 'VALOR PARCIAL'];
        subH.font = { size: 9, bold: true };
        subH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        apuRowIdx++;

        const comps = apu.componentes || [];
        if (comps.length > 0) {
          comps.forEach(c => {
            const compRow = wsApu.getRow(apuRowIdx);
            compRow.values = [
              c.tipo,
              c.nombre,
              c.unidad,
              c.cantidad,
              c.precio_unitario,
              c.parcial,
            ];
            compRow.getCell(4).numFmt = '#,##0.0000';
            compRow.getCell(5).numFmt = '"$"#,##0.00';
            compRow.getCell(6).numFmt = '"$"#,##0.00';
            apuRowIdx++;
          });
        } else {
          // Si no tiene desglose atómico registrado, genera fila representativa
          const compRow = wsApu.getRow(apuRowIdx);
          compRow.values = ['DIRECTO', 'Costo Directo Base Paramétrico Kalarti', apu.unidad || 'UND', 1, apu.precio_unitario, apu.precio_unitario];
          compRow.getCell(5).numFmt = '"$"#,##0.00';
          compRow.getCell(6).numFmt = '"$"#,##0.00';
          apuRowIdx++;
        }
        apuRowIdx++; // Espacio
      });

      // ── Hoja 4: CANTIDADES E INSUMOS CONSOLIDADOS ──
      const wsInsumos = workbook.addWorksheet('CANTIDADES E INSUMOS', { views: [{ showGridLines: true }] });
      wsInsumos.columns = [
        { width: 14 },
        { width: 48 },
        { width: 12 },
        { width: 16 },
        { width: 18 },
        { width: 22 },
      ];
      wsInsumos.mergeCells('A1:F1');
      wsInsumos.getCell('A1').value = `EXPLOSIÓN TOTAL DE INSUMOS Y MATERIALES PARA COMPRAS`;
      wsInsumos.getCell('A1').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      wsInsumos.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DARK } };
      wsInsumos.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      wsInsumos.getRow(3).values = ['TIPO', 'DESCRIPCIÓN DEL INSUMO', 'UNIDAD', 'CANTIDAD TOTAL', 'PRECIO PROMEDIO', 'TOTAL ESTIMADO'];
      wsInsumos.getRow(3).font = { bold: true };
      wsInsumos.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

      // Consolidar insumos
      const insumoTotalMap = new Map();
      items.forEach(it => {
        const apu = catalogoMap[it.apu_id] || {};
        const comps = apu.componentes || [];
        comps.forEach(c => {
          const key = `${c.tipo}__${c.nombre}__${c.unidad}`;
          const current = insumoTotalMap.get(key) || { tipo: c.tipo, nombre: c.nombre, unidad: c.unidad, cantidadTotal: 0, precio: c.precio_unitario };
          current.cantidadTotal += (c.cantidad * (Number(it.cantidad) || 0));
          insumoTotalMap.set(key, current);
        });
      });

      let insRowIdx = 4;
      if (insumoTotalMap.size > 0) {
        insumoTotalMap.forEach(ins => {
          const r = wsInsumos.getRow(insRowIdx);
          const totalVal = Math.round(ins.cantidadTotal * ins.precio);
          r.values = [ins.tipo, ins.nombre, ins.unidad, ins.cantidadTotal, ins.precio, totalVal];
          r.getCell(4).numFmt = '#,##0.00';
          r.getCell(5).numFmt = '"$"#,##0.00';
          r.getCell(6).numFmt = '"$"#,##0.00';
          insRowIdx++;
        });
      } else {
        // Fallback si catálogo es directo
        items.forEach((it, i) => {
          const apu = catalogoMap[it.apu_id] || {};
          const r = wsInsumos.getRow(insRowIdx);
          r.values = ['ACTIVIDAD', apu.nombre, apu.unidad, it.cantidad, apu.precio_unitario, it.valor];
          r.getCell(4).numFmt = '#,##0.00';
          r.getCell(5).numFmt = '"$"#,##0.00';
          r.getCell(6).numFmt = '"$"#,##0.00';
          insRowIdx++;
        });
      }

      // ── Hoja 5: MANO DE OBRA Y CUADRILLAS ──
      const wsCuadrillas = workbook.addWorksheet('MANO DE OBRA & CUADRILLAS', { views: [{ showGridLines: true }] });
      wsCuadrillas.columns = [
        { width: 12 },
        { width: 36 },
        { width: 32 },
        { width: 24 },
        { width: 22 },
      ];
      wsCuadrillas.mergeCells('A1:E1');
      wsCuadrillas.getCell('A1').value = `CUADRILLAS ASIGNADAS Y FACTOR DE SALARIO REAL 2026 (PASTO / NARIÑO)`;
      wsCuadrillas.getCell('A1').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      wsCuadrillas.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DARK } };
      wsCuadrillas.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCuadrillas.getRow(3).values = ['CÓDIGO', 'CUADRILLA DE TRABAJO', 'COMPOSICIÓN TÉCNICA', 'FACTOR PRESTACIONAL', 'ESTADO ASIGNACIÓN'];
      wsCuadrillas.getRow(3).font = { bold: true };
      wsCuadrillas.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

      const cuadrillasList = [
        ['CQ-01', 'Preliminares y Movimiento de Tierra', '1 Oficial + 2 Ayudantes', '173.5% (Prestaciones Ley)', 'Asignada'],
        ['CQ-02', 'Estructura y Concretos', '1 Oficial + 3 Ayudantes', '173.5% (Prestaciones Ley)', 'Asignada'],
        ['CQ-03', 'Mampostería y Revoques', '1 Oficial + 1 Ayudante', '173.5% (Prestaciones Ley)', 'Asignada'],
        ['CQ-04', 'Instalaciones Hidrosanitarias', '1 Oficial Hidráulico + 1 Ayudante', '173.5% (Prestaciones Ley)', 'Asignada'],
        ['CQ-05', 'Instalaciones Eléctricas', '1 Oficial Electricista + 1 Ayudante', '173.5% (Prestaciones Ley)', 'Asignada'],
        ['CQ-06', 'Cubiertas y Carpintería', '1 Oficial + 1 Ayudante', '173.5% (Prestaciones Ley)', 'Asignada'],
        ['CQ-07', 'Acabados y Enchapes', '1 Oficial Enchapador + 1 Ayudante', '173.5% (Prestaciones Ley)', 'Asignada'],
        ['CQ-08', 'Bioconstrucción en Guadua', '1 Maestro Guadua + 2 Ayudantes', '173.5% (Prestaciones Ley)', 'Asignada'],
      ];

      cuadrillasList.forEach((cq, i) => {
        const r = wsCuadrillas.getRow(4 + i);
        r.values = cq;
      });

      // ── Hoja 6: CRONOGRAMA ──
      const wsCronograma = workbook.addWorksheet('CRONOGRAMA', { views: [{ showGridLines: true }] });
      wsCronograma.columns = [
        { width: 8 },
        { width: 40 },
        { width: 30 },
        { width: 14 },
        { width: 16 },
        { width: 16 },
      ];

      wsCronograma.mergeCells('A1:F1');
      wsCronograma.getCell('A1').value = `PROGRAMACIÓN DE OBRA Y TIEMPOS ESTIMADOS (${duracionDias} DÍAS HÁBILES)`;
      wsCronograma.getCell('A1').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      wsCronograma.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DARK } };
      wsCronograma.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCronograma.getRow(3).values = ['#', 'ACTIVIDAD DE OBRA', 'CUADRILLA ASIGNADA', 'DÍAS HÁBILES', 'FECHA INICIO', 'FECHA FIN'];
      wsCronograma.getRow(3).font = { bold: true };
      wsCronograma.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

      let croRowIdx = 4;
      if (cronograma && cronograma.tareas && cronograma.tareas.length > 0) {
        cronograma.tareas.forEach((t, i) => {
          const r = wsCronograma.getRow(croRowIdx);
          r.values = [i + 1, t.nombre, t.cuadrilla?.nombre || 'Cuadrilla General', t.dias, t.fecha_inicio, t.fecha_fin];
          croRowIdx++;
        });
      } else {
        items.forEach((it, i) => {
          const apu = catalogoMap[it.apu_id] || {};
          const r = wsCronograma.getRow(croRowIdx);
          r.values = [i + 1, apu.nombre, apu.cuadrilla_nombre || 'Cuadrilla General', 5, fechaInicio, fechaInicio];
          croRowIdx++;
        });
      }

      // ── Hoja 7: TABLA COMPARATIVA DE PROVEEDORES (3 Cotizaciones Reales) ──
      const wsComparativa = workbook.addWorksheet('COMPARATIVA PROVEEDORES', { views: [{ showGridLines: true }] });
      wsComparativa.columns = [
        { width: 36 }, // Insumo
        { width: 18 }, // Categoría
        { width: 10 }, // Unidad
        { width: 24 }, // Cotización 1 (Proveedor / Precio)
        { width: 24 }, // Cotización 2 (Proveedor / Precio)
        { width: 24 }, // Cotización 3 (Proveedor / Precio)
        { width: 26 }, // Proveedor Sugerido (Mejor Precio)
      ];

      wsComparativa.mergeCells('A1:G1');
      wsComparativa.getCell('A1').value = `TABLA COMPARATIVA DE PRECIOS ENTRE PROVEEDORES (REFERENTE 2026 - PASTO / COLOMBIA)`;
      wsComparativa.getCell('A1').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      wsComparativa.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DARK } };
      wsComparativa.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      wsComparativa.getRow(3).values = [
        'MATERIAL / INSUMO',
        'CATEGORÍA TÉCNICA',
        'UNIDAD',
        'COTIZACIÓN 1 (PROVEEDOR)',
        'COTIZACIÓN 2 (PROVEEDOR)',
        'COTIZACIÓN 3 (PROVEEDOR)',
        'PROVEEDOR RECOMENDADO',
      ];
      wsComparativa.getRow(3).font = { bold: true };
      wsComparativa.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

      let compIdx = 4;
      // Listar los insumos del referente coincidentes o más representativos
      const sampleMaterials = materialesReferente.filter(m => m.cotizaciones && m.cotizaciones.length >= 1).slice(0, 80);
      sampleMaterials.forEach(m => {
        const c1 = m.cotizaciones[0] ? `${m.cotizaciones[0].proveedor}: $${m.cotizaciones[0].valor.toLocaleString('es-CO')}` : '—';
        const c2 = m.cotizaciones[1] ? `${m.cotizaciones[1].proveedor}: $${m.cotizaciones[1].valor.toLocaleString('es-CO')}` : '—';
        const c3 = m.cotizaciones[2] ? `${m.cotizaciones[2].proveedor}: $${m.cotizaciones[2].valor.toLocaleString('es-CO')}` : '—';
        const mejor = m.proveedor_mas_barato ? `⭐ ${m.proveedor_mas_barato} ($${m.menor_precio.toLocaleString('es-CO')})` : '—';

        const r = wsComparativa.getRow(compIdx);
        r.values = [m.nombre, m.categoria, m.unidad, c1, c2, c3, mejor];
        r.getCell(7).font = { bold: true, color: { argb: 'FF059669' } };
        compIdx++;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const fileName = tipo === 'gratuito'
      ? `Kalarti_Presupuesto_Resumen_${proyectoNombre.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
      : `Kalarti_Presupuesto_Completo_${proyectoNombre.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

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
