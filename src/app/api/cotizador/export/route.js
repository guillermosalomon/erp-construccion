import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { formatMoney, AIU } from '@/lib/cotizador/config';
import { agruparPorCapitulo, calcularPresupuesto } from '@/lib/cotizador/engine';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      proyectoNombre = 'Presupuesto de Obra',
      items = [],
      catalogoMap = {},
      fechaInicio,
      duracionDias = 0,
      clienteNombre = 'Cliente',
      ciudad = 'Colombia',
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

    // ── Hoja 1: Presupuesto General ──
    const wsBudget = workbook.addWorksheet('Presupuesto');
    wsBudget.columns = [
      { header: 'ÍTEM', key: 'item', width: 8 },
      { header: 'CÓDIGO', key: 'codigo', width: 14 },
      { header: 'DESCRIPCIÓN DE LA ACTIVIDAD', key: 'desc', width: 44 },
      { header: 'UNIDAD', key: 'un', width: 10 },
      { header: 'CANTIDAD', key: 'cant', width: 12 },
      { header: 'VALOR UNITARIO (COP)', key: 'vUnit', width: 22 },
      { header: 'VALOR TOTAL (COP)', key: 'vTotal', width: 24 },
      { header: 'CUADRILLA ASIGNADA', key: 'cuadrilla', width: 28 },
    ];

    // Título institucional
    wsBudget.mergeCells('A1:H1');
    const headerTitle = wsBudget.getCell('A1');
    headerTitle.value = `KALARTI CONSTRUCTORES — PRESUPUESTO DE OBRA`;
    headerTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    headerTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    headerTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    wsBudget.getRow(1).height = 32;

    // Metadatos
    wsBudget.addRow([`Proyecto: ${proyectoNombre}`, '', `Ciudad: ${ciudad}`, '', `Cliente: ${clienteNombre}`, '', `Fecha: ${fechaInicio || new Date().toISOString().split('T')[0]}`, '']);
    wsBudget.getRow(2).font = { bold: true, size: 10, color: { argb: 'FF334155' } };

    // Encabezados de tabla en fila 4
    wsBudget.getRow(4).values = ['ÍTEM', 'CÓDIGO', 'DESCRIPCIÓN DE LA ACTIVIDAD', 'UN', 'CANTIDAD', 'VALOR UNITARIO', 'VALOR TOTAL', 'CUADRILLA'];
    wsBudget.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsBudget.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    wsBudget.getRow(4).alignment = { horizontal: 'center', vertical: 'middle' };

    let currentRow = 5;
    let itemGlobalCounter = 1;

    grupos.forEach((g) => {
      // Fila de Capítulo
      const capRow = wsBudget.getRow(currentRow);
      capRow.values = [g.capitulo, '', '', '', '', '', g.subtotal, ''];
      capRow.font = { bold: true, color: { argb: 'FF0F172A' } };
      capRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      wsBudget.getCell(`G${currentRow}`).numFmt = '"$"#,##0';
      currentRow++;

      g.items.forEach(it => {
        const row = wsBudget.getRow(currentRow);
        row.values = [
          itemGlobalCounter++,
          it.apu?.codigo || 'APU',
          it.apu?.nombre || 'Ítem',
          it.apu?.unidad || 'Un',
          Number(it.cantidad) || 0,
          Number(it.apu?.precio_unitario) || 0,
          Number(it.valor) || 0,
          it.apu?.cuadrilla_nombre || 'Cuadrilla General',
        ];
        wsBudget.getCell(`E${currentRow}`).numFmt = '#,##0.00';
        wsBudget.getCell(`F${currentRow}`).numFmt = '"$"#,##0';
        wsBudget.getCell(`G${currentRow}`).numFmt = '"$"#,##0';
        currentRow++;
      });
    });

    // Separador y Resumen AIU
    currentRow++;
    const addSummaryRow = (label, val, isBold = false, isAccent = false) => {
      const r = wsBudget.getRow(currentRow);
      r.values = ['', '', '', '', '', label, val, ''];
      r.font = { bold: isBold, size: isAccent ? 12 : 10, color: isAccent ? { argb: 'FFFFFFFF' } : undefined };
      if (isAccent) {
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      }
      wsBudget.getCell(`G${currentRow}`).numFmt = '"$"#,##0';
      currentRow++;
    };

    addSummaryRow('COSTO DIRECTO:', totals.costoDirecto, true);
    addSummaryRow(`ADMINISTRACIÓN (${AIU.admin}%):`, totals.admin);
    addSummaryRow(`IMPREVISTOS (${AIU.imprev}%):`, totals.imprev);
    addSummaryRow(`UTILIDAD (${AIU.utilidad}%):`, totals.utilidad);
    addSummaryRow(`IVA SOBRE UTILIDAD (${AIU.ivaSobreUtilidad}%):`, totals.iva);
    addSummaryRow('TOTAL PRESUPUESTO (COP):', totals.total, true, true);

    // ── Hoja 2: Cronograma / Cuadrillas ──
    if (cronograma && cronograma.tareas && cronograma.tareas.length > 0) {
      const wsGantt = workbook.addWorksheet('Cronograma & Cuadrillas');
      wsGantt.columns = [
        { header: '#', key: 'idx', width: 6 },
        { header: 'ACTIVIDAD', key: 'nom', width: 40 },
        { header: 'CUADRILLA ASIGNADA', key: 'cuad', width: 32 },
        { header: 'DÍAS HÁBILES', key: 'dias', width: 14 },
        { header: 'FECHA INICIO', key: 'fIni', width: 16 },
        { header: 'FECHA FIN', key: 'fFin', width: 16 },
      ];

      wsGantt.mergeCells('A1:F1');
      const gTitle = wsGantt.getCell('A1');
      gTitle.value = `CRONOGRAMA DE EJECUCIÓN — DURACIÓN TOTAL: ${duracionDias} DÍAS HÁBILES`;
      gTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      gTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      gTitle.alignment = { horizontal: 'center', vertical: 'middle' };

      wsGantt.getRow(3).values = ['#', 'ACTIVIDAD', 'CUADRILLA ASIGNADA', 'DÍAS', 'FECHA INICIO', 'FECHA FIN'];
      wsGantt.getRow(3).font = { bold: true };
      wsGantt.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

      let gRow = 4;
      cronograma.tareas.forEach((t, i) => {
        const row = wsGantt.getRow(gRow);
        row.values = [
          i + 1,
          t.nombre,
          t.cuadrilla?.nombre || 'Cuadrilla General',
          t.dias,
          t.fecha_inicio,
          t.fecha_fin,
        ];
        gRow++;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Kalarti_Presupuesto_${proyectoNombre.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generando Excel:', error);
    return NextResponse.json({ error: 'Error al exportar presupuesto' }, { status: 500 });
  }
}
