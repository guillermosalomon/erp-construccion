'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/store/StoreContext';

// Mock data en caso de que la tabla aún no esté creada en Supabase
const mockInmuebles = [
  {
    id: '1',
    titulo: 'Casa Moderna de Lujo',
    descripcion: 'Hermosa casa moderna con piscina y acabados de lujo. Excelente iluminación y ubicación.',
    precio: 850000000,
    moneda: 'COP',
    tipo: 'Casa',
    estado: 'DISPONIBLE',
    operacion: 'VENTA',
    area_terreno: 300,
    area_construida: 250,
    habitaciones: 4,
    banos: 5,
    parqueaderos: 2,
    direccion: 'Condominio La Campiña, Lote 12',
    ciudad: 'Cali',
    departamento: 'Valle del Cauca',
    portada_url: '/render_casa_moderna_1779125189945.png',
    amenidades: ['Piscina', 'Terraza', 'Jardín', 'Seguridad 24/7'],
    propietario_nombre: 'Carlos Giraldo',
    propietario_telefono: '+57 300 123 4567',
    comision_pct: 3.0,
    leads_count: 5,
    user_email: 'agente1@kalarti.com',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    titulo: 'Apartamento Penthouse Centro',
    descripcion: 'Penthouse con vista 360 a la ciudad, espacios amplios y diseño minimalista.',
    precio: 620000000,
    moneda: 'COP',
    tipo: 'Apartamento',
    estado: 'DISPONIBLE',
    operacion: 'VENTA',
    area_construida: 120,
    habitaciones: 3,
    banos: 3,
    parqueaderos: 1,
    direccion: 'Av. El Río, Edificio Vista, Apt 1001',
    ciudad: 'Medellín',
    departamento: 'Antioquia',
    portada_url: '/render_apartamento_interior_1779125208355.png',
    amenidades: ['Balcón', 'Gimnasio', 'Coworking'],
    propietario_nombre: 'Inversiones Vista S.A.S',
    propietario_telefono: '+57 311 987 6543',
    comision_pct: 2.5,
    leads_count: 12,
    user_email: 'agente2@kalarti.com',
    created_at: new Date().toISOString()
  }
];

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function InmueblesView() {
  const { user } = useAuth();
  const { state, dispatch } = useStore();
  const inmuebles = state?.inmuebles || [];
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedInmueble, setSelectedInmueble] = useState(null);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    if (inmuebles.length === 0) {
      fetchInmuebles();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchInmuebles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const formatted = data?.map(d => ({
        ...d,
        user_email: 'Agente / Administrador',
        leads_count: 0
      })) || [];
      
      dispatch({ type: 'SET_INMUEBLES', payload: formatted.length > 0 ? formatted : mockInmuebles });
    } catch (err) {
      console.error('Error fetching inmuebles (using mock data):', err);
      dispatch({ type: 'SET_INMUEBLES', payload: mockInmuebles });
    } finally {
      setLoading(false);
    }
  };

  const openAdminModal = async (inmueble) => {
    setSelectedInmueble(inmueble);
    setShowAdminModal(true);
    // Fetch leads for this property
    try {
      const { data } = await supabase.from('inmueble_leads').select('*').eq('inmueble_id', inmueble.id);
      setLeads(data || []);
    } catch (e) {
      setLeads([
        { id: 1, cliente_nombre: 'Juan Perez', cliente_telefono: '3201234567', estado: 'NUEVO', mensaje: 'Me interesa visitar la propiedad', created_at: new Date().toISOString() }
      ]);
    }
  };

  const openEditModal = (inmueble) => {
    setSelectedInmueble(inmueble);
    setShowModal(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este inmueble? Puede revertir esta acción usando la opción "Deshacer" en el menú superior.')) {
      dispatch({ type: 'DELETE_INMUEBLE', payload: id });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      titulo: fd.get('titulo'),
      descripcion: fd.get('descripcion'),
      tipo: fd.get('tipo'),
      operacion: fd.get('operacion'),
      precio: Number(fd.get('precio')),
      tour_360_url: fd.get('tour_360_url'),
      portada_url: fd.get('portada_url'), // En caso de haber escrito URL directo
      area_terreno: Number(fd.get('area_terreno')) || 0,
      area_construida: Number(fd.get('area_construida')) || 0,
      habitaciones: Number(fd.get('habitaciones')) || 0,
      banos: Number(fd.get('banos')) || 0,
      parqueaderos: Number(fd.get('parqueaderos')) || 0,
      amenidades: fd.getAll('amenidades'), // array of strings
      propietario_nombre: fd.get('propietario_nombre'),
      propietario_telefono: fd.get('propietario_telefono'),
      comision_pct: Number(fd.get('comision_pct')) || 0,
      estado: fd.get('estado')
    };
    
    // Simulación de carga local para preview de la imagen de portada y adicionales
    const portadaFile = fd.get('portada_file');
    if (portadaFile && portadaFile.size > 0) {
      payload.portada_url = URL.createObjectURL(portadaFile);
    }
    
    const fotosExtraFiles = fd.getAll('fotos_adicionales');
    if (fotosExtraFiles && fotosExtraFiles.length > 0 && fotosExtraFiles[0].size > 0) {
      // Simular subir fotos y guardar en metadata / JSON. 
      // Por ahora, como es UI prototype, podríamos inyectarlos o instruir usar bucket final.
    }

    if (selectedInmueble) {
      payload.id = selectedInmueble.id;
      dispatch({ type: 'UPDATE_INMUEBLE', payload: payload });
    } else {
      payload.id = generateId();
      payload.user_id = user?.id;
      dispatch({ type: 'ADD_INMUEBLE', payload: payload });
    }
    
    setShowModal(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Gestión de Inmuebles</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Administra propiedades, dueños y leads del Marketplace B2C.</p>
        </div>
        <button 
          onClick={() => { setSelectedInmueble(null); setShowModal(true); }}
          style={{
            background: '#2563eb', color: 'white', padding: '10px 16px', borderRadius: '8px',
            fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <span>➕</span> Nuevo Inmueble
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando inmuebles...</div>
      ) : inmuebles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏢</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#334155' }}>No hay inmuebles registrados</h3>
          <p style={{ color: '#64748b', marginTop: '8px' }}>Crea tu primer inmueble.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {inmuebles.map(inmueble => (
            <div key={inmueble.id} style={{ 
              background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ height: '160px', backgroundColor: '#e2e8f0', position: 'relative' }}>
                <img src={inmueble.portada_url || '/api/placeholder/400/300'} alt={inmueble.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: inmueble.estado === 'DISPONIBLE' ? '#10b981' : '#f59e0b', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                  {inmueble.estado}
                </div>
              </div>
              
              <div style={{ padding: '16px', flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {inmueble.titulo}
                </h3>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb', marginBottom: '12px' }}>
                  {formatCurrency(inmueble.precio)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                    <span style={{ fontSize: '16px' }}>🛏️</span> {inmueble.habitaciones || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                    <span style={{ fontSize: '16px' }}>🛁</span> {inmueble.banos || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                    <span style={{ fontSize: '16px' }}>🚗</span> {inmueble.parqueaderos || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                    <span style={{ fontSize: '16px' }}>📐</span> {inmueble.area_construida || 0}m²
                  </div>
                </div>
                
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', padding: '8px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Propietario:</span> <strong style={{ color: '#334155' }}>{inmueble.propietario_nombre || 'No asignado'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Creado por:</span> <span style={{ color: '#334155' }}>{inmueble.user_email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Leads/Interesados:</span> <strong style={{ color: '#2563eb' }}>{inmueble.leads_count} prospectos</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openAdminModal(inmueble)} style={{ flex: 1, padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    ⚙️ Panel de Control
                  </button>
                  <button onClick={() => openEditModal(inmueble)} style={{ width: '36px', height: '36px', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(inmueble.id)} style={{ width: '36px', height: '36px', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR INMUEBLE */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <form onSubmit={handleSave} style={{ background: 'white', width: '800px', maxWidth: '95%', maxHeight: '90vh', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{selectedInmueble ? 'Editar Inmueble' : 'Nuevo Inmueble'}</h2>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>1. Datos Públicos (Marketplace)</h3>
              <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Título del inmueble *</label>
                    <input type="text" name="titulo" required defaultValue={selectedInmueble?.titulo} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Operación *</label>
                    <select name="operacion" required defaultValue={selectedInmueble?.operacion || 'VENTA'} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="VENTA">En Venta</option>
                      <option value="ALQUILER">En Alquiler</option>
                      <option value="PROYECTO">Proyecto / Preventa</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Tipo</label>
                    <select name="tipo" defaultValue={selectedInmueble?.tipo} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option>Casa</option><option>Apartamento</option><option>Local</option><option>Oficina</option><option>Lote</option><option>Finca</option><option>Otro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Precio (COP)</label>
                    <input type="number" name="precio" defaultValue={selectedInmueble?.precio} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Imagen de Portada (Subir Archivo o Ingresar URL)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="file" name="portada_file" accept="image/*" style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      <input type="url" name="portada_url" defaultValue={selectedInmueble?.portada_url} placeholder="https://..." style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Subir Fotos Adicionales o Video 📹 (Múltiple)</label>
                    <input type="file" name="fotos_adicionales" accept="image/*,video/*" multiple style={{ width: '100%', padding: '8px' }} />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Soporta carga múltiple de imágenes y videos cortos. Se almacenarán en Supabase Storage (requiere bucket 'inmuebles').</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>Área Terreno (m²)</label>
                    <input type="number" step="0.1" name="area_terreno" defaultValue={selectedInmueble?.area_terreno} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>Área Const. (m²)</label>
                    <input type="number" step="0.1" name="area_construida" defaultValue={selectedInmueble?.area_construida} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>Habitaciones</label>
                    <input type="number" name="habitaciones" defaultValue={selectedInmueble?.habitaciones} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>Baños</label>
                    <input type="number" name="banos" defaultValue={selectedInmueble?.banos} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>Parqueaderos</label>
                    <input type="number" name="parqueaderos" defaultValue={selectedInmueble?.parqueaderos} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Espacios, Servicios y Amenidades</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {['Sala', 'Comedor', 'Cocina', 'Lavandería', 'Zona de planchado', 'Balcón', 'Terraza', 'Patio interno', 'Piscina', 'Gimnasio', 'Agua', 'Luz', 'TV', 'Telefonía', 'Internet', 'Seguridad 24/7'].map(amenidad => (
                      <label key={amenidad} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" name="amenidades" value={amenidad} defaultChecked={selectedInmueble?.amenidades?.includes(amenidad)} />
                        {amenidad}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Tour Virtual (URL Pano2VR/Kuula)</label>
                  <input type="url" name="tour_360_url" defaultValue={selectedInmueble?.tour_360_url} placeholder="https://..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Descripción</label>
                  <textarea rows="3" name="descripcion" defaultValue={selectedInmueble?.descripcion} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}></textarea>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>2. Datos Administrativos Privados (No públicos)</h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Nombre del Propietario</label>
                    <input type="text" name="propietario_nombre" defaultValue={selectedInmueble?.propietario_nombre} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Teléfono Propietario</label>
                    <input type="text" name="propietario_telefono" defaultValue={selectedInmueble?.propietario_telefono} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>% Comisión de Agencia</label>
                    <input type="number" step="0.1" name="comision_pct" defaultValue={selectedInmueble?.comision_pct} placeholder="Ej. 3.0" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Estado Operativo</label>
                    <select name="estado" defaultValue={selectedInmueble?.estado} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option>DISPONIBLE</option><option>RESERVADO</option><option>VENDIDO</option><option>PAUSADO</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ADMINISTRAR INMUEBLE (LEADS Y CRM) */}
      {showAdminModal && selectedInmueble && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', width: '900px', maxWidth: '95%', height: '80vh', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>Administrar: {selectedInmueble.titulo}</h2>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>CRM de Propiedad • Creado por: {selectedInmueble.user_email}</div>
              </div>
              <button onClick={() => setShowAdminModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* SIDEBAR DETALLES */}
              <div style={{ width: '300px', background: '#f1f5f9', borderRight: '1px solid #e2e8f0', padding: '20px', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', marginBottom: '16px' }}>Datos del Propietario</h3>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>{selectedInmueble.propietario_nombre || 'No registrado'}</div>
                  <div style={{ fontSize: '14px', color: '#475569', marginTop: '8px' }}>📞 {selectedInmueble.propietario_telefono || '---'}</div>
                  <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>✉️ {selectedInmueble.propietario_email || '---'}</div>
                </div>

                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', marginBottom: '16px' }}>Métricas Financieras</h3>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Precio Base</span>
                    <strong style={{ fontSize: '13px' }}>{formatCurrency(selectedInmueble.precio)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Comisión ({selectedInmueble.comision_pct || 0}%)</span>
                    <strong style={{ color: '#10b981', fontSize: '13px' }}>{formatCurrency((selectedInmueble.precio * (selectedInmueble.comision_pct || 0)) / 100)}</strong>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Leads Totales</span>
                    <strong style={{ color: '#2563eb', fontSize: '14px' }}>{leads.length}</strong>
                  </div>
                </div>
              </div>

              {/* LISTA DE LEADS */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>Leads / Interesados ({leads.length})</h3>
                  <button style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    ⬇️ Exportar Leads
                  </button>
                </div>

                {leads.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    No hay interesados aún para esta propiedad.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {leads.map(lead => (
                      <div key={lead.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{lead.cliente_nombre}</div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>📞 {lead.cliente_telefono} • Registrado: {new Date(lead.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '13px', color: '#475569', marginTop: '8px', background: '#f1f5f9', padding: '8px', borderRadius: '6px', fontStyle: 'italic' }}>
                            "{lead.mensaje}"
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <select 
                            defaultValue={lead.estado}
                            style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #cbd5e1', outline: 'none', background: lead.estado === 'NUEVO' ? '#dbeafe' : '#f0fdf4', color: lead.estado === 'NUEVO' ? '#1e40af' : '#166534' }}
                          >
                            <option value="NUEVO">NUEVO</option>
                            <option value="CONTACTADO">CONTACTADO</option>
                            <option value="VISITA_PROGRAMADA">VISITA PROGRAMADA</option>
                            <option value="OFERTA_REALIZADA">OFERTA REALIZADA</option>
                            <option value="CERRADO">CERRADO EXITOSO</option>
                          </select>
                          <div style={{ marginTop: '12px' }}>
                            <a href={`https://wa.me/${lead.cliente_telefono}`} target="_blank" style={{ textDecoration: 'none', background: '#25D366', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                              💬 Chat WA
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
