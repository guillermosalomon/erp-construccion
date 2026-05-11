'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';
import { calcularPrecioMercado, calcularDiferencia, proyectarPrecios } from '@/lib/price-engine';

const TIPOS = [
  { value: 'MATERIAL', label: 'Material', color: '#2563eb' },
  { value: 'EQUIPO', label: 'Equipo', color: '#7c3aed' },
  { value: 'TRANSPORTE', label: 'Transporte', color: '#d97706' },
];
const CATEGORIAS = ['Básicos','Aceros','Madera','Ferretería','Tuberías y Accesorios','Eléctricos','Herramientas','Agregados','Mampostería','Pinturas','Otros'];
const fmt = v => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(v);

export default function MarketplaceView() {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterCiudad, setFilterCiudad] = useState('');
  const [vistaMode, setVistaMode] = useState('agrupado');
  const [showCarrito, setShowCarrito] = useState(false);
  const [carrito, setCarrito] = useState([]);
  const [showProyeccion, setShowProyeccion] = useState(null);

  // SOLO ofertas publicadas en marketplace desde un POS real
  const ofertasPublicadas = useMemo(() =>
    state.mkOfertas.filter(o => o.publicado_marketplace && o.activo !== false),
  [state.mkOfertas]);

  // Agrupar por insumo
  const insumosConOfertas = useMemo(() => {
    const ids = [...new Set(ofertasPublicadas.map(o => o.insumo_id))];
    return ids.map(iid => {
      const insumo = state.insumos.find(i => i.id === iid) || { id: iid, nombre: '—', tipo: 'MATERIAL', categoria: 'Otros', unidad: 'un', precio_unitario: 0 };
      const ofertas = ofertasPublicadas.filter(o => o.insumo_id === iid);
      const mercado = calcularPrecioMercado(iid, ofertasPublicadas, filterCiudad);
      const diff = calcularDiferencia(insumo.precio_unitario, mercado?.precio_mercado);
      return { ...insumo, ofertas, mercado, diff };
    });
  }, [ofertasPublicadas, state.insumos, filterCiudad]);

  const filtered = useMemo(() => insumosConOfertas.filter(i => {
    const ms = !search || i.nombre?.toLowerCase().includes(search.toLowerCase());
    const mt = !filterTipo || i.tipo === filterTipo;
    const mc = !filterCategoria || i.categoria === filterCategoria;
    return ms && mt && mc;
  }), [insumosConOfertas, search, filterTipo, filterCategoria]);

  const ofertasFlat = useMemo(() => filtered.flatMap(i => i.ofertas.map(o => ({ ...o, insumo: i }))), [filtered]);

  const addToCarrito = (oferta, insumo) => {
    const stockDisp = oferta.stock_disponible || 0;
    if (stockDisp <= 0) return;
    setCarrito(prev => {
      const ex = prev.find(i => i.id === oferta.id);
      if (ex) {
        if (ex.cantidad >= stockDisp) return prev; // No exceder stock
        return prev.map(i => i.id === oferta.id ? {...i, cantidad: i.cantidad+1} : i);
      }
      return [...prev, { ...oferta, insumo_nombre: insumo.nombre, unidad: insumo.unidad, cantidad: 1, stock_max: stockDisp }];
    });
  };
  const removeFromCarrito = id => setCarrito(p => p.filter(i => i.id !== id));
  const totalCarrito = carrito.reduce((s,i) => s + i.precio_venta * i.cantidad, 0);

  const DiffBadge = ({ diff }) => {
    if (!diff || diff.porcentaje === 0) return null;
    const c = diff.direccion === 'arriba' ? '#ef4444' : '#16a34a';
    const bg = diff.direccion === 'arriba' ? '#fef2f2' : '#f0fdf4';
    return <span style={{ fontSize:10, fontWeight:700, color:c, background:bg, padding:'2px 6px', borderRadius:4 }}>{diff.icono} {diff.porcentaje > 0 ? '+' : ''}{diff.porcentaje}%</span>;
  };

  // ════ EMPTY STATE ════
  if (ofertasPublicadas.length === 0) {
    return (
      <>
        <div className="page-header"><div><h1>🛒 Marketplace</h1><div className="page-header-subtitle">Precios reales de materiales · Conectado a tus APU</div></div></div>
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="empty-state-icon">🛒</div>
          <h3>Marketplace vacío</h3>
          <p style={{ maxWidth: 400, margin: '8px auto', lineHeight: 1.5 }}>
            Aún no hay productos publicados. Las tiendas deben crear ofertas desde su <strong>Punto de Venta</strong> y activar el toggle <strong>"Publicar en Marketplace"</strong>.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 11, color: '#64748b', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>1️⃣</div>
              Crear Insumos
            </div>
            <div style={{ fontSize: 20, alignSelf: 'center', color: '#cbd5e1' }}>→</div>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 11, color: '#64748b', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>2️⃣</div>
              Punto de Venta
            </div>
            <div style={{ fontSize: 20, alignSelf: 'center', color: '#cbd5e1' }}>→</div>
            <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, fontSize: 11, color: '#2563eb', textAlign: 'center', fontWeight: 600 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>3️⃣</div>
              Marketplace
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div><h1>🛒 Marketplace</h1><div className="page-header-subtitle">Precios reales de materiales · Conectado a tus APU</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {carrito.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowCarrito(true)} style={{ position: 'relative' }}>
              🛒 Carrito
              <span style={{ position:'absolute',top:-6,right:-6,width:18,height:18,borderRadius:'50%',background:'#ef4444',color:'white',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>{carrito.length}</span>
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="toolbar" style={{ flexWrap:'wrap' }}>
          <div className="search-bar">
            <svg className="search-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="form-input" placeholder="Buscar materiales..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:36, width:220 }} />
          </div>
          <select className="form-select" value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{width:130}}><option value="">Todos los tipos</option>{TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          <select className="form-select" value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} style={{width:160}}><option value="">Todas las categorías</option>{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <input className="form-input" placeholder="📍 Ciudad..." value={filterCiudad} onChange={e => setFilterCiudad(e.target.value)} style={{width:130}} />
          <div className="toolbar-spacer" />
          <div style={{ display:'flex', gap:2, background:'#f1f5f9', borderRadius:8, padding:3 }}>
            {[{k:'agrupado',l:'📦 Por Insumo',c:'#2563eb'},{k:'tienda',l:'🏪 Por Tienda',c:'#d97706'}].map(v => (
              <button key={v.k} onClick={() => setVistaMode(v.k)} style={{ padding:'5px 12px',borderRadius:6,border:'none',background:vistaMode===v.k?'white':'transparent',cursor:'pointer',fontSize:11,fontWeight:600,boxShadow:vistaMode===v.k?'0 1px 3px rgba(0,0,0,0.1)':'none',color:vistaMode===v.k?v.c:'#64748b' }}>{v.l}</button>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {CATEGORIAS.map(cat => (
            <button key={cat} onClick={() => setFilterCategoria(filterCategoria===cat?'':cat)} style={{ padding:'4px 10px',borderRadius:16,fontSize:10,fontWeight:600,border:filterCategoria===cat?'1.5px solid #2563eb':'1px solid #e2e8f0',background:filterCategoria===cat?'#eff6ff':'white',color:filterCategoria===cat?'#2563eb':'#64748b',cursor:'pointer' }}>{cat}</button>
          ))}
        </div>

        {/* VISTA AGRUPADA */}
        {vistaMode === 'agrupado' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(insumo => (
              <div key={insumo.id} style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ width:44,height:44,borderRadius:10,background:'linear-gradient(135deg,#f8fafc,#eef2ff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>📦</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                      <span style={{ fontSize:14, fontWeight:700 }}>{insumo.nombre}</span>
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:TIPOS.find(t=>t.value===insumo.tipo)?.color||'#64748b', color:'white' }}>{insumo.tipo}</span>
                      <span style={{ fontSize:9, color:'#94a3b8' }}>{insumo.categoria}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{insumo.ofertas.length} vendedor{insumo.ofertas.length!==1?'es':''} · {insumo.unidad}</div>
                  </div>
                  <div style={{ textAlign:'right', minWidth:160 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                      <span style={{ fontSize:10, color:'#94a3b8' }}>Ref APU:</span>
                      <span style={{ fontSize:12, color:'#64748b', textDecoration:insumo.mercado?'line-through':'none' }}>{fmt(insumo.precio_unitario)}</span>
                    </div>
                    {insumo.mercado && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end', marginTop:2 }}>
                        <span style={{ fontSize:10, color:'#2563eb' }}>Mercado:</span>
                        <span style={{ fontSize:16, fontWeight:800, color:'#2563eb' }}>{fmt(insumo.mercado.precio_mercado)}</span>
                        <DiffBadge diff={insumo.diff} />
                      </div>
                    )}
                    {insumo.mercado && (
                      <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>
                        Desde {fmt(insumo.mercado.precio_mas_bajo)}
                        <button onClick={() => setShowProyeccion(showProyeccion===insumo.id?null:insumo.id)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:9,color:'#2563eb',marginLeft:6 }}>📊 Proyectar</button>
                      </div>
                    )}
                  </div>
                </div>
                {showProyeccion===insumo.id && insumo.mercado && (() => {
                  const p = proyectarPrecios(insumo.mercado.precio_mercado);
                  return (
                    <div style={{ padding:'10px 18px', background:'#fafbfe', borderBottom:'1px solid #f1f5f9', display:'flex', gap:16 }}>
                      <span style={{ fontSize:10, color:'#64748b', fontWeight:600 }}>📊 Proyección:</span>
                      {[{l:'Actual',v:p.actual},{l:'3 meses',v:p.meses_3},{l:'6 meses',v:p.meses_6},{l:'1 año',v:p.anio_1},{l:'4 años',v:p.anios_4}].map(x => (
                        <div key={x.l} style={{ textAlign:'center' }}><div style={{ fontSize:9, color:'#94a3b8' }}>{x.l}</div><div style={{ fontSize:11, fontWeight:700 }}>{fmt(x.v)}</div></div>
                      ))}
                    </div>
                  );
                })()}
                <div style={{ padding:'8px 18px 12px' }}>
                  {insumo.ofertas.map(oferta => {
                    const stock = oferta.stock_disponible || 0;
                    const sinStock = stock <= 0;
                    return (
                      <div key={oferta.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f8fafc', opacity: sinStock ? 0.5 : 1 }}>
                        <span style={{ fontSize:12 }}>🏪</span>
                        <div style={{ flex:1 }}>
                          <span style={{ fontSize:12, fontWeight:600 }}>{oferta.tienda_nombre || 'Tienda'}</span>
                          <span style={{ fontSize:10, color:'#94a3b8', marginLeft:8 }}>📍 {oferta.ciudad}</span>
                        </div>
                        <span style={{ fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:4, background: sinStock ? '#fef2f2' : '#f0fdf4', color: sinStock ? '#ef4444' : '#16a34a' }}>
                          {sinStock ? 'Agotado' : `Stock: ${stock}`}
                        </span>
                        <span style={{ fontSize:14, fontWeight:800 }}>{fmt(oferta.precio_venta)}</span>
                        <button className="btn btn-primary btn-sm" style={{ fontSize:10, padding:'4px 10px' }} onClick={() => addToCarrito(oferta, insumo)} disabled={sinStock}>🛒 Agregar</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISTA POR TIENDA */}
        {vistaMode === 'tienda' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:14 }}>
            {ofertasFlat.map(oferta => {
              const ti = TIPOS.find(t => t.value === oferta.insumo?.tipo);
              return (
                <div key={oferta.id} style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden', transition:'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
                  <div style={{ height:80, background:'linear-gradient(135deg,#f8fafc,#eef2ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, position:'relative' }}>
                    📦<div style={{ position:'absolute',top:6,right:6,fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:5,color:'white',background:ti?.color||'#64748b' }}>{ti?.label}</div>
                  </div>
                  <div style={{ padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'#94a3b8' }}>{oferta.insumo?.categoria}</div>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{oferta.nombre_comercial || oferta.insumo?.nombre}</div>
                    <div style={{ fontSize:10, color:'#64748b', marginBottom:6 }}>🏪 {oferta.tienda_nombre} · 📍 {oferta.ciudad}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
                      <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:4, background: (oferta.stock_disponible||0)>0 ? '#f0fdf4' : '#fef2f2', color: (oferta.stock_disponible||0)>0 ? '#16a34a' : '#ef4444' }}>
                        {(oferta.stock_disponible||0) > 0 ? `Stock: ${oferta.stock_disponible}` : 'Agotado'}
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div><div style={{ fontSize:15, fontWeight:800, color:'#2563eb' }}>{fmt(oferta.precio_venta)}</div><div style={{ fontSize:9, color:'#94a3b8' }}>/{oferta.insumo?.unidad}</div></div>
                      <button className="btn btn-primary btn-sm" style={{ fontSize:10, padding:'4px 10px' }} onClick={() => addToCarrito(oferta, oferta.insumo)} disabled={(oferta.stock_disponible||0)<=0}>🛒</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Carrito */}
      {showCarrito && (
        <div className="modal-overlay" onClick={() => setShowCarrito(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:520 }}>
            <div className="modal-header"><h2>🛒 Carrito</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowCarrito(false)}>✕</button></div>
            <div className="modal-body">
              {carrito.length === 0 ? (
                <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}><div style={{ fontSize:40 }}>🛒</div><p>Vacío</p></div>
              ) : (<>
                {carrito.map(item => (
                  <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:600 }}>{item.insumo_nombre}</div>
                      <div style={{ fontSize:10, color:'#64748b' }}>{fmt(item.precio_venta)}/{item.unidad} · 🏪 {item.tienda_nombre}</div>
                      <div style={{ fontSize:9, color:'#94a3b8' }}>Disponible: {item.stock_max || item.stock_disponible || '—'}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <button onClick={() => setCarrito(p => p.map(i => i.id===item.id?{...i,cantidad:Math.max(1,i.cantidad-1)}:i))} style={{ width:22,height:22,borderRadius:4,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',fontSize:11 }}>−</button>
                      <span style={{ fontSize:12, fontWeight:700, minWidth:16, textAlign:'center' }}>{item.cantidad}</span>
                      <button onClick={() => setCarrito(p => p.map(i => i.id===item.id?{...i,cantidad:Math.min(i.cantidad+1, i.stock_max || i.stock_disponible || 999)}:i))} style={{ width:22,height:22,borderRadius:4,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',fontSize:11 }}>+</button>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#2563eb', minWidth:70, textAlign:'right' }}>{fmt(item.precio_venta*item.cantidad)}</div>
                    <button onClick={() => removeFromCarrito(item.id)} style={{ background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:12 }}>✕</button>
                  </div>
                ))}
                <div style={{ marginTop:14, padding:'12px 0', borderTop:'2px solid #e2e8f0', display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Total</span><span style={{ fontSize:18, fontWeight:800 }}>{fmt(totalCarrito)}</span>
                </div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>+ Comisión 5%</div>
              </>)}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCarrito(false)}>Seguir</button>
              {carrito.length > 0 && <button className="btn btn-primary" onClick={() => {
                // Descontar stock de cada oferta en el POS
                carrito.forEach(item => {
                  const oferta = state.mkOfertas.find(o => o.id === item.id);
                  if (oferta) {
                    dispatch({
                      type: 'UPDATE_MK_OFERTA',
                      payload: { id: oferta.id, stock_disponible: Math.max(0, (oferta.stock_disponible || 0) - item.cantidad) }
                    });
                  }
                });
                dispatch({ type:'ADD_MK_PEDIDO', payload:{ comprador_id:user?.id, estado:'PENDIENTE', subtotal:totalCarrito, comision:totalCarrito*0.05, total:totalCarrito*1.05, items:carrito, usuario_id: user?.id, usuario_nombre: user?.user_metadata?.nombre || user?.email || 'Comprador' }});
                setCarrito([]); setShowCarrito(false); alert('✅ Pedido enviado. El stock fue reservado.');
              }}>📦 Enviar — {fmt(totalCarrito*1.05)}</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
