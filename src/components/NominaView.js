'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';

const WORK_DAYS_MONTH = 24;

export default function NominaView() {
  const { state } = useStore();
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  // 1. Filter Asistencias
  const filteredAsistencias = useMemo(() => {
    return state.controlAsistencia.filter(a => {
      const matchProject = !selectedProyectoId || state.presupuestoItems.find(pi => pi.id === a.presupuesto_item_id)?.proyecto_id === selectedProyectoId;
      const matchDateFrom = !dateFrom || a.fecha_hora >= dateFrom;
      const matchDateTo = !dateTo || a.fecha_hora <= dateTo + 'T23:59:59';
      return matchProject && matchDateFrom && matchDateTo;
    });
  }, [state.controlAsistencia, selectedProyectoId, dateFrom, dateTo, state.presupuestoItems]);

  // 2. Pair LLEGADA / SALIDA and calculate hours
  const payrollData = useMemo(() => {
    const workerStats = {};

    // Group by worker
    filteredAsistencias.forEach(a => {
      if (!workerStats[a.cuadrilla_id]) {
        workerStats[a.cuadrilla_id] = { 
          email: a.cuadrilla_id,
          sessions: [],
          totalMs: 0,
          pendingLlegada: null
        };
      }
      
      const stats = workerStats[a.cuadrilla_id];
      if (a.tipo === 'LLEGADA') {
        stats.pendingLlegada = a.fecha_hora;
      } else if (a.tipo === 'SALIDA' && stats.pendingLlegada) {
        const start = new Date(stats.pendingLlegada);
        const end = new Date(a.fecha_hora);
        const diff = end - start;
        if (diff > 0) {
          stats.totalMs += diff;
          stats.sessions.push({ start, end, diff });
        }
        stats.pendingLlegada = null;
      }
    });

    // Calculate money
    return Object.values(workerStats).map(worker => {
      // Búsqueda en la nueva tabla de personal
      const persona = state.personal.find(p => p.email === worker.email);
      const basePay = persona?.salario_base || 0;
      const unity = persona?.unidad_pago || 'Mes';
      
      const hours = worker.totalMs / 3600000;
      let subtotal = 0;
      let rateDescription = '';

      const h_mes = parseFloat(state.config?.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
      const h_dia = parseFloat(state.config?.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;

      if (unity === 'Mes') {
        subtotal = (hours / h_mes) * basePay;
        rateDescription = `${formatCurrency(basePay)}/mes`;
      } else if (unity === 'Día') {
        subtotal = (hours / h_dia) * basePay;
        rateDescription = `${formatCurrency(basePay)}/día`;
      } else {
        subtotal = hours * basePay;
        rateDescription = `${formatCurrency(basePay)}/hr`;
      }

      const cargoAsociado = persona ? state.cargos.find(c => c.id === persona.cargo_id) : null;

      return {
        ...worker,
        totalHours: hours,
        basePay,
        unity,
        subtotal,
        rateDescription,
        insumoNombre: cargoAsociado?.nombre || 'Sin Cargo',
        workerName: persona ? `${persona.nombres || ''} ${persona.apellidos || ''}` : worker.email // Usamos email de fallback
      };
    });
  }, [filteredAsistencias, state.cargos, state.personal]);

  const totalPayroll = payrollData.reduce((acc, w) => acc + w.subtotal, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Liquidación de Nómina</h1>
          <div className="page-header-subtitle">Control de horas trabajadas y pagos de cuadrilla</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary">📄 Exportar PDF</button>
          <button className="btn btn-primary">💰 Confirmar Pagos</button>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: 16 }}>
            <div className="form-group">
              <label className="form-label">Proyecto</label>
              <select className="form-select" value={selectedProyectoId} onChange={(e) => setSelectedProyectoId(e.target.value)}>
                <option value="">Todos los proyectos</option>
                {state.proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Desde</label>
              <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Hasta</label>
              <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--space-md)' }}>
          <div className="stat-card">
            <div className="stat-label">Total a Liquidar</div>
            <div className="currency" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-accent)' }}>{formatCurrency(totalPayroll)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Trabajadores Activos</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{payrollData.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Horas</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{payrollData.reduce((a,w) => a+w.totalHours, 0).toFixed(1)}h</div>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trabajador / Email</th>
                  <th>Insumo / Cargo</th>
                  <th style={{ textAlign: 'right' }}>Salario Mensual</th>
                  <th style={{ textAlign: 'right' }}>Total Horas</th>
                  <th style={{ textAlign: 'right' }}>Valor Hora</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.map(worker => (
                  <tr key={worker.email}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{worker.workerName}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{worker.email} · {worker.sessions.length} sesiones</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{worker.insumoNombre}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{worker.rateDescription}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>Base: {formatCurrency(worker.basePay)}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{worker.totalHours.toFixed(2)} h</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="currency" style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-primary)' }}>{formatCurrency(worker.subtotal)}</span>
                    </td>
                  </tr>
                ))}
                {payrollData.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      No hay registros de asistencia en el periodo seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
