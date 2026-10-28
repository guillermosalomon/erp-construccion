'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

export default function InsumoSearchSelect({
  insumos = [],
  stock = [],
  value = '',
  onChange,
  mode = 'ENTRADA',
  placeholder = 'Buscar insumo por nombre, código o categoría...',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Mapa rápido de stock por insumo_id
  const stockMap = useMemo(() => {
    const map = new Map();
    (stock || []).forEach((s) => {
      map.set(s.insumo_id, Number(s.existente) || 0);
    });
    return map;
  }, [stock]);

  // Insumo seleccionado actualmente
  const selectedInsumo = useMemo(() => {
    if (!value) return null;
    return insumos.find((i) => i.id === value) || null;
  }, [value, insumos]);

  // Lista de insumos filtrada
  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      // Si está en modo CONSUMO y no hay búsqueda, priorizar insumos que tengan stock > 0
      if (mode === 'CONSUMO') {
        return [...insumos]
          .sort((a, b) => (stockMap.get(b.id) || 0) - (stockMap.get(a.id) || 0))
          .slice(0, 40);
      }
      return insumos.slice(0, 40);
    }
    const terms = q.split(/\s+/);
    return insumos
      .filter((i) => {
        const str = `${i.codigo || ''} ${i.nombre || ''} ${i.categoria || ''}`.toLowerCase();
        return terms.every((t) => str.includes(t));
      })
      .slice(0, 50);
  }, [insumos, searchTerm, mode, stockMap]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    if (onChange) onChange(item.id, item);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) onChange('', null);
    setSearchTerm('');
    setIsOpen(true);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 < filteredList.length ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredList[highlightIndex]) {
        handleSelect(filteredList[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const stockSeleccionado = selectedInsumo ? stockMap.get(selectedInsumo.id) || 0 : 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Contenedor del Input o Chip seleccionado */}
      {selectedInsumo && !isOpen ? (
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '8px 12px',
            background: '#f8fafc',
            border: '1.5px solid #3b82f6',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 14 }}>📦</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedInsumo.codigo ? `${selectedInsumo.codigo} - ` : ''}
                {selectedInsumo.nombre}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>Unidad: <strong>{selectedInsumo.unidad || 'UND'}</strong></span>
                <span>•</span>
                <span
                  style={{
                    color: stockSeleccionado > 0 ? '#15803d' : '#b91c1c',
                    fontWeight: 700,
                  }}
                >
                  Stock: {stockSeleccionado.toLocaleString('es-CO')} {selectedInsumo.unidad || 'UND'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 16,
              cursor: 'pointer',
              padding: '2px 6px',
            }}
            title="Cambiar insumo"
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
              setHighlightIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{ paddingRight: 32 }}
          />
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
              fontSize: 14,
            }}
          >
            🔍
          </span>
        </div>
      )}

      {/* Alerta si está en consumo y el stock es 0 */}
      {mode === 'CONSUMO' && selectedInsumo && stockSeleccionado <= 0 && (
        <div style={{ fontSize: 11, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 8px', marginTop: 4 }}>
          ⚠️ Este insumo no tiene existencias físicas registradas en esta bodega.
        </div>
      )}

      {/* Lista Desplegable Flotante */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            marginTop: 4,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {filteredList.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
              No se encontraron insumos coincidentes con &quot;{searchTerm}&quot;.
            </div>
          ) : (
            filteredList.map((item, idx) => {
              const itemStock = stockMap.get(item.id) || 0;
              const isHighlighted = idx === highlightIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #f1f5f9',
                    background: isHighlighted ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isHighlighted ? '#1d4ed8' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.codigo ? `${item.codigo} - ` : ''}
                      {item.nombre}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>
                        {item.categoria || item.tipo || 'GENERAL'}
                      </span>
                      <span>•</span>
                      <span>Unidad: <strong>{item.unidad || 'UND'}</strong></span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: itemStock > 0 ? '#dcfce7' : '#f1f5f9',
                        color: itemStock > 0 ? '#15803d' : '#64748b',
                      }}
                    >
                      Stock: {itemStock.toLocaleString('es-CO')} {item.unidad || ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
