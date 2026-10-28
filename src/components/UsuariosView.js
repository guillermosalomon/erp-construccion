'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/store/StoreContext';
import {
  ROLES_PERFIL, cargarDirectorio, guardarPerfil, vincularPerfil, normEmail, digitos, unirRoles,
} from '@/lib/identidad';

const TIPOS_VINCULO = [
  { tabla: 'personal', key: 'personal', label: 'Personal', icon: '👷', color: '#10b981' },
  { tabla: 'clientes', key: 'clientes', label: 'Cliente', icon: '🤝', color: '#6366f1' },
  { tabla: 'erp_proveedores', key: 'proveedores', label: 'Proveedor', icon: '🏭', color: '#f59e0b' },
  { tabla: 'chat_usuarios', key: 'chats', label: 'Chat', icon: '💬', color: '#0ea5e9' },
];

const esCotizacion = (p) => p.estado === 'PLANEACION' || String(p.codigo || '').startsWith('COT-');
const rolesDe = (p) => unirRoles(Array.isArray(p.roles) ? p.roles : [], p.role || []);
const nombreDe = (r) => r.nombre || [r.nombres, r.apellidos].filter(Boolean).join(' ') || r.razon_social || r.email || '(sin nombre)';

const emptyInvite = { email: '', nombre: '', role: 'CLIENTE', telefono: '', ciudad: '' };
const emptyRegistro = { tipo: 'clientes', nombre: '', email: '', telefono: '', ciudad: '', app_role: 'cuadrilla' };

export default function UsuariosView() {
  const { session } = useAuth();
  const { dispatch } = useStore();
  const [dir, setDir] = useState({ perfiles: [], personal: [], clientes: [], proveedores: [], chats: [], proyectos: [], pedidos: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [editando, setEditando] = useState(null);
  const [vinculando, setVinculando] = useState(null);
  const [vinculoTabla, setVinculoTabla] = useState('personal');
  const [vinculoBusqueda, setVinculoBusqueda] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState(emptyInvite);
  const [showRegistro, setShowRegistro] = useState(false);
  const [registro, setRegistro] = useState(emptyRegistro);
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setDir(await cargarDirectorio());
    setLoading(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // Vínculos y actividad por perfil
  const filas = useMemo(() => dir.perfiles.map((p) => {
    const em = normEmail(p.email);
    const tel = digitos(p.telefono || p.whatsapp);
    const vinculos = {};
    const sugeridos = {};
    TIPOS_VINCULO.forEach(({ key }) => {
      const lista = dir[key] || [];
      vinculos[key] = lista.filter((r) => r.profile_id === p.id || (key === 'personal' && !r.profile_id && r.user_id === p.id));
      sugeridos[key] = lista.filter((r) => !r.profile_id && !(key === 'personal' && r.user_id === p.id) && (
        (em && normEmail(r.email) === em) || (tel.length >= 7 && [r.telefono, r.whatsapp].some((t) => digitos(t) === tel))
      ));
    });
    const clienteIds = new Set(vinculos.clientes.map((c) => c.id));
    const clienteNombres = new Set(vinculos.clientes.map((c) => c.nombre).filter(Boolean));
    const proys = dir.proyectos.filter((pr) => pr.user_id === p.id || (pr.cliente_id && clienteIds.has(pr.cliente_id)) || (pr.cliente && clienteNombres.has(pr.cliente)));
    return {
      perfil: p,
      roles: rolesDe(p),
      vinculos,
      sugeridos,
      nProyectos: proys.filter((x) => !esCotizacion(x)).length,
      nCotizaciones: proys.filter(esCotizacion).length,
      nPedidos: dir.pedidos.filter((pe) => pe.comprador_id === p.id).length,
    };
  }), [dir]);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filas.filter((f) => {
      const p = f.perfil;
      const okQ = !q || [p.nombre, p.email, p.telefono, p.ciudad, p.empresa, p.documento].some((v) => String(v || '').toLowerCase().includes(q));
      const okRol = filtroRol === 'todos' || f.roles.includes(filtroRol);
      return okQ && okRol;
    });
  }, [filas, search, filtroRol]);

  const stats = useMemo(() => ({
    total: filas.length,
    staff: filas.filter((f) => f.roles.some((r) => r !== 'CLIENTE')).length,
    clientes: filas.filter((f) => f.roles.includes('CLIENTE')).length,
    sinVinculo: filas.filter((f) => TIPOS_VINCULO.every(({ key }) => f.vinculos[key].length === 0)).length,
    sueltos: ['personal', 'clientes'].reduce((n, k) => n + dir[k].filter((r) => !r.profile_id && !(k === 'personal' && r.user_id)).length, 0),
  }), [filas, dir]);

  const rolesDisponibles = useMemo(() => unirRoles(ROLES_PERFIL, ...filas.map((f) => f.roles)), [filas]);

  // ── Acciones ──
  const abrirEdicion = (p) => setEditando({
    id: p.id, email: p.email, nombre: p.nombre || '', telefono: p.telefono || '', whatsapp: p.whatsapp || '',
    documento: p.documento || '', ciudad: p.ciudad || '', empresa: p.empresa || '',
    role: String(p.role || 'CLIENTE').toUpperCase(), roles: rolesDe(p), activo: p.activo !== false,
    estado_verificacion: p.estado_verificacion || 'PENDIENTE',
  });

  const toggleVerificacion = async (fila) => {
    const p = fila.perfil;
    const actual = p.estado_verificacion || fila.vinculos.personal?.[0]?.estado_verificacion || 'PENDIENTE';
    const nuevo = actual === 'VERIFICADO' ? 'PENDIENTE' : 'VERIFICADO';
    try {
      await guardarPerfil(p.id, { estado_verificacion: nuevo });
      if (fila.vinculos.personal?.length) {
        for (const pers of fila.vinculos.personal) {
          await supabase.from('personal').update({ estado_verificacion: nuevo }).eq('id', pers.id);
        }
      } else {
        await supabase.from('personal').update({ estado_verificacion: nuevo }).or(`profile_id.eq.${p.id},user_id.eq.${p.id}`);
      }
      await cargar();
    } catch (err) {
      alert('No se pudo actualizar estado de verificación: ' + (err.message || err));
    }
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { id, ...resto } = editando;
      delete resto.email;
      const roles = unirRoles(resto.role, resto.roles);
      const r = await guardarPerfil(id, { ...resto, roles });
      if (r.parcial) alert('Guardado parcial: faltan columnas nuevas en profiles (ejecute migration-fase20).');
      setEditando(null);
      await cargar();
    } catch (err) {
      alert('No se pudo guardar el perfil: ' + (err.message || err));
    }
    setBusy(false);
  };

  const vincular = async (tabla, registroId, profileId) => {
    try {
      await vincularPerfil(tabla, registroId, profileId);
      await cargar();
    } catch (err) {
      alert('No se pudo vincular: ' + (err.message || err));
    }
  };

  const enviarInvitacion = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/usuarios/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify(invite),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        alert(data.error || `Error ${res.status}`);
      } else {
        alert(data.mensaje || 'Invitación enviada');
        setShowInvite(false);
        setInvite(emptyInvite);
        await cargar();
      }
    } catch (err) {
      alert('Error de conexión: ' + err.message);
    }
    setBusy(false);
  };

  const crearRegistro = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (registro.tipo === 'clientes') {
        const { error } = await supabase.from('clientes').insert({
          nombre: registro.nombre, email: registro.email || null, telefono: registro.telefono || null,
          ciudad: registro.ciudad || null, estado: 'activo', origen: 'manual',
        });
        if (error) throw error;
      } else {
        const parts = registro.nombre.trim().split(' ');
        dispatch({ type: 'ADD_PERSON', payload: {
          id: crypto.randomUUID(), nombre: registro.nombre.trim(), nombres: parts[0] || '', apellidos: parts.slice(1).join(' '),
          email: registro.email || '', telefono: registro.telefono || '', ciudad: registro.ciudad || '', app_role: registro.app_role,
        } });
      }
      setShowRegistro(false);
      setRegistro(emptyRegistro);
      setTimeout(cargar, 600);
    } catch (err) {
      alert('No se pudo crear: ' + (err.message || err));
    }
    setBusy(false);
  };

  // Candidatos para el modal de vínculo
  const candidatos = useMemo(() => {
    if (!vinculando) return [];
    const tipo = TIPOS_VINCULO.find((t) => t.tabla === vinculoTabla);
    const q = vinculoBusqueda.trim().toLowerCase();
    const em = normEmail(vinculando.email);
    return (dir[tipo.key] || [])
      .filter((r) => r.profile_id !== vinculando.id)
      .filter((r) => !q || [nombreDe(r), r.email, r.telefono, r.nit].some((v) => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => (Number(normEmail(b.email) === em) - Number(normEmail(a.email) === em)) || (Number(!b.profile_id) - Number(!a.profile_id)))
      .slice(0, 50);
  }, [vinculando, vinculoTabla, vinculoBusqueda, dir]);

  const badge = (tipo, r, sugerido = false, profileId = null) => (
    <span
      key={`${sugerido ? 's-' : ''}${tipo.key}-${r.id}`}
      title={sugerido ? `Coincide por email/teléfono. Clic para vincular: ${nombreDe(r)}` : nombreDe(r)}
      onClick={sugerido ? (e) => { e.stopPropagation(); vincular(tipo.tabla, r.id, profileId); } : undefined}
      style={{
        fontSize: 10, padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap', cursor: sugerido ? 'pointer' : 'default',
        background: sugerido ? 'transparent' : `${tipo.color}18`, color: tipo.color,
        border: `1px ${sugerido ? 'dashed' : 'solid'} ${tipo.color}60`,
      }}
    >
      {tipo.icon} {tipo.label}{sugerido ? ' · vincular' : ''}
    </span>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Usuarios y perfiles</h1>
          <div className="page-header-subtitle">Una sola identidad para la web y el ERP: roles, vínculos y actividad</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowRegistro(true)}>+ Registro sin cuenta</button>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>✉️ Invitar usuario</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Perfiles', val: stats.total, color: '#6366f1' },
          { label: 'Equipo interno', val: stats.staff, color: '#10b981' },
          { label: 'Clientes web', val: stats.clientes, color: '#0ea5e9' },
          { label: 'Perfiles sin vínculo', val: stats.sinVinculo, color: '#f59e0b' },
          { label: 'Registros sin perfil', val: stats.sueltos, color: '#94a3b8' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input className="form-input" style={{ width: 300 }} placeholder="🔍 Buscar por nombre, correo, teléfono..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="form-select" style={{ width: 180 }} value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
          <option value="todos">Todos los roles</option>
          {rolesDisponibles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={cargar} disabled={loading}>↻ Actualizar</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{filtradas.length} perfil{filtradas.length !== 1 ? 'es' : ''}</span>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando perfiles...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No hay perfiles que coincidan</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Roles</th>
                <th>Vínculos</th>
                <th style={{ textAlign: 'center' }}>Proyectos</th>
                <th style={{ textAlign: 'center' }}>Cotizaciones</th>
                <th style={{ textAlign: 'center' }}>Pedidos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => {
                const p = f.perfil;
                return (
                  <tr key={p.id} style={{ opacity: p.activo === false ? 0.5 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre || p.email?.split('@')[0] || '—'}</div>
                        {(p.estado_verificacion === 'VERIFICADO' || f.vinculos.personal?.some(per => per.estado_verificacion === 'VERIFICADO')) && (
                          <span title="Perfil Verificado en Red de Talento Kalarti" style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10, background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
                            ✔ Verificado
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{p.email}</div>
                      {(p.telefono || p.ciudad) && <div style={{ fontSize: 10, color: '#94a3b8' }}>{[p.telefono, p.ciudad].filter(Boolean).join(' · ')}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {f.roles.map((r) => (
                          <span key={r} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: r === 'CLIENTE' ? '#e0f2fe' : '#ede9fe', color: r === 'CLIENTE' ? '#0369a1' : '#6d28d9' }}>{r}</span>
                        ))}
                        {p.activo === false && <span style={{ fontSize: 10, color: '#ef4444' }}>Inactivo</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {TIPOS_VINCULO.map((t) => f.vinculos[t.key].map((r) => badge(t, r)))}
                        {TIPOS_VINCULO.map((t) => f.sugeridos[t.key].map((r) => badge(t, r, true, p.id)))}
                        {TIPOS_VINCULO.every((t) => !f.vinculos[t.key].length && !f.sugeridos[t.key].length) && <span style={{ fontSize: 10, color: '#94a3b8' }}>Sin vínculos</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{f.nProyectos}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{f.nCotizaciones}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{f.nPedidos}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          title={(p.estado_verificacion === 'VERIFICADO' || f.vinculos.personal?.some(per => per.estado_verificacion === 'VERIFICADO')) ? 'Quitar insignia Verificado' : 'Otorgar insignia ✔ Verificado (Red de Talento)'}
                          style={{ color: (p.estado_verificacion === 'VERIFICADO' || f.vinculos.personal?.some(per => per.estado_verificacion === 'VERIFICADO')) ? '#16a34a' : '#94a3b8', fontWeight: 800 }}
                          onClick={() => toggleVerificacion(f)}
                        >
                          ✔
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Editar perfil y roles" onClick={() => abrirEdicion(p)}>✏️</button>
                        <button className="btn btn-ghost btn-sm" title="Vincular registro" onClick={() => { setVinculando(p); setVinculoBusqueda(''); setVinculoTabla('personal'); }}>🔗</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Editar perfil */}
      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={guardarEdicion}>
              <div className="modal-header">
                <h2 className="modal-title">Editar perfil</h2>
                <button type="button" className="modal-close" onClick={() => setEditando(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{editando.email}</div>
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="form-input" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={editando.telefono} onChange={(e) => setEditando({ ...editando, telefono: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" value={editando.whatsapp} onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Documento</label><input className="form-input" value={editando.documento} onChange={(e) => setEditando({ ...editando, documento: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Ciudad</label><input className="form-input" value={editando.ciudad} onChange={(e) => setEditando({ ...editando, ciudad: e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Empresa</label><input className="form-input" value={editando.empresa} onChange={(e) => setEditando({ ...editando, empresa: e.target.value })} /></div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rol principal</label>
                    <select className="form-select" value={editando.role} onChange={(e) => setEditando({ ...editando, role: e.target.value })}>
                      {unirRoles(ROLES_PERFIL, editando.role).map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 8 }}>
                      <input type="checkbox" checked={editando.activo} onChange={(e) => setEditando({ ...editando, activo: e.target.checked })} /> Activo
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Roles adicionales</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {unirRoles(ROLES_PERFIL, editando.roles).map((r) => (
                      <label key={r} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={editando.roles.includes(r) || editando.role === r}
                          disabled={editando.role === r}
                          onChange={(e) => setEditando({ ...editando, roles: e.target.checked ? unirRoles(editando.roles, r) : editando.roles.filter((x) => x !== r) })}
                        /> {r}
                      </label>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>El acceso al ERP de campo sigue usando el rol de acceso del registro de Personal.</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vincular registro */}
      {vinculando && (
        <div className="modal-overlay" onClick={() => setVinculando(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Vincular a {vinculando.nombre || vinculando.email}</h2>
              <button type="button" className="modal-close" onClick={() => setVinculando(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {TIPOS_VINCULO.map((t) => (
                  <button key={t.tabla} type="button" className={`btn btn-sm ${vinculoTabla === t.tabla ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setVinculoTabla(t.tabla)}>{t.icon} {t.label}</button>
                ))}
              </div>
              <input className="form-input" placeholder="Buscar registro..." value={vinculoBusqueda} onChange={(e) => setVinculoBusqueda(e.target.value)} style={{ marginBottom: 12 }} />
              {candidatos.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Sin registros disponibles</div>
              ) : candidatos.map((r) => {
                const otro = r.profile_id ? dir.perfiles.find((x) => x.id === r.profile_id) : null;
                const coincide = normEmail(r.email) && normEmail(r.email) === normEmail(vinculando.email);
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{nombreDe(r)} {coincide && <span style={{ fontSize: 10, color: '#10b981' }}>· mismo correo</span>}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{[r.email, r.telefono, r.app_role].filter(Boolean).join(' · ') || '—'}</div>
                      {otro && <div style={{ fontSize: 10, color: '#f59e0b' }}>Vinculado a {otro.email}</div>}
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={async () => {
                      if (otro && !confirm(`Este registro está vinculado a ${otro.email}. ¿Reasignarlo?`)) return;
                      await vincular(vinculoTabla, r.id, vinculando.id);
                    }}>Vincular</button>
                  </div>
                );
              })}
              {(() => {
                const fila = filas.find((x) => x.perfil.id === vinculando.id);
                const tipo = TIPOS_VINCULO.find((t) => t.tabla === vinculoTabla);
                const actuales = fila?.vinculos[tipo.key] || [];
                if (!actuales.length) return null;
                return (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Vinculados actualmente</div>
                    {actuales.map((r) => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px' }}>
                        <div style={{ flex: 1, fontSize: 12 }}>{tipo.icon} {nombreDe(r)} <span style={{ color: '#94a3b8' }}>{r.email}</span></div>
                        {r.profile_id && <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => vincular(vinculoTabla, r.id, null)}>Desvincular</button>}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Invitar */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={enviarInvitacion}>
              <div className="modal-header">
                <h2 className="modal-title">Invitar usuario</h2>
                <button type="button" className="modal-close" onClick={() => setShowInvite(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Correo *</label><input className="form-input" type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={invite.nombre} onChange={(e) => setInvite({ ...invite, nombre: e.target.value })} /></div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rol</label>
                    <select className="form-select" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
                      {ROLES_PERFIL.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={invite.telefono} onChange={(e) => setInvite({ ...invite, telefono: e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Ciudad</label><input className="form-input" value={invite.ciudad} onChange={(e) => setInvite({ ...invite, ciudad: e.target.value })} /></div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Se enviará un correo para que la persona cree su contraseña. Al ingresar, su perfil quedará enlazado automáticamente.</div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowInvite(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Enviando...' : 'Enviar invitación'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registro sin cuenta */}
      {showRegistro && (
        <div className="modal-overlay" onClick={() => setShowRegistro(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={crearRegistro}>
              <div className="modal-header">
                <h2 className="modal-title">Nuevo registro sin cuenta</h2>
                <button type="button" className="modal-close" onClick={() => setShowRegistro(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button type="button" className={`btn btn-sm ${registro.tipo === 'clientes' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRegistro({ ...registro, tipo: 'clientes' })}>🤝 Cliente</button>
                  <button type="button" className={`btn btn-sm ${registro.tipo === 'personal' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRegistro({ ...registro, tipo: 'personal' })}>👷 Personal</button>
                </div>
                <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" required value={registro.nombre} onChange={(e) => setRegistro({ ...registro, nombre: e.target.value })} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Correo</label><input className="form-input" type="email" value={registro.email} onChange={(e) => setRegistro({ ...registro, email: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={registro.telefono} onChange={(e) => setRegistro({ ...registro, telefono: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Ciudad</label><input className="form-input" value={registro.ciudad} onChange={(e) => setRegistro({ ...registro, ciudad: e.target.value })} /></div>
                  {registro.tipo === 'personal' && (
                    <div className="form-group">
                      <label className="form-label">Rol de acceso</label>
                      <select className="form-select" value={registro.app_role} onChange={(e) => setRegistro({ ...registro, app_role: e.target.value })}>
                        {['cuadrilla', 'operativo', 'bodega', 'admin'].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Si la persona crea su cuenta con el mismo correo, se enlazará a su perfil.</div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowRegistro(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
