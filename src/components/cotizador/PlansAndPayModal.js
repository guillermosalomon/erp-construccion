'use client';

import { useState } from 'react';
import { PRODUCTOS, PLAN_FEATURES, formatMoney, APU_COUNT_LABEL } from '@/lib/cotizador/config';

export default function PlansAndPayModal({
  isOpen,
  onClose,
  currency,
  initialProduct = 'export',
  onExportExcel,
  proyectoNombre,
}) {
  const [selectedProd, setSelectedProd] = useState(initialProduct);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = async (prodKey) => {
    setLoading(true);
    try {
      if (prodKey === 'export' && onExportExcel) {
        // Enviar exportación directa o pasarela
        await onExportExcel();
        onClose();
        return;
      }

      const res = await fetch('/api/pagos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: prodKey,
          moneda: currency,
          proyectoId: proyectoNombre,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error en checkout:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cot-modal-backdrop" onClick={onClose}>
      <div className="cot-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>⚡ Exportar & Planes Kalarti ERP</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Opción 1: Exportar a Excel (Pago Único) */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#10b981' }}>Exportar Proyecto a Excel</span>
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
              Descarga el archivo estructurado con presupuesto detallado, AIU, cuadrillas y cronograma.
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginTop: 4 }}>
              {formatMoney(PRODUCTOS.export.precio[currency], currency)} <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>pago único</span>
            </div>
          </div>

          <button
            onClick={() => handleCheckout('export')}
            disabled={loading}
            className="btn-action-primary"
            style={{ padding: '10px 16px', fontSize: 13, flexShrink: 0 }}
          >
            {loading ? 'Generando...' : '📥 Descargar Excel'}
          </button>
        </div>

        {/* Separador */}
        <div style={{ textAlign: 'center', margin: '20px 0 14px', position: 'relative' }}>
          <span style={{ background: '#1e293b', padding: '0 12px', color: '#94a3b8', fontSize: 12, fontWeight: 700, position: 'relative', zIndex: 1 }}>
            O ADMINISTRA Y HAZ SEGUIMIENTO DE OBRA
          </span>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Planes de suscripción */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['mensual', 'semestral', 'anual'].map(planKey => {
            const p = PRODUCTOS[planKey];
            const isDestacado = p.destacado;
            return (
              <div
                key={planKey}
                style={{
                  background: isDestacado ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid',
                  borderColor: isDestacado ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: isDestacado ? '#fbbf24' : 'white' }}>
                      {p.nombre}
                    </span>
                    {isDestacado && (
                      <span style={{ fontSize: 10, background: '#f59e0b', color: '#0f172a', padding: '2px 6px', borderRadius: 10, fontWeight: 800 }}>
                        MÁS POPULAR
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {PLAN_FEATURES[planKey][1]} • {PLAN_FEATURES[planKey][2]}
                  </div>
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 2, fontWeight: 600 }}>
                    ✓ Base de datos con {APU_COUNT_LABEL} APUs corroborados
                  </div>
                  {planKey === 'anual' && (
                    <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2, fontWeight: 600 }}>
                      ✓ Edición y creación de APUs + Insumos propios
                    </div>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginTop: 6 }}>
                    {formatMoney(p.precio[currency], currency)} <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{p.periodo}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleCheckout(planKey)}
                  className={isDestacado ? 'btn-action-primary' : 'btn-action-secondary'}
                  style={{
                    padding: '10px 14px',
                    fontSize: 12,
                    flexShrink: 0,
                    background: isDestacado ? '#f59e0b' : undefined,
                    color: isDestacado ? '#0f172a' : undefined
                  }}
                >
                  Activar Plan
                </button>
              </div>
            );
          })}

          {/* Plan Empresa */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 14,
            padding: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'white' }}>Plan Empresa / Corporativo</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Más proyectos, usuarios ilimitados y personalización de software a medida.
              </div>
            </div>
            <a
              href="https://wa.me/573177725056?text=Hola%20Kalarti,%20deseo%20informaci%C3%B3n%20sobre%20el%20Plan%20Empresarial%20a%20medida"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-action-secondary"
              style={{ padding: '8px 12px', fontSize: 12, textDecoration: 'none', display: 'inline-block' }}
            >
              Contactar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
