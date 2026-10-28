'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const PLAN_INFO = {
  mensual: { label: 'Plan Mensual', badge: '#3b82f6', dias: 30, maxPry: 1 },
  semestral: { label: 'Plan Semestral', badge: '#8b5cf6', dias: 180, maxPry: 3 },
  anual: { label: 'Plan Anual', badge: '#10b981', dias: 365, maxPry: 6 },
  empresa: { label: 'Plan Empresa', badge: '#f59e0b', dias: 365, maxPry: 999 },
};

const fmtCOP = (val) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(val) || 0);

export default function SuscripcionesView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('suscripciones'); // 'suscripciones' | 'pagos'
  const [suscripciones, setSuscripciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [selectedSub, setSelectedSub] = useState(null);
  const [diasExtender, setDiasExtender] = useState(30);
  const [nuevoPlan, setNuevoPlan] = useState('mensual');
  const [busy, setBusy] = useState(false);
  const [selectedPagoRaw, setSelectedPagoRaw] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      if (!supabase) return;

      const [suscRes, pagosRes, profRes, pryRes] = await Promise.all([
        supabase.from('suscripciones').select('*').order('vence', { ascending: true }),
        supabase.from('pagos_plataforma').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('id, email, nombre, telefono, empresa, ciudad, role'),
        supabase.from('proyectos').select('id, user_id, nombre, estado'),
      ]);

      if (!suscRes.error && suscRes.data) setSuscripciones(suscRes.data);
      if (!pagosRes.error && pagosRes.data) setPagos(pagosRes.data);
      if (!profRes.error && profRes.data) setProfiles(profRes.data);
      if (!pryRes.error && pryRes.data) setProyectos(pryRes.data);
    } catch (e) {
      console.warn('Error cargando suscripciones y pagos:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Mapa de perfiles
  const profileMap = useMemo(() => {
    const map = new Map();
    profiles.forEach((p) => map.set(p.id, p));
    return map;
  }, [profiles]);

  // Contar proyectos por usuario
  const projectCountMap = useMemo(() => {
    const map = new Map();
    proyectos.forEach((p) => {
      if (p.user_id) {
        map.set(p.user_id, (map.get(p.user_id) || 0) + 1);
      }
    });
    return map;
  }, [proyectos]);

  // Métricas financieras
  const metrics = useMemo(() => {
    const ahora = new Date();
    let totalCotizadorExcel = 0;
    let totalPlanesSuscripcion = 0;
    let totalMarketplace = 0;

    pagos.forEach((p) => {
      if (p.estado === 'aprobado' || p.estado_pago === 'APROBADO') {
        const m = Number(p.monto) || 0;
        const prod = String(p.producto || p.tipo_producto || '').toLowerCase();
        if (prod.includes('export') || prod.includes('excel')) {
          totalCotizadorExcel += m;
        } else if (prod.includes('mensual') || prod.includes('semestral') || prod.includes('anual') || prod.includes('plan')) {
          totalPlanesSuscripcion += m;
        } else if (prod.includes('marketplace')) {
          totalMarketplace += m;
        } else {
          totalCotizadorExcel += m;
        }
      }
    });

    const activas = suscripciones.filter((s) => s.estado === 'activa' && new Date(s.vence) > ahora).length;
    const vencidas = suscripciones.filter((s) => s.estado === 'vencida' || new Date(s.vence) <= ahora).length;

    return {
      totalCotizadorExcel,
      totalPlanesSuscripcion,
      totalMarketplace,
      totalRecaudado: totalCotizadorExcel + totalPlanesSuscripcion + totalMarketplace,
      activas,
      vencidas,
      totalSuscriptores: suscripciones.length,
    };
  }, [pagos, suscripciones]);

  // Filtro de suscripciones
  const filteredSubs = useMemo(() => {
    const ahora = new Date();
    return suscripciones.filter((s) => {
      const prof = profileMap.get(s.user_id);
      const str = `${prof?.nombre || ''} ${prof?.email || ''} ${prof?.empresa || ''} ${s.plan || ''} ${s.pasarela_ref || ''}`.toLowerCase();
      const matchSearch = !search || str.includes(search.toLowerCase());

      const isVencida = s.estado === 'vencida' || new Date(s.vence) <= ahora;
      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activas' && s.estado === 'activa' && !isVencida) ||
        (filtroEstado === 'vencidas' && isVencida);

      return matchSearch && matchEstado;
    });
  }, [suscripciones, search, filtroEstado, profileMap]);

  // Filtro de pagos
  const filteredPagos = useMemo(() => {
    return pagos.filter((p) => {
      const prof = profileMap.get(p.user_id);
      const str = `${p.user_email || ''} ${prof?.email || ''} ${prof?.nombre || ''} ${p.producto || ''} ${p.tipo_producto || ''} ${p.referencia || ''} ${p.pasarela_ref || ''}`.toLowerCase();
      return !search || str.includes(search.toLowerCase());
    });
  }, [pagos, search, profileMap]);

  // Extender vigencia manual
  const handleExtenderVigencia = async () => {
    if (!selectedSub || !supabase) return;
    setBusy(true);
    try {
      const ahora = new Date();
      const base = selectedSub.vence && new Date(selectedSub.vence) > ahora ? new Date(selectedSub.vence) : ahora;
      const nuevaVence = new Date(base.getTime() + Number(diasExtender) * 24 * 60 * 60 * 1000);

      const planConfig = PLAN_INFO[nuevoPlan] || PLAN_INFO.mensual;

      const { error } = await supabase
        .from('suscripciones')
        .update({
          plan: nuevoPlan,
          estado: 'activa',
          vence: nuevaVence.toISOString(),
          max_proyectos: planConfig.maxPry,
          puede_editar_apu: nuevoPlan === 'anual' || nuevoPlan === 'empresa',
          updated_at: ahora.toISOString(),
        })
        .eq('id', selectedSub.id);

      if (error) throw error;

      alert(`✅ Suscripción extendida por +${diasExtender} días (Plan ${nuevoPlan.toUpperCase()}).`);
      setSelectedSub(null);
      cargarDatos();
    } catch (err) {
      alert('Error extendiendo suscripción: ' + (err.message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Cabecera */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>⚡ Suscripciones & Compras del Cotizador</h1>
          <div className="page-header-subtitle">
            Control de suscriptores del ERP, pagos recibidos por Mercado Pago y descargas de presupuesto
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={cargarDatos} disabled={loading}>
          🔄 Actualizar
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: 16, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Recaudo Total Plataforma
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
            {fmtCOP(metrics.totalRecaudado)}
          </div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>
            Cotizador: {fmtCOP(metrics.totalCotizadorExcel)} • Planes: {fmtCOP(metrics.totalPlanesSuscripcion)}
          </div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Suscriptores Activos
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#2563eb', marginTop: 4 }}>
            {metrics.activas} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>empresas</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {metrics.vencidas} vencidas o por renovar
          </div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Descargas Excel de Obra ($19.900)
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#d97706', marginTop: 4 }}>
            {Math.round(metrics.totalCotizadorExcel / 19900)} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>archivos</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Generadas desde el Cotizador Web
          </div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Pasarela de Pago
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>💳</span> Mercado Pago Checkout Pro
          </div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
            ✓ Webhook conectado y activo
          </div>
        </div>
      </div>

      {/* Tabs y Búsqueda */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`btn btn-sm ${activeTab === 'suscripciones' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('suscripciones')}
          >
            ⚡ Suscriptores ERP ({filteredSubs.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'pagos' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('pagos')}
          >
            📋 Historial de Pagos & Cotizador ({filteredPagos.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeTab === 'suscripciones' && (
            <select
              className="form-select"
              style={{ fontSize: 12, padding: '4px 8px', height: 32 }}
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="activas">Solo Activas</option>
              <option value="vencidas">Solo Vencidas</option>
            </select>
          )}

          <input
            type="text"
            className="form-input"
            style={{ width: 220, fontSize: 12, height: 32 }}
            placeholder="Buscar por cliente, correo o ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TAB 1: SUSCRIPCIONES */}
      {activeTab === 'suscripciones' && (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="table" style={{ margin: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th>Cliente / Empresa</th>
                <th>Plan Contratado</th>
                <th>Vigencia / Fecha Corte</th>
                <th>Proyectos (Uso / Máx)</th>
                <th>Permiso APU</th>
                <th>Ref Mercado Pago</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    Cargando suscriptores de Supabase...
                  </td>
                </tr>
              ) : filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>
                    No se encontraron suscriptores con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((s) => {
                  const prof = profileMap.get(s.user_id);
                  const ahora = new Date();
                  const fechaVence = new Date(s.vence);
                  const diffDias = Math.ceil((fechaVence - ahora) / (1000 * 60 * 60 * 24));
                  const isActiva = s.estado === 'activa' && diffDias > 0;
                  const planData = PLAN_INFO[s.plan] || PLAN_INFO.mensual;
                  const pryCount = projectCountMap.get(s.user_id) || 0;

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {prof?.nombre || prof?.empresa || 'Cliente Registrado'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {prof?.email || 'Sin correo'} {prof?.telefono ? `• ${prof.telefono}` : ''}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: `${planData.badge}18`,
                            color: planData.badge,
                          }}
                        >
                          {planData.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fechaVence.toLocaleDateString('es-CO')}</div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 6,
                            background: isActiva ? '#dcfce7' : '#fee2e2',
                            color: isActiva ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {isActiva ? `🟢 Quedan ${diffDias} días` : `🔴 Vencida hace ${Math.abs(diffDias)} días`}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: pryCount >= s.max_proyectos ? '#b45309' : '#0f172a' }}>
                          {pryCount} / {s.max_proyectos}
                        </span>
                        <div style={{ fontSize: 10, color: '#64748b' }}>obras activas</div>
                      </td>
                      <td>
                        {s.puede_editar_apu ? (
                          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Personalizados</span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Solo lectura</span>
                        )}
                      </td>
                      <td>
                        <code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 5px', borderRadius: 4 }}>
                          {s.pasarela_ref || s.proveedor || 'mercadopago'}
                        </code>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => {
                            setSelectedSub(s);
                            setNuevoPlan(s.plan || 'mensual');
                            setDiasExtender(30);
                          }}
                        >
                          ⚙️ Gestionar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: PAGOS Y COTIZADOR */}
      {activeTab === 'pagos' && (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="table" style={{ margin: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th>Fecha</th>
                <th>Producto / Concepto</th>
                <th>Cliente / Correo</th>
                <th>Valor COP</th>
                <th>Medio</th>
                <th>Estado</th>
                <th>Referencia MP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    Cargando transacciones...
                  </td>
                </tr>
              ) : filteredPagos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>
                    No hay transacciones registradas.
                  </td>
                </tr>
              ) : (
                filteredPagos.map((p) => {
                  const prof = profileMap.get(p.user_id);
                  const fecha = new Date(p.created_at || p.updated_at);
                  const isAprobado = p.estado === 'aprobado' || p.estado_pago === 'APROBADO';

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div>{fecha.toLocaleDateString('es-CO')}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>
                          {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {String(p.producto || p.tipo_producto || '').toUpperCase().includes('EXPORT')
                            ? '📊 Exportación Presupuesto Excel'
                            : String(p.producto || p.tipo_producto || '').toUpperCase().includes('PLAN') || ['mensual', 'semestral', 'anual'].includes(p.producto)
                            ? `⚡ Plan ${String(p.producto || p.tipo_producto).toUpperCase()}`
                            : p.producto || 'Marketplace'}
                        </div>
                        {p.referencia_id && (
                          <div style={{ fontSize: 10, color: '#64748b' }}>Ref: {p.referencia_id}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.user_email || prof?.email || 'Cliente Anónimo'}</div>
                        {prof?.nombre && <div style={{ fontSize: 10, color: '#64748b' }}>{prof.nombre}</div>}
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        {fmtCOP(p.monto || p.monto_cop)}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, background: '#eff6ff', color: '#1e40af', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                          Mercado Pago
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: isAprobado ? '#dcfce7' : '#fef3c7',
                            color: isAprobado ? '#15803d' : '#92400e',
                          }}
                        >
                          {isAprobado ? '✓ Aprobado' : p.estado || 'Pendiente'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, padding: '2px 6px' }}
                          onClick={() => setSelectedPagoRaw(p)}
                        >
                          🔍 {p.transaccion_id || p.pasarela_ref || 'Detalles'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Gestionar Suscripción */}
      {selectedSub && (
        <div className="modal-overlay" onClick={() => setSelectedSub(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ Gestionar Suscripción</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedSub(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12 }}>
                <div><strong>Cliente:</strong> {profileMap.get(selectedSub.user_id)?.email || selectedSub.user_id}</div>
                <div><strong>Vence actual:</strong> {new Date(selectedSub.vence).toLocaleDateString('es-CO')}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Plan</label>
                <select
                  className="form-select"
                  value={nuevoPlan}
                  onChange={(e) => setNuevoPlan(e.target.value)}
                >
                  <option value="mensual">Plan Mensual (1 proyecto, 2 usuarios)</option>
                  <option value="semestral">Plan Semestral (3 proyectos, 4 usuarios)</option>
                  <option value="anual">Plan Anual (6 proyectos, APU editable)</option>
                  <option value="empresa">Plan Empresa (Ilimitado)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Extender Vigencia (+ Días de Gracia / Cortesía / Renovación)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[15, 30, 90, 180, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`btn btn-sm ${diasExtender === d ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setDiasExtender(d)}
                    >
                      +{d}d
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedSub(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleExtenderVigencia} disabled={busy}>
                {busy ? 'Guardando...' : `Guardar y Extender +${diasExtender} días`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver Detalles del Pago */}
      {selectedPagoRaw && (
        <div className="modal-overlay" onClick={() => setSelectedPagoRaw(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalles de Transacción Mercado Pago</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedPagoRaw(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <pre
                style={{
                  background: '#0f172a',
                  color: '#38bdf8',
                  padding: 14,
                  borderRadius: 8,
                  fontSize: 11,
                  maxHeight: 320,
                  overflowY: 'auto',
                }}
              >
                {JSON.stringify(selectedPagoRaw, null, 2)}
              </pre>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedPagoRaw(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
