'use client';

import { useMemo } from 'react';
import { CUADRILLAS_DEFAULT, CUADRILLA_GENERAL } from '@/lib/cotizador/config';

export default function MiniGanttView({ cronograma, numCuadrillas, setNumCuadrillas }) {
  const { tareas = [], duracionDias = 0, fechaInicio, fechaFin, porCuadrilla = [] } = cronograma || {};

  const maxDays = Math.max(1, duracionDias);

  return (
    <div>
      {/* Controles de cuadrilla */}
      <div className="calc-card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>📅 Cronograma y Cuadrillas</h3>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>
            {fechaInicio} ➔ {fechaFin} ({duracionDias} días hábiles proyectados)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#cbd5e1' }}>Cuadrillas simultáneas:</span>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 2 }}>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setNumCuadrillas(n)}
                style={{
                  background: numCuadrillas === n ? '#f59e0b' : 'none',
                  color: numCuadrillas === n ? '#0f172a' : 'white',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {n}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leyenda de cuadrillas asignadas */}
      <div className="calc-card" style={{ padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>
          Cuadrillas Kalarti Asignadas Automáticamente
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {porCuadrilla.map(p => (
            <div
              key={p.cuadrilla.codigo}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 11,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.cuadrilla.color || '#3b82f6' }} />
              <span style={{ fontWeight: 600 }}>{p.cuadrilla.nombre}</span>
              <span style={{ color: '#94a3b8' }}>({p.items} acts)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico Gantt de Barras */}
      <div className="calc-card" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 540 }}>
          {tareas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
              Agrega ítems para visualizar la proyección de tiempos.
            </div>
          ) : (
            tareas.map((t, idx) => {
              const leftPct = (t.startDay / maxDays) * 100;
              const widthPct = Math.max(3, (t.dias / maxDays) * 100);
              const color = t.cuadrilla?.color || '#3b82f6';

              return (
                <div key={idx} className="mini-gantt-row">
                  <div className="mini-gantt-label" title={t.nombre}>
                    <span style={{ fontWeight: 700, color: '#cbd5e1', marginRight: 6 }}>{idx + 1}.</span>
                    {t.nombre}
                  </div>

                  <div className="mini-gantt-track">
                    <div
                      className="mini-gantt-bar"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: color,
                      }}
                      title={`${t.nombre}: ${t.dias} días hábiles (${t.fecha_inicio} a ${t.fecha_fin})`}
                    >
                      {t.dias}d
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
