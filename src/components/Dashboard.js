'use client';

import { useStore } from '@/store/StoreContext';

export default function Dashboard() {
  const { state, calcularCostoAPU, calcularPresupuesto, calculateExecutionValue, calculateTotalPayments } = useStore();

  const totalInsumos = state.insumos.length;
  const totalAPUBasicos = state.apus.filter((a) => a.tipo === 'BASICO').length;
  const totalAPUCompuestos = state.apus.filter((a) => a.tipo === 'COMPUESTO').length;
  const totalProyectos = state.proyectos.length;

  // Project health analytics
  const proyectosResumen = state.proyectos.map((p) => {
    const presupuesto = calcularPresupuesto(p.id);
    const execVal = calculateExecutionValue(p.id);
    const payVal = calculateTotalPayments(p.id);
    const budgetTotal = presupuesto.gran_total || 1;
    
    return {
      ...p,
      presupuesto,
      execVal,
      payVal,
      execPct: (execVal / budgetTotal) * 100,
      payPct: (payVal / budgetTotal) * 100,
      balance: payVal - execVal,
      itemCount: state.presupuestoItems.filter((pi) => pi.proyecto_id === p.id).length,
    };
  });

  // Global Inventory (Top 5 materials with most stock across all warehouses)
  const globalInventory = state.insumos.map(insumo => {
    const totalStock = state.inventario
      .filter(t => t.insumo_id === insumo.id)
      .reduce((sum, t) => sum + (t.tipo === 'ENTRADA' ? Number(t.cantidad) : -Number(t.cantidad)), 0);
    return { ...insumo, totalStock };
  }).filter(i => i.totalStock > 0).sort((a,b) => b.totalStock - a.totalStock).slice(0, 5);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const totalPresupuestado = proyectosResumen.reduce((s, p) => s + p.presupuesto.gran_total, 0);
  const totalRecaudado = proyectosResumen.reduce((s, p) => s + p.payVal, 0);
  const totalEjecutado = proyectosResumen.reduce((s, p) => s + p.execVal, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard Ejecutivo</h1>
          <div className="page-header-subtitle">Control 360°: Logística, Finanzas y Ejecución</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <button 
            className="btn btn-primary btn-sm"
            onClick={async () => {
              if(!confirm('¿Deseas generar los datos de prueba E2E?')) return;
              try {
                const toast = (msg) => console.log('Seed:', msg);
                const { supabase } = await import('@/lib/supabase');
                
                // Get UID from session
                const { data: { session } } = await supabase.auth.getSession();
                const uid = session?.user?.id;
                if (!uid) throw new Error('No hay sesión de usuario activa.');

                const ts = Date.now();
                
                // 1. Insumos
                const { data: i1, error: errI1 } = await supabase.from('insumos').insert({ user_id: uid, codigo: 'MAT-E2E-'+ts, nombre: 'Cemento Portland', tipo: 'MATERIAL', unidad: 'Bolsa', precio_unitario: 25000 }).select().single();
                if (errI1 || !i1) throw new Error('Error Insumo 1: ' + (errI1?.message || 'null'));
                const { data: i2, error: errI2 } = await supabase.from('insumos').insert({ user_id: uid, codigo: 'MO-E2E-'+ts, nombre: 'Oficial Albañil', tipo: 'MANO_OBRA', unidad: 'Día', precio_unitario: 80000 }).select().single();
                if (errI2 || !i2) throw new Error('Error Insumo 2: ' + (errI2?.message || 'null'));
                
                // 2. APU
                const { data: a1, error: errA1 } = await supabase.from('apu').insert({ user_id: uid, codigo: 'AB-E2E-'+ts, nombre: 'Muro de Mampostería', tipo: 'BASICO', unidad: 'm2', rendimiento: 10 }).select().single();
                if (errA1 || !a1) throw new Error('Error APU: ' + (errA1?.message || 'null'));
                
                // 3. APU Detalles
                const { error: e3 } = await supabase.from('apu_detalle').insert([
                  { user_id: uid, apu_id: a1.id, insumo_id: i1.id, cantidad: 0.5, desperdicio_pct: 5 },
                  { user_id: uid, apu_id: a1.id, insumo_id: i2.id, cantidad: 0.1, desperdicio_pct: 0 }
                ]);
                if(e3) throw new Error('Error Detalles APU: ' + e3.message);
                
                // 4. Proyecto
                const { data: p1, error: e4 } = await supabase.from('proyectos').insert({ user_id: uid, codigo: 'PRY-E2E-'+ts, nombre: 'Proyecto Prueba End-to-End', cliente: 'Cliente E2E', estado: 'PLANIFICACION', aiu_admin: 10, aiu_imprev: 5, aiu_utilidad: 5 }).select().single();
                if(e4 || !p1) throw new Error('Error Proyecto: ' + (e4?.message || 'null data'));
                
                // 5. Bodega
                const { data: b1, error: e5 } = await supabase.from('bodegas').insert({ user_id: uid, proyecto_id: p1.id, nombre: 'Bodega Principal E2E' }).select().single();
                if(e5 || !b1) throw new Error('Error Bodega: ' + (e5?.message || 'null data'));
                
                // 6. Inventario
                const { error: e6 } = await supabase.from('inventario_transacciones').insert([{ user_id: uid, bodega_id: b1.id, insumo_id: i1.id, tipo: 'ENTRADA', cantidad: 100, motivo: 'Inventario Inicial' }]);
                if(e6) throw new Error('Error Inventario: ' + e6.message);

                // 7. Presupuesto
                const { error: e7 } = await supabase.from('presupuesto_items').insert({ user_id: uid, proyecto_id: p1.id, apu_id: a1.id, cantidad: 50, capitulo: 'OBRA NEGRA', num_cuadrillas: 2, fecha_inicio: new Date().toISOString().split('T')[0] });
                if(e7) throw new Error('Error Presupuesto: ' + e7.message);
                
                // 8. Pago
                const { error: e8 } = await supabase.from('pagos_cliente').insert({ proyecto_id: p1.id, valor_bruto: 1000000, iva: 19, retencion_garantia: 5, valor_neto: 1140000, fecha: new Date().toISOString().split('T')[0] });
                if(e8) throw new Error('Error Pago: ' + e8.message);
                
                alert('¡Datos de prueba generados exitosamente! Por favor refresca la aplicación u oprime "Bodega Móvil".');
                window.location.reload();
              } catch (e) {
                alert('Error generando datos: ' + e.message);
              }
            }}
          >
            🧪 Generar Demo E2E
          </button>
          <div className={`status-badge ${state.isOnline ? 'online' : 'offline'}`}>
            {state.isOnline ? '● Supabase Conectado' : '○ Modo Local / Demo'}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Main Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Inversión Recaudada</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(totalRecaudado)}</div>
            <div className="stat-sub">{((totalRecaudado/totalPresupuestado)*100||0).toFixed(1)}% del total general</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Valor Ejecutado Real</div>
            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{formatCurrency(totalEjecutado)}</div>
            <div className="stat-sub">{((totalEjecutado/totalPresupuestado)*100||0).toFixed(1)}% de avance físico global</div>
          </div>
          <div className="stat-card" style={{ background: 'var(--color-accent)', border: 'none' }}>
            <div className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Presupuesto Consolidado</div>
            <div className="stat-value" style={{ color: '#fff' }}>{formatCurrency(totalPresupuestado)}</div>
            <div className="stat-sub" style={{ color: 'rgba(255,255,255,0.8)' }}>{totalProyectos} proyectos activos</div>
          </div>
        </div>

        {/* Second Row: Charts & Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
          
          {/* Health by Project */}
          <div className="card">
            <div className="card-header"><h3>Balance por Proyecto (Finanzas vs Obra)</h3></div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Físico</th>
                    <th>Financiero (Recaudo)</th>
                    <th>Edo. Caja</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectosResumen.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                      <td>
                        <div style={{ fontSize: 9 }}>{p.execPct.toFixed(1)}%</div>
                        <div style={{ width: 60, height: 4, background: '#eee', borderRadius: 2 }}><div style={{ width: `${p.execPct}%`, height: '100%', background: 'var(--color-warning)' }} /></div>
                      </td>
                      <td>
                        <div style={{ fontSize: 9 }}>{p.payPct.toFixed(1)}%</div>
                        <div style={{ width: 60, height: 4, background: '#eee', borderRadius: 2 }}><div style={{ width: `${p.payPct}%`, height: '100%', background: 'var(--color-success)' }} /></div>
                      </td>
                      <td>
                        <span className="tag" style={{ background: p.balance >= 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)', color: p.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                           {p.balance >= 0 ? 'Saludable' : 'Déficit'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Global Stock Widget */}
          <div className="card">
            <div className="card-header"><h3>Stock Crítico (Consolidado)</h3></div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Insumo</th><th>Unidad</th><th style={{ textAlign: 'right' }}>Total en Bodegas</th></tr>
                </thead>
                <tbody>
                  {globalInventory.map(i => (
                    <tr key={i.id}>
                      <td style={{ fontWeight: 500 }}>{i.nombre}</td>
                      <td>{i.unidad}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)' }}>{i.totalStock.toLocaleString()}</td>
                    </tr>
                  ))}
                  {globalInventory.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', opacity: 0.5, padding: 30 }}>Sin materiales en inventario.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="card">
            <div className="card-header"><h3>Últimos Movimientos de Bodega</h3></div>
            <div style={{ padding: '0 var(--space-md)' }}>
              {state.inventario.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {state.inventario.slice(-5).reverse().map((mov, i) => {
                    const ins = state.insumos.find(ix => ix.id === mov.insumo_id);
                    return (
                      <div key={i} style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 16 }}>{mov.tipo === 'ENTRADA' ? '📥' : '📤'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{ins?.nombre}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{mov.cantidad} {ins?.unidad} • {mov.tipo}</div>
                        </div>
                        <div style={{ fontSize: 9, color: '#94a3b8' }}>{new Date(mov.created_at).toLocaleDateString()}</div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="empty-state" style={{ padding: 30 }}>Sin actividad reciente.</div>}
            </div>
          </div>

          {/* Recent Payments Feed */}
          <div className="card">
            <div className="card-header"><h3>Pagos Recibidos</h3></div>
            <div style={{ padding: '0 var(--space-md)' }}>
              {state.pagos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {state.pagos.slice(-5).reverse().map((p, i) => {
                    const proy = state.proyectos.find(px => px.id === p.proyecto_id);
                    return (
                      <div key={i} style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 16 }}>💰</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{proy?.nombre}</div>
                          <div style={{ fontSize: 10, color: '#16a34a' }}>+{formatCurrency(p.valor_neto)}</div>
                        </div>
                        <div style={{ fontSize: 9, color: '#94a3b8' }}>{new Date(p.fecha).toLocaleDateString()}</div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="empty-state" style={{ padding: 30 }}>Sin pagos registrados.</div>}
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .status-badge { font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
        .status-badge.online { background: #dcfce7; color: #166534; }
        .status-badge.offline { background: #ffedd5; color: #9a3412; }
      `}</style>
    </>
  );
}
