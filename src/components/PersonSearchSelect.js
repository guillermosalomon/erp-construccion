'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

/**
 * Selector buscable con filtro de escritura inmediata para Personal y Usuarios.
 * Soporta agrupación por Recomendados vs Todo el Personal disponible.
 */
export default function PersonSearchSelect({
  people = [],
  recommendedIds = [],
  onSelect,
  placeholder = '+ Asignar persona (escribe para filtrar)...',
  buttonStyle = {},
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const recSet = useMemo(() => new Set(recommendedIds), [recommendedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? people
      : people.filter((p) => {
          const fullName = `${p.nombres || ''} ${p.apellidos || ''} ${p.nombre || ''}`.toLowerCase();
          const email = (p.email || '').toLowerCase();
          const prof = (p.profesion || '').toLowerCase();
          const role = (p.app_role || p.role || '').toLowerCase();
          const tel = (p.telefono || p.whatsapp || '').toLowerCase();
          return (
            fullName.includes(q) ||
            email.includes(q) ||
            prof.includes(q) ||
            role.includes(q) ||
            tel.includes(q)
          );
        });

    const recomendados = list.filter((p) => recSet.has(p.id));
    const otros = list.filter((p) => !recSet.has(p.id));
    return { recomendados, otros, total: list.length };
  }, [people, query, recSet]);

  const handleChoose = (person) => {
    setOpen(false);
    setQuery('');
    if (onSelect) onSelect(person);
  };

  const renderPersonRow = (p, isRec) => {
    const displayName = `${p.nombres || p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email || 'Sin nombre';
    const subInfo = [p.profesion, p.email, p.telefono].filter(Boolean).join(' · ');

    return (
      <div
        key={p.id}
        onClick={() => handleChoose(p)}
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          borderBottom: '1px solid #f1f5f9',
          background: isRec ? '#f0fdf4' : '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isRec ? '#dcfce7' : '#f8fafc';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isRec ? '#f0fdf4' : '#ffffff';
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isRec && <span title="Recomendado para este cargo">⭐</span>}
            <span>{displayName}</span>
            {p.isFromProfileOnly && (
              <span
                style={{
                  fontSize: 9,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: '#e0e7ff',
                  color: '#4338ca',
                  fontWeight: 700,
                }}
              >
                Usuario Web/ERP
              </span>
            )}
          </div>
          {subInfo && (
            <div
              style={{
                fontSize: 10,
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subInfo}
            </div>
          )}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#2563eb',
            background: '#eff6ff',
            padding: '2px 7px',
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          Asignar
        </span>
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 20);
          }}
          style={{
            width: '100%',
            textAlign: 'left',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            padding: compact ? '4px 8px' : '7px 10px',
            fontSize: compact ? 11 : 12,
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            ...buttonStyle,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {placeholder}
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>🔍▾</span>
        </button>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '2px solid #3b82f6',
            borderRadius: 6,
            padding: compact ? '3px 8px' : '5px 10px',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 12, color: '#3b82f6' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe nombre, cargo o correo..."
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: compact ? 11 : 12,
              background: 'transparent',
              color: '#0f172a',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 11,
                padding: '0 2px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            minWidth: 270,
            maxHeight: 260,
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.18)',
            zIndex: 1200,
          }}
        >
          {filtered.total === 0 ? (
            <div style={{ padding: 12, fontSize: 11, color: '#64748b', textAlign: 'center' }}>
              No se encontraron personas para &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {filtered.recomendados.length > 0 && (
                <div>
                  <div
                    style={{
                      padding: '4px 10px',
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#15803d',
                      background: '#dcfce7',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    ⭐ Recomendados para este rol ({filtered.recomendados.length})
                  </div>
                  {filtered.recomendados.map((p) => renderPersonRow(p, true))}
                </div>
              )}
              {filtered.otros.length > 0 && (
                <div>
                  <div
                    style={{
                      padding: '4px 10px',
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#475569',
                      background: '#f1f5f9',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    👥 Todo el personal y usuarios ({filtered.otros.length})
                  </div>
                  {filtered.otros.map((p) => renderPersonRow(p, false))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
