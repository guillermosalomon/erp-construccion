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
  ubicacion,
}) {
  const [loadingAction, setLoadingAction] = useState(null);

  if (!isOpen) return null;

  const handleDescargaGratis = async () => {
    setLoadingAction('gratis');
    try {
      if (onExportExcel) {
        await onExportExcel('gratuito');
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error descargando resumen gratuito');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDescargaCompleta = async () => {
    setLoadingAction('completo');
    try {
      if (onExportExcel) {
        await onExportExcel('completo');
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error descargando archivo completo');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCheckoutPlan = async (prodKey) => {
    setLoadingAction(prodKey);
    try {
      const res = await fetch('/api/pagos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: prodKey,
          moneda: currency,
          proyectoId: proyectoNombre,
          ubicacion: ubicacion,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert('Redirigiendo a pasarela...');
      }
    } catch (err) {
      console.error('Error en checkout:', err);
      alert('Error iniciando suscripción.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="cot-modal-backdrop" onClick={onClose}>
      <div className="cot-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 660, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>⚡ Exportación & Planes Kalarti ERP</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
              Proyecto: <strong style={{ color: 'white' }}>{proyectoNombre}</strong> ({ubicacion})
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* ── SECCIÓN 1: DESCARGAS DIRECTAS DEL PROYECTO ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {/* Opción A: Gratuita */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 14,
            padding: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#f1f5f9' }}>Descarga Gratuita (Resumen)</span>
                <span style={{ fontSize: 10, background: '#334155', color: '#cbd5e1', padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>
                  GRATIS
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Cuadro Presupuesto con capítulos, cantidades, precios unitarios y liquidación general de AIU.
              </div>
            </div>
            <button
              onClick={handleDescargaGratis}
              disabled={loadingAction !== null}
              className="btn-action-secondary"
              style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
            >
              {loadingAction === 'gratis' ? 'Generando...' : '📥 Descargar Gratis'}
            </button>
          </div>

          {/* Opción B: Completa de Pago ($19.900 COP) */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 14,
            padding: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>⭐</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#10b981' }}>Archivo Completo de Obra</span>
                <span style={{ fontSize: 10, background: '#059669', color: 'white', padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>
                  RECOMENDADO
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4, lineHeight: 1.4 }}>
                <strong>Incluye 6 hojas:</strong> Presupuesto, AIU, APU detallados, Materiales a precios almacén Kalarti, Mano de obra (salarios y cuadrillas) y Cronograma.
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'white', marginTop: 6 }}>
                {formatMoney(PRODUCTOS.export.precio[currency], currency)} <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>pago único por proyecto</span>
              </div>
            </div>

            <button
              onClick={handleDescargaCompleta}
              disabled={loadingAction !== null}
              className="btn-action-primary"
              style={{ padding: '10px 16px', fontSize: 13, flexShrink: 0 }}
            >
              {loadingAction === 'completo' ? 'Generando...' : '⭐ Descargar Completo'}
            </button>
          </div>
        </div>

        {/* Separador */}
        <div style={{ textAlign: 'center', margin: '20px 0 14px', position: 'relative' }}>
          <span style={{ background: '#1e293b', padding: '0 12px', color: '#94a3b8', fontSize: 11, fontWeight: 700, position: 'relative', zIndex: 1 }}>
            O ADMINISTRA, COMPARA PROVEEDORES Y HAZ SEGUIMIENTO EN ERP
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
                  <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 2, fontWeight: 600 }}>
                    ✓ Informes ejecutivos y tablas comparativas de proveedores incluidas
                  </div>
                  {planKey === 'anual' && (
                    <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2, fontWeight: 600 }}>
                      ✓ Edición y creación de APUs + Insumos propios
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: 'white' }}>
                    {formatMoney(p.precio[currency], currency)}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.periodo}</div>
                  <button
                    onClick={() => handleCheckoutPlan(planKey)}
                    disabled={loadingAction !== null}
                    style={{
                      marginTop: 8,
                      background: isDestacado ? '#f59e0b' : '#334155',
                      color: isDestacado ? '#0f172a' : 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Activar Plan
                  </button>
                </div>
              </div>
            );
          })}

          {/* Plan Empresa */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: 14,
            padding: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0' }}>🏢 Plan Grandes Empresas / Constructoras</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Proyectos y usuarios ilimitados + personalización a medida de software.
              </div>
            </div>
            <a
              href="https://wa.me/573177725056?text=Hola,%20deseo%20información%20del%20plan%20empresarial%20de%20Kalarti%20ERP"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-action-secondary"
              style={{ padding: '6px 12px', fontSize: 11, textDecoration: 'none' }}
            >
              Contactar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
