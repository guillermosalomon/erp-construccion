'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function ExcelImporter({ onImport, onClose, title = "Importar desde Excel" }) {
  const [fileData, setFileData] = useState(null);
  const [mapping, setMapping] = useState({
    codigo: '',
    nombre: '',
    tipo: '',
    unidad: '',
    precio_unitario: ''
  });
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          setError("El archivo parece estar vacío o no tiene suficientes filas.");
          return;
        }

        const headers = jsonData[0].map(h => (h || '').toString().trim());
        const rows = jsonData.slice(1).filter(r => r.length > 0);

        setFileData({ headers, rows, fileName: file.name });
        setError(null);

        // Try to auto-map headers
        const newMapping = { ...mapping };
        headers.forEach((h, idx) => {
          const lowerH = h.toLowerCase();
          if (lowerH.includes('cod') || lowerH.includes('id')) newMapping.codigo = h;
          if (lowerH.includes('nom') || lowerH.includes('desc')) newMapping.nombre = h;
          if (lowerH.includes('tipo') || lowerH.includes('cat')) newMapping.tipo = h;
          if (lowerH.includes('und') || lowerH.includes('unidad')) newMapping.unidad = h;
          if (lowerH.includes('prec') || lowerH.includes('val') || lowerH.includes('cost')) newMapping.precio_unitario = h;
        });
        setMapping(newMapping);

      } catch (err) {
        console.error("Error parsing Excel:", err);
        setError("Error al leer el archivo. Asegúrate de que sea un archivo Excel válido.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    if (!fileData || !mapping.nombre) {
      setError("Debes seleccionar al menos la columna 'Nombre'.");
      return;
    }

    const { headers, rows } = fileData;
    const colIndices = {
      codigo: headers.indexOf(mapping.codigo),
      nombre: headers.indexOf(mapping.nombre),
      tipo: headers.indexOf(mapping.tipo),
      unidad: headers.indexOf(mapping.unidad),
      precio_unitario: headers.indexOf(mapping.precio_unitario)
    };

    const importedData = rows.map(row => ({
      codigo: colIndices.codigo >= 0 ? row[colIndices.codigo] : '',
      nombre: colIndices.nombre >= 0 ? row[colIndices.nombre] : '',
      tipo: colIndices.tipo >= 0 ? row[colIndices.tipo] : 'MATERIAL',
      unidad: colIndices.unidad >= 0 ? row[colIndices.unidad] : 'un',
      precio_unitario: colIndices.precio_unitario >= 0 ? parseFloat(row[colIndices.precio_unitario]) || 0 : 0
    })).filter(item => item.nombre);

    onImport(importedData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {!fileData ? (
            <div className="empty-state" style={{ padding: '60px 0', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
              <h3>Selecciona un archivo Excel (.xlsx, .xls) o CSV</h3>
              <p style={{ maxWidth: 300, margin: '0 auto 20px' }}>
                Podrás mapear las columnas y previsualizar los datos antes de importar.
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx, .xls, .csv" 
                style={{ display: 'none' }} 
              />
              <button className="btn btn-primary" onClick={() => fileInputRef.current.click()}>
                Seleccionar Archivo
              </button>
              {error && <div style={{ color: 'var(--color-danger)', marginTop: 16, fontSize: 13 }}>{error}</div>}
            </div>
          ) : (
            <>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
                📁 Archivo: <strong>{fileData.fileName}</strong> • {fileData.rows.length} filas detectadas
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {Object.keys(mapping).map(field => (
                  <div className="form-group" key={field}>
                    <label className="form-label" style={{ textTransform: 'capitalize', fontSize: 11 }}>
                      {field.replace('_', ' ')} {field === 'nombre' && '*'}
                    </label>
                    <select 
                      className="form-select" 
                      style={{ fontSize: 12, padding: '4px 8px' }}
                      value={mapping[field]} 
                      onChange={e => setMapping({ ...mapping, [field]: e.target.value })}
                    >
                      <option value="">(No importar)</option>
                      {fileData.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Vista Previa (Primeras 5 filas):</div>
                <div className="table-container" style={{ maxHeight: 250, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <table className="data-table" style={{ fontSize: 11 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        {fileData.headers.map(h => (
                          <th key={h} style={{ 
                            background: Object.values(mapping).includes(h) ? '#dcfce7' : '#f8fafc',
                            color: Object.values(mapping).includes(h) ? '#166534' : 'inherit'
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fileData.rows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {fileData.headers.map((_, j) => (
                            <td key={j}>{row[j] || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {error && <div style={{ color: 'var(--color-danger)', marginTop: 16, fontSize: 13 }}>{error}</div>}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button 
            className="btn btn-primary" 
            onClick={handleImport} 
            disabled={!fileData || !mapping.nombre}
          >
            Importar {fileData ? fileData.rows.length : 0} Registros
          </button>
        </div>
      </div>
    </div>
  );
}
