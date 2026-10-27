'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { insumoCotizacionesService } from '@/lib/services';
import { crearContexto } from '@/lib/apu-engine';
import {
  requerimientosDesdePresupuesto,
  resolverAbastecimiento,
  calcularStockBodegas,
  consumosPorInsumo,
  fechaPedido,
  leerFlete,
  mensajeWhatsApp,
  linkWhatsApp,
  generarNumeroOrden,
  movimientosRecepcion,
  eventosAgendaOrden,
  ESTADOS_ORDEN,
  ESTADO_ORDEN_LABEL,
} from '@/lib/compras-engine';

const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);
const fmtQ = (v) => (Number(v) || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
const fmtD = (s) => (s ? new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const hoyISO = () => new Date().toISOString().split('T')[0];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ABIERTAS = (o) => !['RECIBIDO', 'ENTREGADO', 'CANCELADO', 'entregada', 'cancelada'].includes(o.estado);

const ESTADO_COLOR = {
  BORRADOR: ['#f1f5f9', '#475569'],
  PENDIENTE_CONTACTO: ['#fef3c7', '#92400e'],
  CONFIRMADO_CON_PROVEEDOR: ['#dbeafe', '#1e40af'],
  EN_RUTA: ['#ede9fe', '#5b21b6'],
  RECIBIDO: ['#dcfce7', '#166534'],
  CANCELADO: ['#fee2e2', '#991b1b'],
};

/** Dirección de entrega de la obra */
export function direccionObra(bodega, proyecto) {
  return bodega?.direccion || proyecto?.direccion || proyecto?.ubicacion || '';
}

export default function AbastecimientoObraView({ proyectoId }) {
  const { state, dispatch } = useStore();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargandoCot, setCargandoCot] = useState(true);
  const [soloFaltantes, setSoloFaltantes] = useState(true);
  const [seleccion, setSeleccion] = useState({}); // key -> true
  const [opcion, setOpcion] = useState({}); // key -> 'TRASLADO' | 'COMPRA'
  const [solicitar, setSolicitar] = useState({}); // key -> cantidad a pedir (solicitud parcial)
  const [editOrden, setEditOrden] = useState(null);

  const proyecto = state.proyectos.find((p) => p.id === proyectoId);
  const bodega = state.bodegas.find((b) => b.proyecto_id === proyectoId);
  const direccion = direccionObra(bodega, proyecto);

  useEffect(() => {
    let vivo = true;
    insumoCotizacionesService.getAll({ soloVigentes: true })
      .then((data) => { if (vivo) setCotizaciones(data || []); })
      .finally(() => { if (vivo) setCargandoCot(false); });
    return () => { vivo = false; };
  }, []);

  const ctx = useMemo(() => crearContexto({
    insumos: state.insumos,
    cargos: state.cargos,
    cargoDetalles: state.cargoDetalles,
    apuDetalles: state.apuDetalles,
    config: state.config,
    ofertas: state.mkOfertas,
  }), [state.insumos, state.cargos, state.cargoDetalles, state.apuDetalles, state.config, state.mkOfertas]);

  const flete = useMemo(() => leerFlete(state.config), [state.config]);

  const stock = useMemo(() => calcularStockBodegas({
    inventario: state.inventario,
    ordenes: state.ordenesCompra,
    insumos: state.insumos,
    bodegas: state.bodegas,
  }), [state.inventario, state.ordenesCompra, state.insumos, state.bodegas]);

  const requerimientos = useMemo(() => requerimientosDesdePresupuesto({
    items: state.presupuestoItems.filter((i) => i.proyecto_id === proyectoId),
    ctx,
    apus: state.apus,
  }), [state.presupuestoItems, proyectoId, ctx, state.apus]);

  // Órdenes del proyecto (entrantes) y traslados salientes desde esta bodega
  const ordenesProyecto = useMemo(() => (state.ordenesCompra || []).filter((o) =>
    (o.proyecto_id === proyectoId || (bodega && o.bodega_destino_id === bodega.id)) && o.tipo !== 'DROPSHIPPING'
  ).sort((a, b) => String(a.fecha_programada || '').localeCompare(String(b.fecha_programada || ''))), [state.ordenesCompra, proyectoId, bodega]);
  const trasladosSalientes = useMemo(() => (state.ordenesCompra || []).filter((o) =>
    bodega && o.tipo === 'TRASLADO' && o.bodega_origen_id === bodega.id && o.proyecto_id !== proyectoId
  ), [state.ordenesCompra, bodega, proyectoId]);

  // Consumo ya imputado a partidas en esta obra (cuenta como abastecido)
  const consumos = useMemo(
    () => consumosPorInsumo({ inventario: state.inventario, bodegaId: bodega?.id }),
    [state.inventario, bodega]
  );

  // Filas: requerimiento − (existencias + en tránsito + consumo imputado), con recomendación
  const filas = useMemo(() => {
    const pool = new Map();
    consumos.forEach((cant, insumoId) => pool.set(insumoId, cant));
    stock.filter((s) => bodega && s.bodega_id === bodega.id).forEach((s) => pool.set(s.insumo_id, (pool.get(s.insumo_id) || 0) + Math.max(0, Number(s.disponible) || 0)));
    ordenesProyecto.filter(ABIERTAS).forEach((o) => (o.items || []).forEach((it) => {
      if (it?.insumo_id) pool.set(it.insumo_id, (pool.get(it.insumo_id) || 0) + (Number(it.cantidad) || 0));
    }));
    // Disponible de otras obras, descontado a medida que se recomiendan traslados
    const stockRed = stock.map((s) => ({ ...s }));
    return requerimientos.map((req) => {
      const disp = pool.get(req.insumo_id) || 0;
      const cubierto = Math.min(disp, req.cantidad);
      pool.set(req.insumo_id, disp - cubierto);
      const faltante = Math.round((req.cantidad - cubierto) * 10000) / 10000;
      const res = faltante > 0
        ? resolverAbastecimiento({ requerimiento: { ...req, cantidad: faltante }, bodegaDestino: bodega, stock: stockRed, cotizaciones, proveedores: state.proveedores, flete })
        : null;
      if (res?.recomendacion === 'TRASLADO' && res.traslado) {
        const fila = stockRed.find((s) => s.bodega_id === res.traslado.bodega_origen_id && s.insumo_id === req.insumo_id);
        if (fila) fila.disponible = Number(fila.disponible) - res.traslado.cantidad;
      }
      const lead = res?.recomendacion === 'TRASLADO' ? 1 : (res?.compra?.tiempo_entrega_dias ?? 2);
      return { ...req, cubierto, faltante, res, fecha_pedido: fechaPedido(req.fecha_necesidad, lead) };
    });
  }, [requerimientos, stock, consumos, ordenesProyecto, bodega, cotizaciones, state.proveedores, flete]);

  // Cantidad a solicitar por fila (por defecto el saldo pendiente) y faltante restante en pantalla
  const cantSolicitar = (f) => {
    const v = solicitar[f.key];
    if (v === undefined || v === '') return f.faltante;
    return Math.min(Math.max(Number(v) || 0, 0), f.faltante);
  };
  const faltanteRestante = (f) => Math.max(0, Math.round((f.faltante - cantSolicitar(f)) * 10000) / 10000);

  const filasVisibles = soloFaltantes ? filas.filter((f) => f.faltante > 0) : filas;
  const opcionDe = (f) => opcion[f.key] || f.res?.recomendacion;

  const resumen = useMemo(() => {
    const fletes = ordenesProyecto.filter((o) => o.estado !== 'CANCELADO').reduce((s, o) => s + (Number(o.costo_transporte) || 0), 0);
    const material = ordenesProyecto.filter((o) => o.estado !== 'CANCELADO').reduce((s, o) => s + (Number(o.costo_material) || Number(o.total) || 0), 0);
    const ahorro = filas.reduce((s, f) => s + (f.res?.recomendacion === 'TRASLADO' ? Math.max(0, f.res.comparativo.ahorro || 0) : 0), 0);
    return { fletes, material, ahorro, pendientes: filas.filter((f) => f.faltante > 0).length };
  }, [ordenesProyecto, filas]);

  /* ─── Creación de órdenes ─── */

  const crearOrden = (orden) => {
    dispatch({ type: 'ADD_ORDEN_COMPRA', payload: orden });
    eventosAgendaOrden(orden, { bodegas: state.bodegas }).forEach((ev) => dispatch({ type: 'ADD_POS_AGENDA', payload: ev }));
  };

  const aprobar = (filasSel) => {
    if (!bodega) return alert('El proyecto no tiene bodega de obra.');
    const compras = new Map();
    const traslados = new Map();
    const aprobadas = [];
    const addCompra = (f, compra, cantidad) => {
      if (!compra || cantidad <= 0) return;
      const key = `${compra.proveedor_id || compra.proveedor_nombre}__${f.fecha_necesidad}`;
      if (!compras.has(key)) compras.set(key, { compra, fecha_necesidad: f.fecha_necesidad, fecha_pedido: fechaPedido(f.fecha_necesidad, compra.tiempo_entrega_dias), items: [] });
      compras.get(key).items.push({ insumo_id: f.insumo_id, nombre: f.nombre, unidad: f.unidad, cantidad, precio: compra.precio });
    };
    filasSel.forEach((f) => {
      const r = f.res;
      if (!r) return;
      const aSolicitar = cantSolicitar(f);
      if (aSolicitar <= 0) return;
      aprobadas.push(f.key);
      const op = opcionDe(f);
      if (op === 'TRASLADO' && r.traslado) {
        const t = r.traslado;
        // La orden se emite solo por lo solicitado: primero traslado, el resto por compra
        const qTraslado = Math.min(t.cantidad, aSolicitar);
        const qCompra = Math.round((aSolicitar - qTraslado) * 10000) / 10000;
        const key = `${t.bodega_origen_id}__${f.fecha_necesidad}`;
        if (!traslados.has(key)) traslados.set(key, { t, fecha_necesidad: f.fecha_necesidad, items: [], comparativo: [], flete: 0 });
        const g = traslados.get(key);
        g.flete += Math.round((Number(t.flete) || 0) * (t.cantidad > 0 ? qTraslado / t.cantidad : 1));
        g.items.push({ insumo_id: f.insumo_id, nombre: f.nombre, unidad: f.unidad, cantidad: qTraslado, precio: t.costo_unitario });
        g.comparativo.push({ insumo_id: f.insumo_id, nombre: f.nombre, ...r.comparativo, proveedor_alternativo: r.compra?.proveedor_nombre || null });
        const compraResto = r.faltante?.compra || r.compra;
        if (qCompra > 0 && compraResto) addCompra(f, compraResto, qCompra);
      } else if (r.compra) {
        addCompra(f, r.compra, aSolicitar);
      }
    });

    let n = 0;
    compras.forEach((g) => {
      const total = Math.round(g.items.reduce((s, i) => s + i.cantidad * i.precio, 0));
      crearOrden({
        id: crypto.randomUUID(),
        numero_orden: generarNumeroOrden('OC'),
        tipo: 'ABASTECIMIENTO_OBRA',
        proyecto_id: proyectoId,
        proveedor_id: UUID_RE.test(String(g.compra.proveedor_id || '')) ? g.compra.proveedor_id : null,
        proveedor_nombre: g.compra.proveedor_nombre || 'Proveedor',
        contacto_whatsapp: g.compra.whatsapp || null,
        direccion_entrega: [direccion, bodega.municipio].filter(Boolean).join(', '),
        bodega_destino_id: bodega.id,
        items: g.items,
        total,
        costo_material: total,
        estado: 'BORRADOR',
        fecha_programada: g.fecha_pedido || g.fecha_necesidad,
        fecha_entrega_esperada: g.fecha_necesidad,
        notas: g.compra.sin_cotizacion ? 'Sin cotización vigente: precio de referencia del catálogo.' : null,
      });
      n++;
    });
    traslados.forEach((g) => {
      const origen = state.bodegas.find((b) => b.id === g.t.bodega_origen_id);
      const costoMaterial = Math.round(g.items.reduce((s, i) => s + i.cantidad * i.precio, 0));
      const costoTransporte = g.flete;
      crearOrden({
        id: crypto.randomUUID(),
        numero_orden: generarNumeroOrden('TR'),
        tipo: 'TRASLADO',
        proyecto_id: proyectoId,
        proveedor_nombre: `Traslado desde ${origen?.nombre || 'otra obra'}`,
        bodega_origen_id: g.t.bodega_origen_id,
        bodega_destino_id: bodega.id,
        direccion_entrega: [direccion, bodega.municipio].filter(Boolean).join(', '),
        requiere_flete: true,
        costo_transporte: costoTransporte,
        transportador: null,
        items: g.items,
        costo_material: costoMaterial,
        total: costoMaterial + costoTransporte,
        comparativo: { items: g.comparativo, flete_estimado: costoTransporte },
        estado: 'BORRADOR',
        fecha_programada: fechaPedido(g.fecha_necesidad, 1),
        fecha_entrega_esperada: g.fecha_necesidad,
      });
      n++;
    });
    setSeleccion({});
    setSolicitar((s) => { const next = { ...s }; aprobadas.forEach((k) => delete next[k]); return next; });
    if (n === 0) alert('No hay opciones de abastecimiento para los ítems seleccionados.');
  };

  /* ─── Ciclo de vida de la orden ─── */

  const actualizarOrden = (orden, changes) => dispatch({ type: 'UPDATE_ORDEN_COMPRA', payload: { id: orden.id, ...changes } });

  const recibir = (orden) => {
    if ((state.inventario || []).some((m) => m.orden_compra_id === orden.id)) {
      actualizarOrden(orden, { estado: 'RECIBIDO' });
      return;
    }
    if (!orden.bodega_destino_id) return alert('La orden no tiene bodega destino.');
    if (orden.tipo === 'TRASLADO' && !orden.bodega_origen_id) return alert('El traslado no tiene bodega de origen.');
    const movs = movimientosRecepcion(orden);
    if (movs.length === 0) return alert('La orden no tiene ítems con insumo vinculado.');
    if (!confirm(`¿Confirmar recepción de ${orden.numero_orden}? Se registrarán ${movs.length} movimientos de inventario.`)) return;
    movs.forEach((m) => dispatch({ type: 'ADD_INVENTARIO_MOV', payload: m }));
    actualizarOrden(orden, { estado: 'RECIBIDO' });
    (state.posAgenda || [])
      .filter((a) => a.orden_compra_id === orden.id && a.estado !== 'completado')
      .forEach((a) => dispatch({ type: 'UPDATE_POS_AGENDA', payload: { id: a.id, estado: 'completado' } }));
  };

  const cambiarEstado = (orden, estado) => {
    if (estado === orden.estado) return;
    if (estado === 'RECIBIDO') return recibir(orden);
    if (estado === 'CANCELADO') {
      if (!confirm(`¿Cancelar ${orden.numero_orden}?`)) return;
      (state.posAgenda || [])
        .filter((a) => a.orden_compra_id === orden.id && a.estado !== 'completado')
        .forEach((a) => dispatch({ type: 'UPDATE_POS_AGENDA', payload: { id: a.id, estado: 'cancelado' } }));
    }
    actualizarOrden(orden, { estado });
  };

  const siguienteEstado = (estado) => {
    const i = ESTADOS_ORDEN.indexOf(estado);
    if (i < 0) return 'PENDIENTE_CONTACTO';
    return i < ESTADOS_ORDEN.indexOf('RECIBIDO') ? ESTADOS_ORDEN[i + 1] : null;
  };

  const mensajeOrden = (orden) => mensajeWhatsApp({
    proveedor: orden.proveedor_nombre,
    items: orden.items,
    direccion: direccion || orden.direccion_entrega,
    municipio: bodega?.municipio,
    numeroOrden: orden.numero_orden,
  });

  const enviarWhatsApp = (orden) => {
    const url = linkWhatsApp(orden.contacto_whatsapp, mensajeOrden(orden));
    if (!url) {
      const tel = prompt('El proveedor no tiene WhatsApp registrado. Ingresa el número:');
      if (!tel) return;
      actualizarOrden(orden, { contacto_whatsapp: tel });
      window.open(linkWhatsApp(tel, mensajeOrden(orden)), '_blank');
    } else {
      window.open(url, '_blank');
    }
    if (orden.estado === 'BORRADOR' || !ESTADOS_ORDEN.includes(orden.estado)) actualizarOrden(orden, { estado: 'PENDIENTE_CONTACTO' });
  };

  const guardarEdicion = () => {
    const o = editOrden;
    const costoTransporte = Number(o.costo_transporte) || 0;
    const costoMaterial = Number(o.costo_material) || 0;
    actualizarOrden(o, {
      costo_transporte: costoTransporte,
      transportador: o.transportador || null,
      contacto_whatsapp: o.contacto_whatsapp || null,
      requiere_flete: costoTransporte > 0,
      total: o.tipo === 'TRASLADO' ? costoMaterial + costoTransporte : o.total,
      fecha_programada: o.fecha_programada,
      fecha_entrega_esperada: o.fecha_entrega_esperada,
    });
    setEditOrden(null);
  };

  /* ─── Render ─── */

  if (!bodega) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="empty-state-icon">📦</div>
        <h3>Este proyecto aún no tiene bodega de obra</h3>
        <p>La bodega se crea automáticamente con el proyecto. Configúrala en la pestaña Bodega de obra.</p>
      </div>
    );
  }

  const seleccionadas = filasVisibles.filter((f) => seleccion[f.key] && f.res && f.res.recomendacion !== 'SIN_FUENTE');
  const nombreBodega = (id) => state.bodegas.find((b) => b.id === id)?.nombre || 'Bodega';

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Abastecimiento de obra</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Requerimientos según el presupuesto programado. Primero se usa el disponible de otras obras; si no conviene, compra al mejor proveedor.
          </p>
          <p style={{ fontSize: 12, color: direccion ? '#475569' : '#b45309', marginTop: 4 }}>
            📍 Entrega en: {direccion ? `${direccion}, ${bodega.municipio || ''}` : `Sin dirección registrada (${bodega.municipio || 'municipio sin definir'}) — complétala en Bodega de obra.`}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(130px, 1fr))', gap: 10 }}>
          <Kpi label="Ítems por abastecer" value={resumen.pendientes} />
          <Kpi label="Ahorro por traslados" value={fmt(resumen.ahorro)} color="#16a34a" />
          <Kpi label="Transporte del proyecto" value={fmt(resumen.fletes)} color="#ea580c" />
        </div>
      </div>

      {/* Requerimientos */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3>Requerimientos por fecha</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {cargandoCot && <span style={{ fontSize: 11, color: '#94a3b8' }}>Cargando cotizaciones…</span>}
            <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={soloFaltantes} onChange={(e) => setSoloFaltantes(e.target.checked)} /> Solo faltantes
            </label>
            <button className="btn btn-primary btn-sm" disabled={seleccionadas.length === 0} onClick={() => aprobar(seleccionadas)}>
              Aprobar seleccionados ({seleccionadas.length})
            </button>
          </div>
        </div>
        <div className="table-container" style={{ maxHeight: 460, overflowY: 'auto' }}>
          <table className="data-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 30 }}>
                  <input
                    type="checkbox"
                    checked={filasVisibles.some((f) => f.res) && filasVisibles.filter((f) => f.res && f.res.recomendacion !== 'SIN_FUENTE').every((f) => seleccion[f.key])}
                    onChange={(e) => {
                      const next = {};
                      if (e.target.checked) filasVisibles.forEach((f) => { if (f.res && f.res.recomendacion !== 'SIN_FUENTE') next[f.key] = true; });
                      setSeleccion(next);
                    }}
                  />
                </th>
                <th>Material</th>
                <th style={{ textAlign: 'right' }}>Requerido</th>
                <th style={{ textAlign: 'right' }} title="Existencias + en tránsito + consumo imputado a partidas">Cubierto</th>
                <th style={{ textAlign: 'right' }}>A solicitar</th>
                <th style={{ textAlign: 'right' }}>Faltante</th>
                <th>Necesidad</th>
                <th>Pedir el</th>
                <th>Recomendación</th>
                <th>Comparativo</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filasVisibles.length === 0 ? (
                <tr><td colSpan="11" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  {requerimientos.length === 0 ? 'No hay ítems de presupuesto con fecha de inicio y materiales.' : 'Todos los requerimientos están cubiertos.'}
                </td></tr>
              ) : filasVisibles.map((f) => {
                const r = f.res;
                const op = opcionDe(f);
                const vencida = f.fecha_pedido && f.fecha_pedido < hoyISO() && f.faltante > 0;
                return (
                  <tr key={f.key}>
                    <td>
                      {r && r.recomendacion !== 'SIN_FUENTE' && (
                        <input type="checkbox" checked={!!seleccion[f.key]} onChange={(e) => setSeleccion((s) => ({ ...s, [f.key]: e.target.checked }))} />
                      )}
                    </td>
                    <td title={f.actividades.map((a) => `${a.nombre}: ${fmtQ(a.cantidad)}`).join('\n')}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{f.nombre}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{f.actividades.length} actividad(es) · {f.unidad}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtQ(f.cantidad)}</td>
                    <td style={{ textAlign: 'right', color: '#16a34a' }}>{fmtQ(f.cubierto)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {f.faltante > 0 ? (
                        <input
                          type="number" min="0" max={f.faltante} step="any"
                          className="form-input"
                          style={{ width: 84, textAlign: 'right', fontSize: 12, padding: '2px 6px' }}
                          value={solicitar[f.key] ?? f.faltante}
                          onChange={(e) => setSolicitar((s) => ({ ...s, [f.key]: e.target.value }))}
                        />
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: faltanteRestante(f) > 0 ? '#b91c1c' : '#16a34a' }}>{fmtQ(faltanteRestante(f))}</td>
                    <td>{fmtD(f.fecha_necesidad)}</td>
                    <td style={{ color: vencida ? '#b91c1c' : undefined, fontWeight: vencida ? 700 : 400 }}>{f.faltante > 0 ? fmtD(f.fecha_pedido) : '—'}</td>
                    <td>
                      {!r ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Cubierto</span>
                        : r.recomendacion === 'SIN_FUENTE' ? <span style={{ color: '#b45309' }}>Sin proveedor ni stock</span>
                        : (
                          <div>
                            {r.traslado && r.compra ? (
                              <select className="form-select" style={{ fontSize: 11, padding: '2px 6px', width: 'auto' }} value={op} onChange={(e) => setOpcion((o) => ({ ...o, [f.key]: e.target.value }))}>
                                <option value="TRASLADO">Traslado{r.recomendacion === 'TRASLADO' ? ' ★' : ''}</option>
                                <option value="COMPRA">Compra{r.recomendacion === 'COMPRA' ? ' ★' : ''}</option>
                              </select>
                            ) : <strong>{op === 'TRASLADO' ? 'Traslado' : 'Compra'}</strong>}
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                              {op === 'TRASLADO' && r.traslado
                                ? `${fmtQ(r.traslado.cantidad)} desde ${nombreBodega(r.traslado.bodega_origen_id)}${r.faltante ? ` + compra ${fmtQ(r.faltante.cantidad)}` : ''}`
                                : `${r.compra?.proveedor_nombre || '—'} · ${fmt(r.compra?.precio)}/${f.unidad}${r.compra?.sin_cotizacion ? ' (ref.)' : ''}`}
                            </div>
                          </div>
                        )}
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {r?.traslado ? (
                        <div>
                          <div>Traslado: {fmt(r.comparativo.traslado)}</div>
                          <div>Compra: {r.comparativo.compra === null ? '—' : fmt(r.comparativo.compra)}</div>
                          {r.comparativo.compra !== null && (
                            <div style={{ fontWeight: 700, color: r.comparativo.ahorro >= 0 ? '#16a34a' : '#b91c1c' }}>
                              {r.comparativo.ahorro >= 0 ? 'Ahorro' : 'Sobrecosto'} {fmt(Math.abs(r.comparativo.ahorro))}
                            </div>
                          )}
                        </div>
                      ) : r?.compra ? <div>Compra: {fmt(r.compra.total)}</div> : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {r && r.recomendacion !== 'SIN_FUENTE' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => aprobar([f])}>Aprobar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Órdenes */}
      <div className="card">
        <div className="card-header"><h3>Órdenes de compra y traslados</h3></div>
        <div className="table-container">
          <table className="data-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Proveedor / Origen</th>
                <th>Ítems</th>
                <th>Pedir el</th>
                <th>Entrega</th>
                <th style={{ textAlign: 'right' }}>Material</th>
                <th style={{ textAlign: 'right' }}>Transporte</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenesProyecto.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>Aún no hay órdenes para este proyecto.</td></tr>
              ) : ordenesProyecto.map((o) => (
                <FilaOrden
                  key={o.id}
                  orden={o}
                  nombreBodega={nombreBodega}
                  siguiente={siguienteEstado(o.estado)}
                  onEstado={(e) => cambiarEstado(o, e)}
                  onWhatsApp={() => enviarWhatsApp(o)}
                  onEditar={() => setEditOrden({ ...o })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {trasladosSalientes.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Traslados que salen de esta obra</h3></div>
          <div className="table-container">
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr><th>Orden</th><th>Destino</th><th>Ítems</th><th>Retiro</th><th style={{ textAlign: 'right' }}>Costo material</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {trasladosSalientes.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.numero_orden}</td>
                    <td>{nombreBodega(o.bodega_destino_id)}</td>
                    <td>{(o.items || []).map((i) => `${fmtQ(i.cantidad)} ${i.unidad || ''} ${i.nombre || ''}`).join(', ')}</td>
                    <td>{fmtD(o.fecha_programada)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(o.costo_material)}</td>
                    <td><EstadoBadge estado={o.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editOrden && (
        <div className="modal-overlay" onClick={() => setEditOrden(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Editar {editOrden.numero_orden}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditOrden(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Pedir el</label>
                  <input type="date" className="form-input" value={String(editOrden.fecha_programada || '').slice(0, 10)} onChange={(e) => setEditOrden({ ...editOrden, fecha_programada: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Entrega esperada</label>
                  <input type="date" className="form-input" value={String(editOrden.fecha_entrega_esperada || '').slice(0, 10)} onChange={(e) => setEditOrden({ ...editOrden, fecha_entrega_esperada: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Costo de transporte</label>
                  <input type="number" className="form-input" value={editOrden.costo_transporte ?? ''} onChange={(e) => setEditOrden({ ...editOrden, costo_transporte: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Transportador</label>
                  <input className="form-input" value={editOrden.transportador || ''} onChange={(e) => setEditOrden({ ...editOrden, transportador: e.target.value })} placeholder="Nombre o empresa" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp de contacto</label>
                <input className="form-input" value={editOrden.contacto_whatsapp || ''} onChange={(e) => setEditOrden({ ...editOrden, contacto_whatsapp: e.target.value })} placeholder="300 123 4567" />
              </div>
              {editOrden.tipo !== 'TRASLADO' && (
                <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                  Mensaje: {mensajeOrden(editOrden)}
                </div>
              )}
              {editOrden.tipo === 'TRASLADO' && (
                <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                  El material se traslada a su costo original ({fmt(editOrden.costo_material)}). El transporte se registra como costo de este proyecto.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditOrden(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarEdicion}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, color = '#1e293b' }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const [bg, color] = ESTADO_COLOR[estado] || ['#f1f5f9', '#64748b'];
  return <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{ESTADO_ORDEN_LABEL[estado] || estado || '—'}</span>;
}

function FilaOrden({ orden: o, nombreBodega, siguiente, onEstado, onWhatsApp, onEditar }) {
  const esTraslado = o.tipo === 'TRASLADO';
  const cerrada = ['RECIBIDO', 'CANCELADO'].includes(o.estado);
  return (
    <tr style={{ opacity: o.estado === 'CANCELADO' ? 0.5 : 1 }}>
      <td>
        <div style={{ fontWeight: 700 }}>{o.numero_orden || '—'}</div>
        <div style={{ fontSize: 10, color: esTraslado ? '#0891b2' : '#7c3aed', fontWeight: 700 }}>{esTraslado ? 'TRASLADO' : 'COMPRA'}</div>
      </td>
      <td>
        <div style={{ fontWeight: 600 }}>{esTraslado ? nombreBodega(o.bodega_origen_id) : o.proveedor_nombre}</div>
        {esTraslado && o.transportador && <div style={{ fontSize: 10, color: '#64748b' }}>🚛 {o.transportador}</div>}
        {!esTraslado && o.contacto_whatsapp && <div style={{ fontSize: 10, color: '#64748b' }}>📞 {o.contacto_whatsapp}</div>}
      </td>
      <td style={{ fontSize: 11, maxWidth: 260 }}>
        {(o.items || []).map((i) => `${fmtQ(i.cantidad)} ${i.unidad || ''} ${i.nombre || i.insumo_nombre || ''}`.trim()).join(', ')}
      </td>
      <td>{fmtD(o.fecha_programada)}</td>
      <td>{fmtD(o.fecha_entrega_esperada)}</td>
      <td style={{ textAlign: 'right' }}>{fmt(o.costo_material || o.total)}</td>
      <td style={{ textAlign: 'right', color: Number(o.costo_transporte) > 0 ? '#ea580c' : '#94a3b8' }}>{fmt(o.costo_transporte)}</td>
      <td>
        {cerrada ? <EstadoBadge estado={o.estado} /> : (
          <select className="form-select" style={{ fontSize: 11, padding: '2px 6px', width: 'auto' }} value={ESTADOS_ORDEN.includes(o.estado) ? o.estado : ''} onChange={(e) => onEstado(e.target.value)}>
            {!ESTADOS_ORDEN.includes(o.estado) && <option value="">{o.estado || '—'}</option>}
            {ESTADOS_ORDEN.map((e) => <option key={e} value={e}>{ESTADO_ORDEN_LABEL[e]}</option>)}
          </select>
        )}
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {!cerrada && !esTraslado && (
          <button className="btn btn-sm" style={{ background: '#22c55e', color: 'white', fontSize: 11 }} onClick={onWhatsApp} title="WhatsApp al proveedor">
            WhatsApp al proveedor
          </button>
        )}
        {!cerrada && siguiente && (
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 6, fontSize: 11 }} onClick={() => onEstado(siguiente)}>
            → {ESTADO_ORDEN_LABEL[siguiente]}
          </button>
        )}
        {!cerrada && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }} onClick={onEditar} title="Editar">✏️</button>}
      </td>
    </tr>
  );
}
