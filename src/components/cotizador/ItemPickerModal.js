'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/cotizador/config';

export default function ItemPickerModal({ isOpen, onClose, catalogo, onAddItem }) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');

  if (!isOpen) return null;

  const categorias = ['ALL', ...new Set(catalogo.map(c => c.categoria))];

  // Búsqueda sin tildes por nombre y descripción técnica (nunca por códigos)
  const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const terms = normTxt(search).split(/\s+/).filter(Boolean);

  const filtered = catalogo.filter(item => {
    const matchesCat = selectedCat === 'ALL' || item.categoria === selectedCat;
    if (!matchesCat) return false;
    if (!terms.length) return true;
    const hay = normTxt(`${item.nombre} ${item.descripcion || ''}`);
    return terms.every(t => hay.includes(t));
  });

  return (
    <div className="cot-modal-backdrop" onClick={onClose}>
      <div className="cot-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>📦 Agregar Ítem de Obra</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar por nombre o especificación (ej: muro, pañete, tubería)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'white',
            fontSize: 14,
            marginBottom: 12,
            outline: 'none',
          }}
        />

        {/* Filtro Categorías horizontal scroll */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                border: '1px solid',
                borderColor: selectedCat === cat ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
                background: selectedCat === cat ? '#f59e0b' : 'rgba(255, 255, 255, 0.04)',
                color: selectedCat === cat ? '#0f172a' : '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              {cat === 'ALL' ? 'Todas' : cat}
            </button>
          ))}
        </div>

        {/* Lista de APUs */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
              No se encontraron actividades con ese criterio.
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      {item.categoria}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.nombre}
                  </div>
                  {item.descripcion && (
                    <div
                      title={item.descripcion}
                      style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {item.descripcion}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                    {formatMoney(item.precio_unitario, 'COP')} / {item.unidad}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onAddItem(item.id);
                    onClose();
                  }}
                  className="btn-action-primary"
                  style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
                >
                  + Agregar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
