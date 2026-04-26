'use client';

import { useState } from 'react';
import { useStore } from '@/store/StoreContext';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function ReportsView() {
  const { state, calcularCostoAPU, calcularPresupuesto, calcularExplosionInsumos } = useStore();
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [logo, setLogo] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const proyecto = state.proyectos.find(p => p.id === selectedProyectoId);
  const presupuestoItems = state.presupuestoItems.filter(pi => pi.proyecto_id === selectedProyectoId);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setLogo(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  // --- EXCEL EXPORT ---
  const exportPresupuestoExcel = async () => {
    if (!proyecto) return;
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Presupuesto');
      if (logo) {
        const imageId = workbook.addImage({ base64: logo, extension: 'png' });
        sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 100, height: 60 } });
      }
      sheet.mergeCells('A1:F1');
      sheet.getCell('A1').value = proyecto.nombre.toUpperCase();
      sheet.getCell('A1').font = { size: 16, bold: true };
      sheet.getCell('A1').alignment = { horizontal: 'center' };
      
      const headerRow = sheet.getRow(5);
      headerRow.values = ['ÍTEM', 'DESCRIPCIÓN', 'UNIDAD', 'CANTIDAD', 'VR. UNITARIO', 'VR. TOTAL'];
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      });

      let currentRow = 6;
      const chapters = [...new Set(presupuestoItems.map(item => item.capitulo || 'GENERAL'))];
      chapters.forEach((cap, capIdx) => {
        const chapterRow = sheet.getRow(currentRow++);
        chapterRow.getCell(1).value = `${capIdx + 1}`;
        chapterRow.getCell(2).value = cap.toUpperCase();
        chapterRow.font = { bold: true };
        chapterRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        
        const itemsInCap = presupuestoItems.filter(i => (i.capitulo || 'GENERAL') === cap);
        itemsInCap.forEach((item, itemIdx) => {
          const row = sheet.getRow(currentRow++);
          const costUnit = calcularCostoAPU(item.apu_id);
          const total = costUnit * (item.cantidad || 0);
          row.values = [`${capIdx + 1}.${itemIdx + 1}`, item.descripcion, state.apus.find(a => a.id === item.apu_id)?.unidad || 'un', item.cantidad, costUnit, total];
          row.getCell(5).numFmt = '"$"#,##0'; row.getCell(6).numFmt = '"$"#,##0';
        });
      });

      const resume = calcularPresupuesto(selectedProyectoId);
      currentRow += 2;
      const addTotalRow = (label, value, isBold = false) => {
        const row = sheet.getRow(currentRow++);
        sheet.mergeCells(`A${currentRow - 1}:E${currentRow - 1}`);
        row.getCell(1).value = label; row.getCell(1).alignment = { horizontal: 'right' };
        row.getCell(6).value = value; row.getCell(6).numFmt = '"$"#,##0';
        if (isBold) row.font = { bold: true };
      };
      addTotalRow('COSTO DIRECTO TOTAL', resume.costoDirecto, true);
      addTotalRow('VALOR TOTAL CON AIU', resume.gran_total, true);

      sheet.columns = [{ width: 10 }, { width: 45 }, { width: 10 }, { width: 12 }, { width: 18 }, { width: 18 }];
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Presupuesto_${proyecto.nombre.replace(/\s+/g, '_')}.xlsx`);
    } catch (err) { alert('Error: ' + err.message); } finally { setIsExporting(false); }
  };

  const exportExplosionExcel = async () => {
    if (!proyecto) return;
    setIsExporting(true);
    try {
      const explosion = calcularExplosionInsumos(selectedProyectoId);
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Explosión');
      sheet.addRow(['EXPLOSIÓN DE INSUMOS']).font = { size: 14, bold: true };
      sheet.addRow([proyecto.nombre]);
      sheet.addRow([]);
      const header = sheet.addRow(['CÓDIGO', 'INSUMO', 'TIPO', 'UNIDAD', 'CANTIDAD', 'UNITARIO', 'SUBTOTAL']);
      header.font = { bold: true };
      explosion.forEach(item => {
        const row = sheet.addRow([item.codigo, item.nombre, item.tipo, item.unidad, item.cantidad_total, item.precio_unitario, item.total_costo]);
        row.getCell(6).numFmt = '"$"#,##0'; row.getCell(7).numFmt = '"$"#,##0';
      });
      sheet.columns = [{ width: 15 }, { width: 35 }, { width: 15 }, { width: 10 }, { width: 15 }, { width: 15 }, { width: 15 }];
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Explosion_${proyecto.nombre.replace(/\s+/g, '_')}.xlsx`);
    } catch (err) { alert('Error: ' + err.message); } finally { setIsExporting(false); }
  };

  // --- PDF EXPORT ---
  const exportExecutionPDF = () => {
    if (!proyecto) return;
    const doc = new jsPDF();
    const resume = calcularPresupuesto(selectedProyectoId);
    const projectNotes = state.notas.filter(n => presupuestoItems.some(i => i.id === n.presupuesto_item_id));

    if (logo) doc.addImage(logo, 'PNG', 14, 10, 30, 15);
    doc.setFontSize(14); doc.text('INFORME DE EJECUCIÓN Y BITÁCORA', 105, 15, { align: 'center' });
    doc.setFontSize(10); doc.text(proyecto.nombre, 105, 22, { align: 'center' });

    doc.setFontSize(12); doc.text('1. RESUMEN DE AVANCE', 14, 35);
    doc.autoTable({
      startY: 40,
      head: [['COSTO DIRECTO', 'VALOR CON AIU', 'PROGRESO FÍSICO EST.']],
      body: [[formatCurrency(resume.costoDirecto), formatCurrency(resume.gran_total), 'Ver Detalle']],
      theme: 'grid'
    });

    let currentY = doc.lastAutoTable.finalY + 15;
    doc.text('2. NOVEDADES Y REGISTRO FOTOGRÁFICO', 14, currentY);
    currentY += 10;

    projectNotes.forEach((note) => {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      const item = presupuestoItems.find(i => i.id === note.presupuesto_item_id);
      doc.setFontSize(9); doc.setFont(undefined, 'bold');
      doc.text(`Ítem: ${item?.descripcion || 'General'} | Estado: ${note.status} | Asignado: ${note.assigned_to || 'N/A'}`, 14, currentY);
      doc.setFont(undefined, 'normal');
      currentY += 5;
      const textLines = doc.splitTextToSize(note.texto, 180);
      doc.text(textLines, 14, currentY);
      currentY += (textLines.length * 5) + 5;
      if (note.photo_url) {
        doc.setTextColor(37, 99, 235);
        doc.text(`[Evidencia Fotográfica: Ver en plataforma - ${note.photo_url.substring(0, 30)}...]`, 14, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 8;
      }
      currentY += 5;
    });

    doc.save(`Ejecucion_${proyecto.nombre.replace(/\s+/g, '_')}.pdf`);
  };

  const exportPresupuestoPDF = () => {
    if (!proyecto) return;
    const doc = new jsPDF();
    const resume = calcularPresupuesto(selectedProyectoId);
    if (logo) doc.addImage(logo, 'PNG', 14, 10, 30, 15);
    doc.setFontSize(14); doc.text(proyecto.nombre.toUpperCase(), 105, 15, { align: 'center' });
    const tableData = [];
    const chapters = [...new Set(presupuestoItems.map(item => item.capitulo || 'GENERAL'))];
    chapters.forEach((cap, capIdx) => {
      tableData.push([{ content: cap.toUpperCase(), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
      const itemsInCap = presupuestoItems.filter(i => (i.capitulo || 'GENERAL') === cap);
      itemsInCap.forEach((item, itemIdx) => {
        const costUnit = calcularCostoAPU(item.apu_id);
        tableData.push([`${capIdx+1}.${itemIdx+1}`, item.descripcion, state.apus.find(a => a.id === item.apu_id)?.unidad || 'un', item.cantidad, formatCurrency(costUnit), formatCurrency(costUnit * item.cantidad)]);
      });
    });
    tableData.push(['', { content: 'TOTAL PRESUPUESTO', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, formatCurrency(resume.gran_total)]);
    doc.autoTable({ startY: 30, head: [['ÍTEM', 'DESCRIPCIÓN', 'UNID.', 'CANT.', 'UNITARIO', 'TOTAL']], body: tableData, theme: 'grid' });
    doc.save(`Presupuesto_${proyecto.nombre.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Centro de Reportes</h1>
          <div className="page-header-subtitle">Gestión documental y control de bitácora</div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          <div className="card">
            <div className="card-header"><h3>Proyecto y Logo</h3></div>
            <div style={{ padding: 16 }}>
              <select className="form-select" value={selectedProyectoId} onChange={(e) => setSelectedProyectoId(e.target.value)}>
                <option value="">Seleccionar Proyecto...</option>
                {state.proyectos.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
              </select>
              <div style={{ marginTop: 16 }}>
                <label className="form-label">Logo Personalizado</label>
                <input type="file" onChange={handleLogoChange} accept="image/*" className="form-control" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Formatos Disponibles</h3></div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="report-card-mini">
                <h4>Presupuesto de Obra</h4>
                <div className="btn-group">
                  <button className="btn btn-sm btn-secondary" onClick={exportPresupuestoExcel}>Excel</button>
                  <button className="btn btn-sm btn-ghost" onClick={exportPresupuestoPDF}>PDF</button>
                </div>
              </div>
              <div className="report-card-mini">
                <h4>Explosión de Insumos</h4>
                <div className="btn-group">
                  <button className="btn btn-sm btn-secondary" onClick={exportExplosionExcel}>Excel</button>
                </div>
              </div>
              <div className="report-card-mini" style={{ gridColumn: 'span 2', background: '#f0f9ff', borderColor: '#bae6fd' }}>
                <h4 style={{ color: '#0369a1' }}>📸 Informe de Bitácora y Ejecución</h4>
                <p style={{ fontSize: 11, color: '#0369a1', marginBottom: 12 }}>Resumen de avances, estados de aprobación y evidencias fotográficas.</p>
                <button className="btn btn-sm btn-primary" onClick={exportExecutionPDF} disabled={!selectedProyectoId}>Generar PDF Profesional</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .report-card-mini { padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; }
        .report-card-mini h4 { margin-top: 0; margin-bottom: 8px; font-size: 14px; }
        .btn-group { display: flex; gap: 8px; }
      `}</style>
    </>
  );
}
