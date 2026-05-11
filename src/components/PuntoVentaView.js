'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';
import { POSActionBar, VentaModal, TraspasoModal, DevolucionModal, IngresoModal, HistorialOperaciones } from './POSOperaciones';

const TIPOS = [
  { value: 'MATERIAL', label: 'Material', color: '#2563eb' },
  { value: 'EQUIPO', label: 'Equipo', color: '#7c3aed' },
  { value: 'TRANSPORTE', label: 'Transporte', color: '#d97706' },
];

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

export default function PuntoVentaView() {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  
  // Banner de error crítico
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    const handleDbError = (e) => setDbError(e.detail);
    if (typeof window !== 'undefined') window.addEventListener('db-error', handleDbError);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('db-error', handleDbError); };
  }, []);

  // Múltiples tiendas del usuario
  const userTiendas = state.mkTiendas.filter(t => t.user_id === user?.id);
  const [selectedTiendaId, setSelectedTiendaId] = useState(null);
  const [editingTienda, setEditingTienda] = useState(null);

  // Auto-select primera tienda
  const selectedTienda = userTiendas.find(t => t.id === selectedTiendaId) || userTiendas[0] || null;
  const puntosVenta = state.mkPuntosVenta.filter(p => p.tienda_id === selectedTienda?.id);
  const ofertas = state.mkOfertas.filter(o => o.tienda_id === selectedTienda?.id);

  // State
  const [showTiendaModal, setShowTiendaModal] = useState(false);
  const [showPVModal, setShowPVModal] = useState(false);
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [selectedPV, setSelectedPV] = useState(null);
  const [editingPV, setEditingPV] = useState(null);
  const [tiendaForm, setTiendaForm] = useState({ nombre: '', descripcion: '', telefono: '' });
  const [pvForm, setPvForm] = useState({ nombre: '', direccion: '', ciudad: '', telefono: '', horario: '' });
  const [ofertaForm, setOfertaForm] = useState({ insumo_id: '', precio_venta: '', precio_compra: '', stock_disponible: '', nombre_comercial: '', publicado_marketplace: false, tipo_ingreso: 'COMPRA', proveedor: '', tipo_origen: 'Otra Sucursal', origen_id: '' });
  const [showProveedorForm, setShowProveedorForm] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: '', telefono: '', nit: '' });
  const [proveedores, setProveedores] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_proveedores') || '[]'); } catch { return []; }
  });
  const [searchInsumo, setSearchInsumo] = useState('');
  const [showVenta, setShowVenta] = useState(false);
  const [showTraspaso, setShowTraspaso] = useState(false);
  const [showDevolucion, setShowDevolucion] = useState(false);
  const [showIngreso, setShowIngreso] = useState(false);

  const [searchOferta, setSearchOferta] = useState(''); // Estado para el buscador
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditPrice, setInlineEditPrice] = useState('');
  const [pvTab, setPvTab] = useState('productos'); // productos | historial
  
  // Nuevo Insumo State
  const [showNuevoInsumo, setShowNuevoInsumo] = useState(false);
  const [nuevoInsumo, setNuevoInsumo] = useState({
    codigo: '', nombre: '', tipo: 'MATERIAL', unidad: 'un', precio_unitario: '',
    marca: '', id_unspsc: '', codigo_propio: '', ficha_tecnica: ''
  });

  // Insumos filtrados para el selector
  const filteredInsumos = useMemo(() => {
    if (!searchInsumo) return state.insumos.slice(0, 20);
    return state.insumos.filter(i =>
      i.nombre.toLowerCase().includes(searchInsumo.toLowerCase()) ||
      i.codigo?.toLowerCase().includes(searchInsumo.toLowerCase())
    ).slice(0, 20);
  }, [state.insumos, searchInsumo]);

  // Ofertas del PV seleccionado
  const ofertasPV = selectedPV ? ofertas.filter(o => o.punto_venta_id === selectedPV.id) : [];

  // ── Handlers ──
  const handleCrearTienda = () => {
    if (!tiendaForm.nombre) return;
    const newId = crypto.randomUUID();
    dispatch({ type: 'ADD_MK_TIENDA', payload: { ...tiendaForm, id: newId, user_id: user?.id, activa: true } });
    setSelectedTiendaId(newId);
    setTiendaForm({ nombre: '', descripcion: '', telefono: '' });
    setShowTiendaModal(false);
  };

  const handleEditarTienda = () => {
    if (!editingTienda?.nombre) return;
    dispatch({ type: 'UPDATE_MK_TIENDA', payload: editingTienda });
    setEditingTienda(null);
  };

  const handleEliminarTienda = (id) => {
    if (!confirm('¿Eliminar esta tienda y todos sus puntos de venta?')) return;
    dispatch({ type: 'DELETE_MK_TIENDA_COMPLETA', payload: id });
    setSelectedTiendaId(null);
    setSelectedPV(null);
  };

  const handleSavePV = () => {
    if (!pvForm.nombre || !pvForm.ciudad) return;
    if (editingPV) {
      dispatch({ type: 'UPDATE_MK_PUNTO_VENTA', payload: { ...editingPV, ...pvForm } });
      if (selectedPV?.id === editingPV.id) setSelectedPV({ ...selectedPV, ...pvForm });
      setEditingPV(null);
    } else {
      dispatch({ type: 'ADD_MK_PUNTO_VENTA', payload: { ...pvForm, id: crypto.randomUUID(), tienda_id: selectedTienda?.id, activo: true } });
    }
    setPvForm({ nombre: '', direccion: '', ciudad: '', telefono: '', horario: '' });
    setShowPVModal(false);
  };

  const handleEliminarPV = (id) => {
    if (!confirm('¿Eliminar este punto de venta y todas sus ofertas?')) return;
    dispatch({ type: 'DELETE_MK_PUNTO_VENTA_COMPLETA', payload: id });
    if (selectedPV?.id === id) setSelectedPV(null);
  };

  const handleSaveOferta = () => {
    if (!ofertaForm.insumo_id || !ofertaForm.precio_venta || !selectedPV) return;
    const insumo = state.insumos.find(i => i.id === ofertaForm.insumo_id);
    
    if (ofertaForm.id) {
      dispatch({
        type: 'UPDATE_MK_OFERTA',
        payload: {
          id: ofertaForm.id,
          precio_venta: Number(ofertaForm.precio_venta),
          precio_compra: Number(ofertaForm.precio_compra) || 0,
          stock_disponible: Number(ofertaForm.stock_disponible) || 0,
          nombre_comercial: ofertaForm.nombre_comercial,
          marca: ofertaForm.marca,
          codigo_propio: ofertaForm.codigo_propio,
          publicado_marketplace: ofertaForm.publicado_marketplace,
          enlace_producto: ofertaForm.enlace_producto,
          fecha_actualizacion_precio: new Date().toISOString(),
        }
      });
    } else {
      dispatch({
        type: 'ADD_MK_OFERTA',
        payload: {
          id: crypto.randomUUID(),
          insumo_id: ofertaForm.insumo_id,
          tienda_id: selectedTienda?.id,
          punto_venta_id: selectedPV.id,
          precio_venta: Number(ofertaForm.precio_venta),
          precio_compra: Number(ofertaForm.precio_compra) || 0,
          stock_disponible: Number(ofertaForm.stock_disponible) || 0,
          nombre_comercial: ofertaForm.nombre_comercial || insumo?.nombre || '',
          marca: ofertaForm.marca,
          codigo_propio: ofertaForm.codigo_propio,
          publicado_marketplace: ofertaForm.publicado_marketplace,
          tipo_ingreso: ofertaForm.tipo_ingreso,
          proveedor: ofertaForm.proveedor,
          tipo_origen: ofertaForm.tipo_origen,
          origen_id: ofertaForm.origen_id,
          enlace_producto: ofertaForm.enlace_producto,
          fecha_actualizacion_precio: new Date().toISOString(),
          tipo: insumo?.tipo,
          categoria: insumo?.categoria,
          unidad: insumo?.unidad,
          tienda_nombre: selectedTienda?.nombre,
          ciudad: selectedPV.ciudad,
          activo: true,
        }
      });
      // Solo registrar historial de ingreso en creación nueva
      dispatch({
        type: 'ADD_MK_PEDIDO',
        payload: {
          tienda_id: selectedTienda?.id, punto_venta_id: selectedPV.id,
          tipo: 'INGRESO', estado: 'ENTREGADO',
          metodo_ingreso: ofertaForm.tipo_ingreso,
          proveedor: ofertaForm.proveedor,
          origen_id: ofertaForm.origen_id,
          subtotal: Number(ofertaForm.precio_compra) * (Number(ofertaForm.stock_disponible) || 1),
          comision: 0,
          total: Number(ofertaForm.precio_compra) * (Number(ofertaForm.stock_disponible) || 1),
          items: [{ insumo_id: ofertaForm.insumo_id, nombre: ofertaForm.nombre_comercial || insumo?.nombre, cantidad: Number(ofertaForm.stock_disponible) || 0, precio: Number(ofertaForm.precio_compra) }],
          fecha: new Date().toISOString(),
        }
      });
    }
    setOfertaForm({ id: null, insumo_id: '', precio_venta: '', precio_compra: '', stock_disponible: '', nombre_comercial: '', publicado_marketplace: false, tipo_ingreso: 'COMPRA', proveedor: '', tipo_origen: 'Otra Sucursal', origen_id: '', enlace_producto: '' });
    setShowOfertaModal(false);
  };

  const handleCrearProveedor = () => {
    if (!nuevoProveedor.nombre) return;
    const updated = [...proveedores, { ...nuevoProveedor, id: crypto.randomUUID() }];
    setProveedores(updated);
    localStorage.setItem('erp_proveedores', JSON.stringify(updated));
    setOfertaForm({ ...ofertaForm, proveedor: nuevoProveedor.nombre });
    setNuevoProveedor({ nombre: '', telefono: '', nit: '' });
    setShowProveedorForm(false);
  };

  const handleCrearInsumo = () => {
    if (!nuevoInsumo.nombre) return;
    const insumoToCreate = {
      ...nuevoInsumo,
      id: crypto.randomUUID(),
      precio_unitario: Number(nuevoInsumo.precio_unitario) || 0
    };
    delete insumoToCreate.codigo; // Garantizar auto-generación
    dispatch({ type: 'ADD_INSUMO', payload: insumoToCreate });
    setOfertaForm({ ...ofertaForm, insumo_id: insumoToCreate.id, nombre_comercial: insumoToCreate.nombre, precio_venta: String(insumoToCreate.precio_unitario) });
    setShowNuevoInsumo(false);
    setNuevoInsumo({ nombre: '', tipo: 'MATERIAL', unidad: 'un', precio_unitario: '', marca: '', id_unspsc: '', codigo_propio: '', ficha_tecnica: '' });
  };

  const togglePublicado = (oferta) => {
    dispatch({ type: 'UPDATE_MK_OFERTA', payload: { id: oferta.id, publicado_marketplace: !oferta.publicado_marketplace } });
  };

  // ════════════════════════════════════════════
  // PASO 0: No tiene tienda → crear
  // ════════════════════════════════════════════
  if (!selectedTienda) {
    return (
      <div className="punto-venta-view page-container">
        {dbError && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '16px', margin: '16px', borderRadius: '8px', border: '2px solid #ef4444', fontWeight: 'bold' }}>
            🚨 ERROR DE SINCRONIZACIÓN CON BASE DE DATOS: {dbError}
            <button style={{float: 'right', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => setDbError(null)}>X</button>
          </div>
        )}
        <div className="page-header">
          <div><h1>🏪 Punto de Venta</h1><div className="page-header-subtitle">Gestiona tu tienda y productos</div></div>
        </div>
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="empty-state-icon">🏪</div>
          <h3>Configura tu Tienda</h3>
          <p>Para crear puntos de venta y ofertar productos, primero registra tu negocio.</p>
          <button className="btn btn-primary" onClick={() => setShowTiendaModal(true)}>🏪 Crear Mi Tienda</button>
        </div>

        {/* Modal Tienda (necesario aquí por el early return) */}
        {showTiendaModal && (
          <div className="modal-overlay" onClick={() => setShowTiendaModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2>🏪 Registrar Tienda</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowTiendaModal(false)}>✕</button></div>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Nombre del Negocio *</label><input className="form-input" value={tiendaForm.nombre} onChange={e => setTiendaForm({...tiendaForm, nombre: e.target.value})} placeholder="Ej: Ferretería El Constructor" /></div>
                <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-textarea" value={tiendaForm.descripcion} onChange={e => setTiendaForm({...tiendaForm, descripcion: e.target.value})} placeholder="¿Qué vende tu negocio?" /></div>
                <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={tiendaForm.telefono} onChange={e => setTiendaForm({...tiendaForm, telefono: e.target.value})} placeholder="300 123 4567" /></div>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowTiendaModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleCrearTienda}>Crear Tienda</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════
  // PASO 1: Tiene tienda → gestionar PVs y ofertas
  // ════════════════════════════════════════════
  return (
    <div className="punto-venta-view page-container">
      {dbError && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '16px', margin: '16px', borderRadius: '8px', border: '2px solid #ef4444', fontWeight: 'bold' }}>
          🚨 ERROR DE SINCRONIZACIÓN CON BASE DE DATOS: {dbError}
          <button style={{float: 'right', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => setDbError(null)}>X</button>
        </div>
      )}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Tienda selector dropdown */}
          <select className="form-select" style={{ maxWidth: 240, fontWeight: 700, fontSize: 14 }}
            value={selectedTienda.id} onChange={e => setSelectedTiendaId(e.target.value)}>
            {userTiendas.map(t => (
              <option key={t.id} value={t.id}>🏪 {t.nombre}</option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditingTienda({ ...selectedTienda })} title="Editar tienda" style={{ fontSize: 13 }}>✏️</button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleEliminarTienda(selectedTienda.id)} title="Eliminar tienda" style={{ fontSize: 13, color: '#ef4444' }}>🗑️</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setTiendaForm({ nombre: '', descripcion: '', telefono: '' }); setShowTiendaModal(true); }}>+ Nueva Tienda</button>
          
          <button className="btn btn-sm" style={{ background: 'linear-gradient(45deg, #10b981, #3b82f6)', color: 'white', border: 'none', fontWeight: 600, marginLeft: 10 }} onClick={async () => {
            if(!confirm("¿Corregir nombres del catálogo? Esto restaurará el nombre base de los insumos y cambiará 'Cegris' a 'Cemento Gris' y 'Ceblanco' a 'Cemento Blanco'.")) return;
            let creados = 0;
            const currentOfertasPV = state.mkOfertas?.filter(o => o.punto_venta_id === selectedPV?.id) || [];
            
            for(const oferta of currentOfertasPV) {
              const ins = state.insumos.find(i => i.id === oferta.insumo_id);
              if (!ins) continue;
              
              let nombreCorregido = ins.nombre;
              // Reemplazos de Cegris y Ceblanco (case-insensitive) manteniendo el resto de palabras
              nombreCorregido = nombreCorregido.replace(/cegris/ig, 'Cemento Gris');
              nombreCorregido = nombreCorregido.replace(/ceblanco/ig, 'Cemento Blanco');
              
              if (oferta.nombre_comercial !== nombreCorregido) {
                dispatch({
                  type: 'UPDATE_MK_OFERTA',
                  payload: {
                    id: oferta.id,
                    nombre_comercial: nombreCorregido
                  }
                });
                creados++;
              }
            }
            alert(`🔧 ¡Catálogo corregido! Se actualizaron los nombres de ${creados} productos eliminando los duplicados genéricos.`);
          }}>🔧 Corregir Catálogo</button>

          <button className="btn btn-sm" style={{ background: 'linear-gradient(45deg, #f59e0b, #ea580c)', color: 'white', border: 'none', fontWeight: 600, marginLeft: 10 }} onClick={async () => {
            if(!confirm("¿Autocompletar catálogo de EQUIPOS en esta tienda? Esto insertará todos los insumos tipo 'Equipo' con precios de alquiler estimados para Pasto/Colombia.")) return;
            const insumosEquipos = state.insumos.filter(i => i.tipo === 'EQUIPO');
            let creados = 0;
            
            for(const ins of insumosEquipos) {
              const prev = state.mkOfertas?.find(o => o.insumo_id === ins.id && o.punto_venta_id === selectedPV?.id);
              if (prev) continue;
              
              let nombreComercial = ins.nombre;
              let precio = 50000;
              let link = `https://www.google.com/search?q=alquiler+${encodeURIComponent(ins.nombre)}+pasto`;
              
              // Reglas Heurísticas de Alquiler (Por Día/Hora)
              const lowName = ins.nombre.toLowerCase();
              if(lowName.includes('retroexcavadora')) { nombreComercial = 'Retroexcavadora (Alquiler Día)'; precio = 800000; }
              else if(lowName.includes('motoniveladora')) { nombreComercial = 'Motoniveladora (Alquiler Día)'; precio = 1200000; }
              else if(lowName.includes('volqueta')) { nombreComercial = 'Volqueta Sencilla (Viaje/Día)'; precio = 450000; }
              else if(lowName.includes('mezcladora')) { nombreComercial = 'Mezcladora de Concreto (Alquiler Día)'; precio = 60000; }
              else if(lowName.includes('rana compactad')) { nombreComercial = 'Rana Compactadora (Alquiler Día)'; precio = 80000; }
              else if(lowName.includes('andamio')) { nombreComercial = 'Andamio Tubular (Sección/Día)'; precio = 2500; }
              else if(lowName.includes('hidrolavadora')) { nombreComercial = 'Hidrolavadora Industrial (Alquiler Día)'; precio = 50000; }
              else if(lowName.includes('vibrador')) { nombreComercial = 'Vibrador para Concreto (Alquiler Día)'; precio = 45000; }
              else if(lowName.includes('topograf')) { nombreComercial = 'Equipo Topografía - Estación Total (Día)'; precio = 150000; }
              else if(lowName.includes('cilindro')) { nombreComercial = 'Cilindro Vibrador (Alquiler Día)'; precio = 70000; }
              else if(lowName.includes('carrotanque')) { nombreComercial = 'Carrotanque Agua (Viaje)'; precio = 180000; }
              else if(lowName.includes('transporte')) { nombreComercial = 'Flete / Transporte (Ton)'; precio = 35000; }
              else { precio = Math.floor(Math.random() * 5) * 10000 + 40000; } // Base aleatoria 40k-90k
              
              dispatch({
                type: 'ADD_MK_OFERTA',
                payload: {
                  id: crypto.randomUUID(),
                  insumo_id: ins.id,
                  tienda_id: selectedTienda.id,
                  punto_venta_id: selectedPV?.id,
                  precio_venta: precio,
                  precio_compra: precio * 0.5,
                  stock_disponible: Math.floor(Math.random() * 5) + 1, // Pocas unidades de maquinaria
                  nombre_comercial: nombreComercial,
                  publicado_marketplace: true,
                  tipo_ingreso: 'COMPRA',
                  enlace_producto: link,
                  fecha_actualizacion_precio: new Date().toISOString(),
                  tipo: ins.tipo, categoria: ins.categoria, unidad: ins.unidad,
                  tienda_nombre: selectedTienda.nombre, ciudad: selectedPV?.ciudad, activo: true
                }
              });
              creados++;
            }
            alert(`🚜 ¡Magia! Se crearon ${creados} equipos en el catálogo con precios de alquiler.`);
          }}>🚜 Autocompletar Equipos</button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowPVModal(true)}>+ Nuevo Punto de Venta</button>
      </div>

      {/* Editar tienda inline */}
      {editingTienda && (
        <div style={{ padding: '12px 18px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input className="form-input" value={editingTienda.nombre} onChange={e => setEditingTienda({ ...editingTienda, nombre: e.target.value })} style={{ flex: 1, maxWidth: 220 }} placeholder="Nombre" />
          <input className="form-input" value={editingTienda.descripcion || ''} onChange={e => setEditingTienda({ ...editingTienda, descripcion: e.target.value })} style={{ flex: 1 }} placeholder="Descripción" />
          <input className="form-input" value={editingTienda.telefono || ''} onChange={e => setEditingTienda({ ...editingTienda, telefono: e.target.value })} style={{ maxWidth: 150 }} placeholder="Teléfono" />
          <button className="btn btn-primary btn-sm" onClick={handleEditarTienda}>Guardar</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditingTienda(null)}>Cancelar</button>
        </div>
      )}

      <div className="page-body">
        {/* Lista de Puntos de Venta */}
        {puntosVenta.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div className="empty-state-icon">📍</div>
            <h3>Sin puntos de venta</h3>
            <p>Crea tu primer punto de venta físico para empezar a ofertar productos.</p>
            <button className="btn btn-primary" onClick={() => setShowPVModal(true)}>+ Crear Punto de Venta</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, height: 'calc(100vh - 160px)' }}>
            {/* Panel izquierdo: lista de PVs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
              {puntosVenta.map(pv => {
                const pvOfertas = ofertas.filter(o => o.punto_venta_id === pv.id);
                const publicadas = pvOfertas.filter(o => o.publicado_marketplace).length;
                const isSelected = selectedPV?.id === pv.id;
                return (
                  <div key={pv.id} onClick={() => setSelectedPV(pv)} style={{
                    padding: '14px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                    border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : 'white',
                    position: 'relative',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>📍 {pv.nombre}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{pv.direccion || pv.ciudad}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-xs" onClick={(e) => { e.stopPropagation(); setEditingPV(pv); setPvForm({ nombre: pv.nombre, ciudad: pv.ciudad, direccion: pv.direccion || '', telefono: pv.telefono || '', horario: pv.horario || '' }); setShowPVModal(true); }} style={{ padding: 2, height: 22, width: 22 }}>✏️</button>
                        <button className="btn btn-ghost btn-icon btn-xs" onClick={(e) => { e.stopPropagation(); handleEliminarPV(pv.id); }} style={{ padding: 2, height: 22, width: 22, color: '#ef4444' }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>{pvOfertas.length} productos</span>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: publicadas > 0 ? '#dcfce7' : '#f1f5f9', color: publicadas > 0 ? '#16a34a' : '#94a3b8' }}>🌐 {publicadas}</span>
                    </div>
                  </div>
                );
              })}
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPVModal(true)} style={{ marginTop: 4 }}>+ Nuevo Punto de Venta</button>
            </div>

            {/* Panel derecho: productos del PV seleccionado */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {!selectedPV ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', fontSize: 13 }}>
                  ← Selecciona un punto de venta
                </div>
              ) : (
                <>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>📍 {selectedPV.nombre}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{selectedPV.ciudad} · {selectedPV.direccion}</div>
                        
                        {/* Personal Asignado */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {state.personalProyecto.filter(ap => ap.punto_venta_id === selectedPV.id).map(ap => {
                            const person = state.personal.find(p => p.id === ap.personal_id);
                            if (!person) return null;
                            const isSupervisor = ap.unidad_pactada === 'SUPERVISOR';
                            return (
                              <div key={ap.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 6, background: isSupervisor ? '#fffbeb' : '#f0fdf4', border: `1px solid ${isSupervisor ? '#fde68a' : '#bbf7d0'}` }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isSupervisor ? '#f59e0b' : '#10b981' }} />
                                <div style={{ fontSize: 10, fontWeight: 600, color: isSupervisor ? '#b45309' : '#166534' }}>
                                  {person.nombre || `${person.nombres} ${person.apellidos}`} 
                                  <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 4 }}>({isSupervisor ? 'Supervisor' : 'Vendedor'})</span>
                                </div>
                              </div>
                            );
                          })}
                          {state.personalProyecto.filter(ap => ap.punto_venta_id === selectedPV.id).length === 0 && (
                            <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>Sin personal asignado</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input className="form-input" placeholder="🔍 Buscar producto por nombre o código..." value={searchOferta} onChange={e => setSearchOferta(e.target.value)} style={{ width: 300, fontSize: 13 }} />
                        <button className="btn btn-primary btn-sm" onClick={() => { setOfertaForm({ id: null, insumo_id: '', precio_venta: '', stock_disponible: '', nombre_comercial: '', publicado_marketplace: false, enlace_producto: '' }); setShowOfertaModal(true); }}>
                          + Agregar Producto
                        </button>
                      </div>
                    </div>
                    {/* Action bar POS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <POSActionBar
                        onVenta={() => setShowVenta(true)}
                        onTraspaso={() => setShowTraspaso(true)}
                        onDevolucion={() => setShowDevolucion(true)}
                        onIngreso={() => setShowIngreso(true)}
                      />
                      <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 6, padding: 2 }}>
                        {[['productos','📦 Productos'],['historial','📋 Historial']].map(([k,label]) => (
                          <button key={k} onClick={() => setPvTab(k)} style={{
                            padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                            fontSize: 10, fontWeight: 600, transition: 'all 0.2s',
                            background: pvTab === k ? 'white' : 'transparent',
                            color: pvTab === k ? '#1e293b' : '#94a3b8',
                            boxShadow: pvTab === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          }}>{label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {pvTab === 'productos' ? (
                      ofertasPV.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                          <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                          <p style={{ fontSize: 12 }}>Sin productos en este punto de venta</p>
                          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowOfertaModal(true)}>+ Agregar Producto desde Insumos</button>
                        </div>
                      ) : (
                        <table className="data-table">
                          <thead><tr><th>Producto</th><th>Tipo</th><th>Categoría</th><th style={{textAlign:'right'}}>Precio Venta</th><th style={{textAlign:'right'}}>Stock</th><th style={{textAlign:'center'}}>Marketplace</th><th></th></tr></thead>
                          <tbody>
                            {ofertasPV.filter(o => o.nombre_comercial?.toLowerCase().includes(searchOferta.toLowerCase())).map(oferta => {
                              const insumo = state.insumos.find(i => i.id === oferta.insumo_id);
                              const tipoInfo = TIPOS.find(t => t.value === oferta.tipo);
                              return (
                                <tr key={oferta.id}>
                                  <td>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{oferta.nombre_comercial || insumo?.nombre}</div>
                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{insumo?.codigo} · {oferta.unidad}</div>
                                  </td>
                                  <td><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: 'white', background: tipoInfo?.color || '#64748b' }}>{oferta.tipo}</span></td>
                                  <td style={{ fontSize: 11, color: '#64748b' }}>{oferta.categoria}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                                    {inlineEditId === oferta.id ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                        <input type="number" className="form-input" value={inlineEditPrice} onChange={e => setInlineEditPrice(e.target.value)} style={{ width: 100, padding: '4px 8px', fontSize: 12, textAlign: 'right' }} autoFocus onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            dispatch({ type: 'UPDATE_MK_OFERTA', payload: { id: oferta.id, precio_venta: Number(inlineEditPrice), fecha_actualizacion_precio: new Date().toISOString() } });
                                            setInlineEditId(null);
                                          } else if (e.key === 'Escape') setInlineEditId(null);
                                        }} />
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          <button className="btn btn-primary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => { dispatch({ type: 'UPDATE_MK_OFERTA', payload: { id: oferta.id, precio_venta: Number(inlineEditPrice), fecha_actualizacion_precio: new Date().toISOString() } }); setInlineEditId(null); }}>💾</button>
                                          <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => setInlineEditId(null)}>❌</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => { setInlineEditId(oferta.id); setInlineEditPrice(oferta.precio_venta); }} title="Clic para editar precio">
                                          <span>{fmt(oferta.precio_venta)}</span>
                                          <span style={{ fontSize: 10, opacity: 0.5 }}>✏️</span>
                                        </div>
                                        {oferta.fecha_actualizacion_precio && (
                                          <div style={{ fontSize: 9, color: '#64748b', fontWeight: 400, marginTop: 2 }} title="Fecha actualización de precio">
                                            📅 {new Date(oferta.fecha_actualizacion_precio).toLocaleDateString()}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'right', fontSize: 12 }}>{oferta.stock_disponible || '—'}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => togglePublicado(oferta)} style={{
                                      padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                                      background: oferta.publicado_marketplace ? '#dcfce7' : '#f1f5f9',
                                      color: oferta.publicado_marketplace ? '#16a34a' : '#94a3b8',
                                    }}>
                                      {oferta.publicado_marketplace ? '🌐 Publicado' : '⬜ No'}
                                    </button>
                                  </td>
                                  <td>
                                    {oferta.enlace_producto && (
                                      <a href={oferta.enlace_producto} target="_blank" rel="noreferrer" title="Ver producto" style={{ fontSize: 13, marginRight: 8, textDecoration: 'none' }}>🔗</a>
                                    )}
                                    <button className="btn btn-ghost btn-sm" onClick={() => {
                                      setOfertaForm({
                                        id: oferta.id,
                                        insumo_id: oferta.insumo_id,
                                        nombre_comercial: oferta.nombre_comercial || '',
                                        precio_venta: String(oferta.precio_venta || ''),
                                        precio_compra: String(oferta.precio_compra || ''),
                                        stock_disponible: String(oferta.stock_disponible || 0),
                                        marca: oferta.marca || '',
                                        codigo_propio: oferta.codigo_propio || '',
                                        publicado_marketplace: oferta.publicado_marketplace,
                                        enlace_producto: oferta.enlace_producto || '',
                                        tipo_ingreso: oferta.tipo_ingreso || 'COMPRA',
                                        proveedor: oferta.proveedor || '',
                                      });
                                      setShowOfertaModal(true);
                                    }} style={{ fontSize: 11, marginRight: 4 }}>✏️</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'DELETE_MK_OFERTA', payload: oferta.id })} style={{ color: '#ef4444', fontSize: 11 }}>🗑️</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )
                    ) : (
                      <HistorialOperaciones pedidos={state.mkPedidos} puntoVentaId={selectedPV.id} />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Nuevo Punto de Venta */}
      {showPVModal && (
        <div className="modal-overlay" onClick={() => { setShowPVModal(false); setEditingPV(null); setPvForm({ nombre: '', direccion: '', ciudad: '', telefono: '', horario: '' }); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPV ? '✏️ Editar Punto de Venta' : '📍 Nuevo Punto de Venta'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowPVModal(false); setEditingPV(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Nombre del Punto *</label><input className="form-input" value={pvForm.nombre} onChange={e => setPvForm({...pvForm, nombre: e.target.value})} placeholder="Ej: Sede Norte, Sucursal Centro" /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Ciudad *</label><input className="form-input" value={pvForm.ciudad || ''} onChange={e => setPvForm({...pvForm, ciudad: e.target.value})} placeholder="Bogotá" /></div>
                <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={pvForm.telefono || ''} onChange={e => setPvForm({...pvForm, telefono: e.target.value})} placeholder="300 123 4567" /></div>
              </div>
              <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" value={pvForm.direccion || ''} onChange={e => setPvForm({...pvForm, direccion: e.target.value})} placeholder="Cra 10 # 20-30" /></div>
              <div className="form-group"><label className="form-label">Horario</label><input className="form-input" value={pvForm.horario || ''} onChange={e => setPvForm({...pvForm, horario: e.target.value})} placeholder="Lun-Sáb 7am-5pm" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowPVModal(false); setEditingPV(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSavePV}>{editingPV ? 'Guardar Cambios' : 'Crear Punto de Venta'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar/Editar Producto (desde Insumos) */}
      {showOfertaModal && (
        <div className="modal-overlay" onClick={() => setShowOfertaModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header"><h2>📦 {ofertaForm.id ? 'Editar Producto' : 'Agregar Producto'}</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowOfertaModal(false)}>✕</button></div>
            <div className="modal-body">
              {!ofertaForm.id && (
                <>
                  <div style={{ padding: '8px 10px', background: '#eff6ff', borderRadius: 8, marginBottom: 14, fontSize: 11, color: '#1e40af', borderLeft: '3px solid #2563eb' }}>
                    Selecciona un insumo del catálogo. El tipo, categoría y unidad se heredan automáticamente.
                  </div>

                  {/* Buscador de insumos */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Buscar Insumo del Catálogo *</label>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowNuevoInsumo(!showNuevoInsumo)} style={{ color: '#2563eb', padding: '0 4px' }}>
                        {showNuevoInsumo ? 'Cancelar' : '+ Crear Nuevo Insumo'}
                      </button>
                    </div>
                    {!showNuevoInsumo && (
                      <input className="form-input" placeholder="🔍 Buscar por nombre o código..." value={searchInsumo} onChange={e => setSearchInsumo(e.target.value)} />
                    )}
                  </div>

              {showNuevoInsumo ? (
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 14 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#0f172a' }}>✨ Nuevo Insumo en Catálogo General</h4>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Nombre *</label><input className="form-input" value={nuevoInsumo.nombre} onChange={e => setNuevoInsumo({...nuevoInsumo, nombre: e.target.value})} placeholder="Nombre del producto" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <select className="form-select" value={nuevoInsumo.tipo} onChange={e => setNuevoInsumo({...nuevoInsumo, tipo: e.target.value})}>
                        {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Categoría</label>
                      <select className="form-select" value={nuevoInsumo.categoria_id || ''} onChange={e => setNuevoInsumo({...nuevoInsumo, categoria_id: e.target.value})}>
                        <option value="">Sin Categoría</option>
                        {state.categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unidad</label>
                      <select className="form-select" value={nuevoInsumo.unidad} onChange={e => setNuevoInsumo({...nuevoInsumo, unidad: e.target.value})}>
                        {['un', 'm', 'm2', 'm3', 'kg', 'ton', 'l', 'gl', 'global', 'hr', 'dia', 'mes', 'viaje'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Precio Referencia</label><input type="number" className="form-input" value={nuevoInsumo.precio_unitario} onChange={e => setNuevoInsumo({...nuevoInsumo, precio_unitario: e.target.value})} placeholder="$" /></div>
                  </div>
                  
                  {/* Nuevos Campos Fase POS */}
                  <div className="form-row" style={{ marginTop: -4 }}>
                    <div className="form-group"><label className="form-label">Marca</label><input className="form-input" value={nuevoInsumo.marca} onChange={e => setNuevoInsumo({...nuevoInsumo, marca: e.target.value})} placeholder="Ej. Corona, Argos..." /></div>
                    <div className="form-group"><label className="form-label">UNSPSC (United Nations Standard Products and Services Code)</label><input className="form-input" value={nuevoInsumo.id_unspsc} onChange={e => setNuevoInsumo({...nuevoInsumo, id_unspsc: e.target.value})} placeholder="Ej. 30101500" /></div>
                  </div>
                  <div className="form-row" style={{ marginTop: -4 }}>
                    <div className="form-group"><label className="form-label">Cód. Fabricante / Propio</label><input className="form-input" value={nuevoInsumo.codigo_propio} onChange={e => setNuevoInsumo({...nuevoInsumo, codigo_propio: e.target.value})} placeholder="SKU o Part No." /></div>
                    <div className="form-group"><label className="form-label">Ficha Técnica (URL)</label><input className="form-input" value={nuevoInsumo.ficha_tecnica} onChange={e => setNuevoInsumo({...nuevoInsumo, ficha_tecnica: e.target.value})} placeholder="Enlace al PDF" /></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button className="btn btn-primary" onClick={handleCrearInsumo} disabled={!nuevoInsumo.nombre}>Guardar y Seleccionar</button>
                  </div>
                </div>
              ) : (
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 14 }}>
                  {state.insumos.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
                      ⚠️ No hay insumos en el sistema. Puedes crear uno nuevo pulsando arriba.
                    </div>
                  ) : filteredInsumos.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>Sin resultados</div>
                  ) : (
                  filteredInsumos.map(insumo => {
                    const isSelected = ofertaForm.insumo_id === insumo.id;
                    const tipoInfo = TIPOS.find(t => t.value === insumo.tipo);
                    return (
                      <div key={insumo.id} onClick={() => setOfertaForm({ ...ofertaForm, insumo_id: insumo.id, nombre_comercial: insumo.nombre, precio_venta: String(insumo.precio_unitario) })} style={{
                        padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f8fafc',
                        background: isSelected ? '#eff6ff' : 'white', display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#2563eb' : '#1e293b' }}>{insumo.nombre}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{insumo.codigo} · {insumo.unidad}</div>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, color: 'white', background: tipoInfo?.color || '#64748b' }}>{insumo.tipo}</span>
                        <span style={{ fontSize: 9, color: '#64748b' }}>{insumo.categoria}</span>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{fmt(insumo.precio_unitario)}</span>
                        {isSelected && <span style={{ fontSize: 12, color: '#2563eb' }}>✓</span>}
                      </div>
                    );
                  })
                )}
              </div>
              )}
              </>
              )}

              {/* Campos de la oferta */}
              {ofertaForm.insumo_id && (() => {
                const insumo = state.insumos.find(i => i.id === ofertaForm.insumo_id);
                return (
                  <>
                    <div style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: 8, marginBottom: 12, fontSize: 10, color: '#166534' }}>
                      ✅ <strong>{insumo?.nombre}</strong> · {insumo?.tipo} · {insumo?.categoria || 'Sin Cat.'} · {insumo?.unidad} · Ref: {fmt(insumo?.precio_unitario || 0)}
                      {(insumo?.marca || insumo?.codigo_propio || insumo?.id_unspsc) && (
                        <div style={{ marginTop: 4, opacity: 0.8, borderTop: '1px solid #bbf7d0', paddingTop: 4 }}>
                          {insumo.id_unspsc && <span style={{ marginRight: 8 }}>📦 UNSPSC: {insumo.id_unspsc}</span>}
                          {insumo.ficha_tecnica && <span>📄 <a href={insumo.ficha_tecnica} target="_blank" rel="noreferrer" style={{ color: '#166534', textDecoration: 'underline' }}>Ficha</a></span>}
                        </div>
                      )}
                    </div>
                    <div className="form-row" style={{ alignItems: 'flex-start' }}>
                      <div className="form-group" style={{ flex: 1.5 }}>
                        <label className="form-label">Nombre Comercial (opcional)</label>
                        <input className="form-input" value={ofertaForm.nombre_comercial || ''} onChange={e => setOfertaForm({...ofertaForm, nombre_comercial: e.target.value})} placeholder={insumo?.nombre} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Marca</label>
                        <select className="form-select" value={ofertaForm.marca} onChange={e => setOfertaForm({...ofertaForm, marca: e.target.value})}>
                          <option value="">Seleccionar...</option>
                          {['Sin Marca', 'Corona', 'Argos', 'Cemex', 'Sika', 'Pintuco', 'Toxement', 'Pavco', 'Gerfor', 'Ternium', 'Acesco', 'Bosch', 'DeWalt', 'Makita', 'Stanley', 'Caterpillar', 'Otro'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Cód. Fabricante / Propio</label>
                        <input className="form-input" value={ofertaForm.codigo_propio} onChange={e => setOfertaForm({...ofertaForm, codigo_propio: e.target.value})} placeholder="SKU o Part No." />
                      </div>
                    </div>

                    {/* Tipo de Ingreso (Solo si es nuevo) */}
                    {!ofertaForm.id && (
                      <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 12, border: '1px solid #e2e8f0' }}>
                        <label className="form-label" style={{ marginBottom: 6 }}>📥 Tipo de Ingreso</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[['COMPRA','🛒 Compra'],['TRASPASO','🔄 Traspaso'],['CONSIGNACION','📋 Consignación']].map(([val,label]) => (
                            <button key={val} onClick={() => setOfertaForm({...ofertaForm, tipo_ingreso: val})} style={{
                              flex: 1, padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                              fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                              background: ofertaForm.tipo_ingreso === val ? '#2563eb' : '#e2e8f0',
                              color: ofertaForm.tipo_ingreso === val ? 'white' : '#64748b',
                            }}>{label}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Proveedor (para COMPRA y CONSIGNACION, Solo si es nuevo) */}
                    {!ofertaForm.id && (ofertaForm.tipo_ingreso === 'COMPRA' || ofertaForm.tipo_ingreso === 'CONSIGNACION') && (
                      <div className="form-group">
                        <label className="form-label">Proveedor</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select className="form-select" style={{ flex: 1 }} value={ofertaForm.proveedor} onChange={e => setOfertaForm({...ofertaForm, proveedor: e.target.value})}>
                            <option value="">Seleccionar proveedor...</option>
                            {proveedores.map(p => <option key={p.id} value={p.nombre}>{p.nombre} {p.nit ? `(${p.nit})` : ''}</option>)}
                          </select>
                          <button className="btn btn-secondary btn-sm" onClick={() => setShowProveedorForm(!showProveedorForm)} style={{ whiteSpace: 'nowrap' }}>+ Nuevo</button>
                        </div>
                        {showProveedorForm && (
                          <div style={{ marginTop: 8, padding: 10, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                            <div className="form-row" style={{ marginBottom: 6 }}>
                              <div className="form-group" style={{ marginBottom: 0 }}><input className="form-input" placeholder="Nombre *" value={nuevoProveedor.nombre} onChange={e => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})} /></div>
                              <div className="form-group" style={{ marginBottom: 0 }}><input className="form-input" placeholder="NIT" value={nuevoProveedor.nit} onChange={e => setNuevoProveedor({...nuevoProveedor, nit: e.target.value})} /></div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input className="form-input" placeholder="Teléfono" value={nuevoProveedor.telefono} onChange={e => setNuevoProveedor({...nuevoProveedor, telefono: e.target.value})} style={{ flex: 1 }} />
                              <button className="btn btn-primary btn-sm" onClick={handleCrearProveedor}>Guardar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Origen (para TRASPASO, Solo si es nuevo) */}
                    {!ofertaForm.id && ofertaForm.tipo_ingreso === 'TRASPASO' && (
                      <div className="form-row" style={{ marginBottom: 12 }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Tipo Origen</label>
                          <select className="form-select" value={ofertaForm.tipo_origen || 'Otra Sucursal'} onChange={e => setOfertaForm({...ofertaForm, tipo_origen: e.target.value, origen_id: ''})}>
                            <option value="Otra Sucursal">Otra Sucursal</option>
                            <option value="Bodega de Obra">Bodega de Obra</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Origen *</label>
                          <select className="form-select" value={ofertaForm.origen_id || ''} onChange={e => setOfertaForm({...ofertaForm, origen_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {ofertaForm.tipo_origen === 'Otra Sucursal' 
                              ? puntosVenta.filter(pv => pv.id !== selectedPV?.id).map(pv => <option key={pv.id} value={pv.id}>{pv.nombre}</option>)
                              : state.bodegas?.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)
                            }
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Precio de Compra (COP)</label>
                        <input className="form-input" type="number" value={ofertaForm.precio_compra || ''} onChange={e => setOfertaForm({...ofertaForm, precio_compra: e.target.value})} placeholder="Costo unitario" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Precio de Venta (COP) *</label>
                        <input className="form-input" type="number" value={ofertaForm.precio_venta || ''} onChange={e => setOfertaForm({...ofertaForm, precio_venta: e.target.value})} placeholder="0" />
                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>📅 La fecha de actualización de precio se registrará automáticamente hoy.</div>
                      </div>
                    </div>
                    {ofertaForm.precio_compra && ofertaForm.precio_venta && (
                      <div style={{ fontSize: 10, color: Number(ofertaForm.precio_venta) > Number(ofertaForm.precio_compra) ? '#16a34a' : '#ef4444', marginBottom: 8, fontWeight: 600 }}>
                        Margen: {((Number(ofertaForm.precio_venta) - Number(ofertaForm.precio_compra)) / Number(ofertaForm.precio_compra) * 100).toFixed(1)}%
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Stock Disponible</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input className="form-input" type="number" value={ofertaForm.stock_disponible || ''} onChange={e => setOfertaForm({...ofertaForm, stock_disponible: e.target.value})} placeholder="0" style={{ flex: 1 }} />
                        {insumo?.unidad && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', padding: '0 4px' }}>
                            {insumo.unidad}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Enlace del Producto (Opcional)</label>
                      <input className="form-input" value={ofertaForm.enlace_producto || ''} onChange={e => setOfertaForm({...ofertaForm, enlace_producto: e.target.value})} placeholder="https://..." />
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>URL externa para compra directa, catálogo en línea o ficha web.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '10px 12px', background: '#fafbfe', borderRadius: 8 }}>
                      <input type="checkbox" id="chk-marketplace" checked={ofertaForm.publicado_marketplace} onChange={e => setOfertaForm({...ofertaForm, publicado_marketplace: e.target.checked})} />
                      <label htmlFor="chk-marketplace" style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🌐 Publicar en Marketplace</label>
                      <span style={{ fontSize: 10, color: '#64748b' }}>— Visible para constructores</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowOfertaModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveOferta} disabled={!ofertaForm.insumo_id || !ofertaForm.precio_venta}>{ofertaForm.id ? 'Guardar Cambios' : 'Agregar Producto'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Venta */}
      {showVenta && selectedPV && (
        <VentaModal ofertas={ofertasPV} insumos={state.insumos} tienda={selectedTienda} puntoVenta={selectedPV} dispatch={dispatch} onClose={() => setShowVenta(false)} user={user} />
      )}
      {/* Modal Traspaso */}
      {showTraspaso && selectedPV && (
        <TraspasoModal ofertas={ofertasPV} insumos={state.insumos} puntosVenta={puntosVenta} tienda={selectedTienda} puntoVentaOrigen={selectedPV} bodegas={state.bodegas} allOfertas={ofertas} dispatch={dispatch} onClose={() => setShowTraspaso(false)} user={user} />
      )}
      {/* Modal Devolución */}
      {showDevolucion && selectedPV && (
        <DevolucionModal ofertas={ofertasPV} insumos={state.insumos} tienda={selectedTienda} puntoVenta={selectedPV} dispatch={dispatch} onClose={() => setShowDevolucion(false)} user={user} />
      )}
      {/* Modal Ingreso */}
      {showIngreso && selectedPV && (
        <IngresoModal ofertas={ofertasPV} tienda={selectedTienda} puntoVenta={selectedPV} puntosVenta={puntosVenta} bodegas={state.bodegas} dispatch={dispatch} onClose={() => setShowIngreso(false)} user={user} />
      )}
      {/* Modal Tienda */}
      {showTiendaModal && (
        <div className="modal-overlay" onClick={() => setShowTiendaModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>🏪 Registrar Tienda</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowTiendaModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Nombre del Negocio *</label><input className="form-input" value={tiendaForm.nombre} onChange={e => setTiendaForm({...tiendaForm, nombre: e.target.value})} placeholder="Ej: Ferretería El Constructor" /></div>
              <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-textarea" value={tiendaForm.descripcion} onChange={e => setTiendaForm({...tiendaForm, descripcion: e.target.value})} placeholder="¿Qué vende tu negocio?" /></div>
              <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={tiendaForm.telefono} onChange={e => setTiendaForm({...tiendaForm, telefono: e.target.value})} placeholder="300 123 4567" /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowTiendaModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleCrearTienda}>Crear Tienda</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
