'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/StoreContext';

const emptyClient = {
  nombre:'', empresa:'', nit:'', email:'', telefono:'', whatsapp:'', telegram_id:'',
  direccion:'', ciudad:'', notas:'', estado:'activo', origen:'manual'
};

const ESTADOS = [
  { value:'activo', label:'Activo', color:'#10b981', icon:'🟢' },
  { value:'prospecto', label:'Prospecto', color:'#f59e0b', icon:'🟡' },
  { value:'inactivo', label:'Inactivo', color:'#94a3b8', icon:'⚪' },
];
const ORIGENES = ['manual','telegram','whatsapp','web','referido'];

export default function CRMView() {
  const { state } = useStore();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterOrigen, setFilterOrigen] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [selectedClient, setSelectedClient] = useState(null);
  const [linkedPersonal, setLinkedPersonal] = useState(null);

  // Load
  useEffect(() => { loadClientes(); }, []);
  async function loadClientes() {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('created_at',{ascending:false});
    setClientes(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (selectedClient) {
      loadLinkedPersonal(selectedClient);
    } else {
      setLinkedPersonal(null);
    }
  }, [selectedClient]);

  async function loadLinkedPersonal(client) {
    if (!client) return;
    const { data } = await supabase.from('personal')
      .select('*')
      .or(`email.eq.${client.email},telegram_id.eq.${client.telegram_id}`)
      .maybeSingle();
    setLinkedPersonal(data || null);
  }

  const filtered = useMemo(() => {
    return clientes.filter(c => {
      const matchSearch = !search || [c.nombre,c.empresa,c.email,c.telefono,c.ciudad].some(f => (f||'').toLowerCase().includes(search.toLowerCase()));
      const matchEstado = filterEstado === 'todos' || c.estado === filterEstado;
      const matchOrigen = filterOrigen === 'todos' || c.origen === filterOrigen || c.plataforma === filterOrigen;
      return matchSearch && matchEstado && matchOrigen;
    });
  }, [clientes, search, filterEstado, filterOrigen]);

  const stats = useMemo(() => ({
    total: clientes.length,
    activos: clientes.filter(c => c.estado==='activo').length,
    prospectos: clientes.filter(c => c.estado==='prospecto').length,
    inactivos: clientes.filter(c => c.estado==='inactivo').length,
  }), [clientes]);

  const openCreate = () => { setEditingId(null); setForm(emptyClient); setShowModal(true); };
  const openEdit = (c) => { setEditingId(c.id); setForm({...emptyClient,...c}); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, updated_at: new Date().toISOString() };
    delete payload.id; delete payload.created_at;
    if (editingId) {
      await supabase.from('clientes').update(payload).eq('id', editingId);
    } else {
      await supabase.from('clientes').insert(payload);
      // Sync: also create in personal table if not exists
      if (form.nombre) {
        const match = form.email
          ? await supabase.from('personal').select('id').eq('email', form.email).maybeSingle()
          : await supabase.from('personal').select('id').ilike('nombre', form.nombre).maybeSingle();
        if (!match?.data) {
          await supabase.from('personal').insert({
            id: crypto.randomUUID(),
            nombre: form.nombre,
            email: form.email || null,
            telefono: form.telefono || null,
            whatsapp: form.whatsapp || null,
            telegram_id: form.telegram_id || null,
            app_role: 'cliente',
            profesion: 'Cliente',
          });
        }
      }
    }
    setShowModal(false);
    loadClientes();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await supabase.from('clientes').delete().eq('id', id);
    if (selectedClient?.id === id) setSelectedClient(null);
    loadClientes();
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const estadoInfo = (e) => ESTADOS.find(s => s.value===e) || ESTADOS[0];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>CRM — Gestión de Clientes</h1>
          <div className="page-header-subtitle">Registro y seguimiento de clientes</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Cliente</button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
        {[
          { label:'Total', val:stats.total, icon:'👥', color:'#6366f1' },
          { label:'Activos', val:stats.activos, icon:'🟢', color:'#10b981' },
          { label:'Prospectos', val:stats.prospectos, icon:'🟡', color:'#f59e0b' },
          { label:'Inactivos', val:stats.inactivos, icon:'⚪', color:'#94a3b8' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderLeft:`4px solid ${s.color}` }}>
            <div style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
        <input className="form-input" style={{ width:300 }} placeholder="🔍 Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" style={{ width:160 }} value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.icon} {e.label}</option>)}
        </select>
        <select className="form-select" style={{ width:160 }} value={filterOrigen} onChange={e => setFilterOrigen(e.target.value)}>
          <option value="todos">Todos los orígenes</option>
          <option value="manual">💻 Manual / Web</option>
          <option value="telegram">📱 Telegram</option>
          <option value="whatsapp">💬 WhatsApp</option>
        </select>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:12, color:'#94a3b8' }}>{filtered.length} cliente{filtered.length!==1?'s':''}</span>
      </div>

      {/* Layout: Table + Detail */}
      <div style={{ display:'grid', gridTemplateColumns: selectedClient ? '1fr 380px' : '1fr', gap:16 }}>
        {/* Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Cargando clientes...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
              <div style={{ fontWeight:600 }}>No hay clientes</div>
              <div style={{ fontSize:12, color:'#94a3b8' }}>Crea tu primer cliente con el botón +</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th>Proyectos / Cotizaciones</th>
                  <th>Origen</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const ei = estadoInfo(c.estado);
                  const isSelected = selectedClient?.id === c.id;
                  return (
                    <tr key={c.id} onClick={() => setSelectedClient(c)} style={{ cursor:'pointer', background: isSelected ? '#f0f9ff' : undefined }}>
                      {(() => {
                        const clientesProyectos = state.proyectos.filter(p => p.cliente === c.nombre);
                        return (
                          <>
                            <td>
                              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14 }}>
                                  {(c.nombre||'?')[0].toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight:600, fontSize:13 }}>{c.nombre}</div>
                                  <div style={{ fontSize:10, color:'#64748b' }}>
                                    {c.empresa || 'Independiente'} 
                                    {c.plataforma === 'telegram' ? ' • 📱 Telegram' : (c.origen === 'whatsapp' ? ' • 💬 WhatsApp' : '')}
                                    {c.creado_por ? ` • 👤 ${c.creado_por.split('@')[0]}` : ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                                {c.email && <span style={{ fontSize:11 }}>📧 {c.email}</span>}
                                {c.telefono && <span style={{ fontSize:11 }}>📱 {c.telefono}</span>}
                              </div>
                            </td>
                            <td style={{ fontSize:12 }}>{c.ciudad || '—'}</td>
                            <td>
                              <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:`${ei.color}18`, color:ei.color, border:`1px solid ${ei.color}40` }}>
                                {ei.icon} {ei.label}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {clientesProyectos.map(p => {
                                  const isCot = p.estado === 'PLANEACION' || p.codigo?.startsWith('COT-');
                                  return (
                                    <span key={p.id} style={{ 
                                      fontSize: 9, 
                                      padding: '2px 6px', 
                                      borderRadius: 4, 
                                      background: isCot ? '#fefce8' : '#fff7ed', 
                                      color: isCot ? '#854d0e' : '#9a3412', 
                                      border: `1px solid ${isCot ? '#fef08a' : '#ffedd5'}`,
                                      whiteSpace: 'nowrap'
                                    }} title={p.nombre}>
                                      {isCot ? '📑' : '🏗️'} {p.codigo || p.nombre}
                                    </span>
                                  );
                                })}
                                {clientesProyectos.length === 0 && (
                                  <span style={{ fontSize: 9, color: '#94a3b8' }}>Sin vínculos</span>
                                )}
                              </div>
                            </td>
                            <td>
                              {(() => {
                                const platform = c.plataforma || c.plataforma_origen || c.origen || 'manual';
                                const icons = { telegram: '📱', whatsapp: '💬', erp: '💻', manual: '✏️', web: '🌐', referido: '🤝' };
                                const colors = { telegram: '#0088cc', whatsapp: '#25d366', erp: '#6366f1', manual: '#94a3b8', web: '#f59e0b', referido: '#8b5cf6' };
                                const color = colors[platform] || '#94a3b8';
                                return (
                                  <span style={{ padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:600, background:`${color}18`, color, border:`1px solid ${color}30` }}>
                                    {icons[platform] || '📋'} {platform}
                                  </span>
                                );
                              })()}
                            </td>
                            <td>
                              <div style={{ display:'flex', gap:4 }}>
                                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>✏️</button>
                                <button className="btn btn-ghost btn-sm" style={{ color:'#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>🗑️</button>
                              </div>
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selectedClient && (
          <div className="card" style={{ padding:20, position:'sticky', top:16, alignSelf:'start' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ margin:0, fontSize:16 }}>Detalle</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedClient(null)}>✕</button>
            </div>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:24, margin:'0 auto 8px' }}>
                {(selectedClient.nombre||'?')[0].toUpperCase()}
              </div>
              <div style={{ fontWeight:700, fontSize:16 }}>{selectedClient.nombre}</div>
              {selectedClient.empresa && <div style={{ fontSize:12, color:'#64748b' }}>{selectedClient.empresa}</div>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { icon:'📧', label:'Email', val:selectedClient.email },
                { icon:'📱', label:'Teléfono', val:selectedClient.telefono },
                { icon:'💬', label:'WhatsApp', val:selectedClient.whatsapp },
                { icon:'✈️', label:'Telegram', val:selectedClient.telegram_id },
                { icon:'🏢', label:'NIT', val:selectedClient.nit },
                { icon:'📍', label:'Dirección', val:selectedClient.direccion },
                { icon:'🌆', label:'Ciudad', val:selectedClient.ciudad },
              ].filter(f => f.val).map(f => (
                <div key={f.label} style={{ display:'flex', gap:8, alignItems:'center', padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <span style={{ fontSize:14 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontSize:9, color:'#94a3b8', fontWeight:600, textTransform:'uppercase' }}>{f.label}</div>
                    <div style={{ fontSize:12, fontWeight:500 }}>{f.val}</div>
                  </div>
                </div>
              ))}
              {selectedClient.notas && (
                <div style={{ marginTop:8, padding:10, background:'#fefce8', borderRadius:8, fontSize:12, border:'1px solid #fde68a' }}>
                  📝 {selectedClient.notas}
                </div>
              )}
              <div style={{ fontSize:10, color:'#94a3b8', marginTop:8 }}>
                Creado: {fmt(selectedClient.created_at)}
              </div>
              
              {/* Proyectos y Cotizaciones del cliente */}
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9a3412', marginBottom:8, borderBottom:'1px solid #ffedd5', paddingBottom:4 }}>📊 Actividad (Proyectos/Cotiz)</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {state.proyectos.filter(p => p.cliente === selectedClient.nombre).map(p => {
                    const isCot = p.estado === 'PLANEACION' || p.codigo?.startsWith('COT-');
                    return (
                      <div key={p.id} style={{ padding:8, background:isCot ? '#fefce8' : '#fff7ed', borderRadius:8, border:`1px solid ${isCot ? '#fef08a' : '#ffedd5'}` }}>
                        <div style={{ fontSize:11, fontWeight:700, color:isCot ? '#854d0e' : '#9a3412' }}>{isCot ? '📑' : '🏗️'} {p.nombre}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                          <span style={{ fontSize:10, color:isCot ? '#a16207' : '#c2410c' }}>{p.codigo || 'S/N'}</span>
                          <span style={{ fontSize:10, padding:'1px 5px', borderRadius:10, background:isCot ? '#fef08a' : '#ffedd5' }}>{p.estado}</span>
                        </div>
                      </div>
                    );
                  })}
                  {state.proyectos.filter(p => p.cliente === selectedClient.nombre).length === 0 && (
                    <div style={{ fontSize:11, color:'#94a3b8', fontStyle:'italic' }}>No hay actividad vinculada</div>
                  )}
                </div>
              </div>
            </div>

            {linkedPersonal ? (
              <div style={{ marginTop:20, padding:12, background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#166534', marginBottom:8 }}>🏗️ Vínculo con Personal</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ fontSize:20 }}>👷</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600 }}>{linkedPersonal.nombre}</div>
                    <div style={{ fontSize:10, color:'#166534' }}>Rol: {linkedPersonal.app_role} · {linkedPersonal.profesion}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop:20, padding:12, background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:8 }}>🏗️ Vínculo con Personal</div>
                <div style={{ fontSize:11, color:'#94a3b8' }}>Este cliente no está registrado como personal interno.</div>
                <button className="btn btn-ghost btn-sm" style={{ width:'100%', marginTop:8, fontSize:10 }} onClick={async () => {
                  const c = selectedClient;
                  if (!c) return;
                  const newId = crypto.randomUUID();
                  const nombre = c.nombre || 'Sin Nombre';
                  try {
                    const payload = {
                      id: newId,
                      nombre,
                      email: c.email || null,
                      telefono: c.telefono || null,
                      whatsapp: c.whatsapp || null,
                      telegram_id: c.telegram_id || null,
                      app_role: 'cliente',
                      profesion: 'Cliente',
                    };
                    await supabase.from('personal').upsert(payload, { onConflict: 'id' });
                    alert(`✅ Perfil de personal creado para "${nombre}"`);
                    loadLinkedPersonal(c);
                  } catch (err) {
                    alert('❌ Error al crear perfil: ' + (err.message || err));
                  }
                }}>+ Crear Perfil de Personal</button>
              </div>
            )}

            <button className="btn btn-primary" style={{ width:'100%', marginTop:16 }} onClick={() => openEdit(selectedClient)}>✏️ Editar Cliente</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h2 className="modal-title">{editingId ? 'Editar' : 'Nuevo'} Cliente</h2>
                <button type="button" className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ maxHeight:'65vh', overflowY:'auto' }}>
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input 
                    className="form-input" 
                    value={form.nombre || ''} 
                    onChange={async (e) => {
                      const val = e.target.value;
                      setForm({...form, nombre: val});
                      if (val.length > 5 && !editingId) {
                        const { data } = await supabase.from('personal').select('*').ilike('nombre', `%${val}%`).limit(1).maybeSingle();
                        if (data && confirm(`¿Autocompletar datos desde el perfil de personal de "${data.nombre}"?`)) {
                          setForm({
                            ...form,
                            nombre: data.nombre,
                            email: data.email || form.email,
                            telefono: data.telefono || form.telefono,
                            whatsapp: data.whatsapp || form.whatsapp,
                            telegram_id: data.telegram_id || form.telegram_id,
                            ciudad: data.ciudad || form.ciudad,
                          });
                        }
                      }
                    }} 
                    required 
                    placeholder="Nombre del cliente" 
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Empresa</label>
                    <input className="form-input" value={form.empresa || ''} onChange={e => setForm({...form, empresa:e.target.value})} placeholder="Razón social" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">NIT / Cédula</label>
                    <input className="form-input" value={form.nit || ''} onChange={e => setForm({...form, nit:e.target.value})} placeholder="900.123.456-7" />
                  </div>
                </div>
                <div style={{ marginTop:16, padding:12, background:'#f0f9ff', borderRadius:10, border:'1px solid #bae6fd' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0369a1', marginBottom:10 }}>📞 Información de Contacto</div>
                  <div className="form-group">
                    <label className="form-label">📧 Email</label>
                    <input 
                      className="form-input" 
                      type="email" 
                      value={form.email || ''} 
                      onChange={async (e) => {
                        const val = e.target.value;
                        setForm({...form, email: val});
                        if (val.includes('@') && val.length > 5 && !editingId) {
                          const { data } = await supabase.from('personal').select('*').eq('email', val).maybeSingle();
                          if (data && confirm(`¿Autocompletar datos desde el perfil de personal de "${data.nombre}"?`)) {
                            setForm({
                              ...form,
                              nombre: data.nombre,
                              email: data.email,
                              telefono: data.telefono || form.telefono,
                              whatsapp: data.whatsapp || form.whatsapp,
                              telegram_id: data.telegram_id || form.telegram_id,
                              ciudad: data.ciudad || form.ciudad,
                            });
                          }
                        }
                      }} 
                      placeholder="correo@ejemplo.com" 
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">📱 Teléfono</label>
                      <input className="form-input" value={form.telefono || ''} onChange={e => setForm({...form, telefono:e.target.value})} placeholder="+57 300 123 4567" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">💬 WhatsApp</label>
                      <input className="form-input" value={form.whatsapp || ''} onChange={e => setForm({...form, whatsapp:e.target.value})} placeholder="+57 300 123 4567" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">✈️ Telegram ID</label>
                    <input className="form-input" value={form.telegram_id || ''} onChange={e => setForm({...form, telegram_id:e.target.value})} placeholder="@username o ID numérico" />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop:16 }}>
                  <div className="form-group">
                    <label className="form-label">📍 Dirección</label>
                    <input className="form-input" value={form.direccion || ''} onChange={e => setForm({...form, direccion:e.target.value})} placeholder="Cra 44 #20-05" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🌆 Ciudad</label>
                    <input className="form-input" value={form.ciudad || ''} onChange={e => setForm({...form, ciudad:e.target.value})} placeholder="Pasto" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={form.estado} onChange={e => setForm({...form, estado:e.target.value})}>
                      {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.icon} {e.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Origen</label>
                    <select className="form-select" value={form.origen} onChange={e => setForm({...form, origen:e.target.value})}>
                      {ORIGENES.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">📝 Notas</label>
                  <textarea className="form-input" rows={3} value={form.notas || ''} onChange={e => setForm({...form, notas:e.target.value})} placeholder="Observaciones sobre el cliente..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Crear Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
