'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';

export default function ProveedoresPOSView() {
  const { state, dispatch } = useStore();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filterCiudad, setFilterCiudad] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProv, setEditingProv] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    email: '',
    ciudad: 'Pasto (Nariño)',
    direccion: '',
    enlace_web: '',
    contacto: '',
  });

  const proveedoresList = useMemo(() => {
    let list = state.proveedores || [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p =>
        p.nombre?.toLowerCase().includes(s) ||
        p.nit?.toLowerCase().includes(s) ||
        p.ciudad?.toLowerCase().includes(s)
      );
    }
    if (filterCiudad) {
      list = list.filter(p => p.ciudad?.toLowerCase().includes(filterCiudad.toLowerCase()));
    }
    return list;
  }, [state.proveedores, search, filterCiudad]);

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.nombre) return alert('El nombre del proveedor es obligatorio');

    if (editingProv) {
      dispatch({
        type: 'UPDATE_PROVEEDOR',
        payload: { ...editingProv, ...form }
      });
    } else {
      dispatch({
        type: 'ADD_PROVEEDOR',
        payload: {
          ...form,
          id: crypto.randomUUID(),
          activo: true,
          calificacion: 5.0,
          user_id: user?.id,
          created_at: new Date().toISOString(),
        }
      });
    }

    setShowModal(false);
    setEditingProv(null);
    setForm({ nombre: '', nit: '', telefono: '', email: '', ciudad: 'Pasto (Nariño)', direccion: '', enlace_web: '', contacto: '' });
  };

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
      dispatch({ type: 'DELETE_PROVEEDOR', payload: id });
    }
  };

  const handleEdit = (p) => {
    setEditingProv(p);
    setForm({
      nombre: p.nombre || '',
      nit: p.nit || '',
      telefono: p.telefono || '',
      email: p.email || '',
      ciudad: p.ciudad || 'Pasto (Nariño)',
      direccion: p.direccion || '',
      enlace_web: p.enlace_web || '',
      contacto: p.contacto || '',
    });
    setShowModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
      {/* Barra de Búsqueda y Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            placeholder="Buscar proveedor o NIT..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220, fontSize: 12 }}
          />

          <select
            className="form-select"
            value={filterCiudad}
            onChange={e => setFilterCiudad(e.target.value)}
            style={{ width: 160, fontSize: 12 }}
          >
            <option value="">Todas las ciudades</option>
            <option value="Pasto">Pasto (Nariño)</option>
            <option value="Ipiales">Ipiales (Nariño)</option>
            <option value="Nacional">Nacional</option>
          </select>

          <span style={{ fontSize: 11, color: '#64748b' }}>
            {proveedoresList.length} proveedores registrados
          </span>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditingProv(null);
            setForm({ nombre: '', nit: '', telefono: '', email: '', ciudad: 'Pasto (Nariño)', direccion: '', enlace_web: '', contacto: '' });
            setShowModal(true);
          }}
          style={{ fontSize: 11, fontWeight: 700 }}
        >
          + Agregar / Crear Proveedor
        </button>
      </div>

      {/* Lista de Proveedores */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {proveedoresList.map(prov => (
            <div
              key={prov.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 14,
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    {prov.nombre}
                  </h4>
                  <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                    ⭐ 5.0
                  </span>
                </div>

                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                  📍 {prov.ciudad || 'Pasto (Nariño)'} {prov.nit ? `· NIT: ${prov.nit}` : ''}
                </div>

                {prov.contacto && (
                  <div style={{ fontSize: 11, color: '#334155', marginBottom: 4 }}>
                    👤 Contacto: <strong>{prov.contacto}</strong>
                  </div>
                )}
                {prov.telefono && (
                  <div style={{ fontSize: 11, color: '#334155', marginBottom: 4 }}>
                    📞 {prov.telefono}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #f8fafc' }}>
                <div>
                  {prov.enlace_web && (
                    <a
                      href={prov.enlace_web}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                    >
                      🔗 Ver Catálogo / Cotización
                    </a>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleEdit(prov)}
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    title="Editar proveedor"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(prov.id)}
                    style={{ padding: '2px 6px', fontSize: 11, color: '#ef4444' }}
                    title="Eliminar proveedor"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Agregar / Editar Proveedor */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>{editingProv ? '✏️ Editar Proveedor' : '🏢 Nuevo Proveedor Comercial'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Razón Social / Nombre Comercial *</label>
                  <input
                    className="form-input"
                    placeholder="Ej: Homecenter Pasto, Construrama"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">NIT / Identificación</label>
                    <input
                      className="form-input"
                      placeholder="900.123.456-7"
                      value={form.nit}
                      onChange={e => setForm({ ...form, nit: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Ciudad Sede</label>
                    <input
                      className="form-input"
                      placeholder="Pasto (Nariño)"
                      value={form.ciudad}
                      onChange={e => setForm({ ...form, ciudad: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Teléfono / WhatsApp</label>
                    <input
                      className="form-input"
                      placeholder="300 123 4567"
                      value={form.telefono}
                      onChange={e => setForm({ ...form, telefono: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Nombre de Contacto</label>
                    <input
                      className="form-input"
                      placeholder="Asesor de ventas"
                      value={form.contacto}
                      onChange={e => setForm({ ...form, contacto: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección / Punto de Despacho</label>
                  <input
                    className="form-input"
                    placeholder="Cra 20 # 15-40, Pasto"
                    value={form.direccion}
                    onChange={e => setForm({ ...form, direccion: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Enlace Web o Cotización de Referencia</label>
                  <input
                    className="form-input"
                    placeholder="https://..."
                    value={form.enlace_web}
                    onChange={e => setForm({ ...form, enlace_web: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
