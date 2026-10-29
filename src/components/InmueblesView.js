'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/store/StoreContext';
import {
  inmuebles as officialInmuebles,
  mergeCatalogWithDb,
  slugifyInmueble,
} from '@/data/inmuebles';

const isUuid = (val) =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const QUICK_AMENIDADES = [
  'Disponibilidad de acueducto, alcantarillado y energía',
  'Topografía 100% plana lista para edificar',
  'Seguridad y vigilancia 24/7',
  'Piscina para adultos y niños',
  'Zonas verdes y jardines campestres',
  'Parqueadero privado',
  'Licencia turística (Airbnb/Booking)',
  'Kiosco social / Zona BBQ',
  'Canchas deportivas múltiples',
  'Gimnasio dotado',
];

export default function InmueblesView() {
  const { user } = useAuth();
  const { state, dispatch } = useStore();
  const inmuebles = state?.inmuebles || [];
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedInmueble, setSelectedInmueble] = useState(null);
  const [amenidadesText, setAmenidadesText] = useState('');
  const [leads, setLeads] = useState([]);
  const [fotosAdicionales, setFotosAdicionales] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    fetchInmuebles();
  }, []);

  const fetchInmuebles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*, inmueble_fotos(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const merged = mergeCatalogWithDb(data || [], { onlyAvailable: false }).map((item) => ({
        ...item,
        user_email: item.user_email || 'ventas@kalarti.com',
        leads_count: item.leads_count || 0,
      }));

      dispatch({ type: 'SET_INMUEBLES', payload: merged });
    } catch (err) {
      console.warn('Using official real properties in ERP:', err.message);
      const fallback = mergeCatalogWithDb([], { onlyAvailable: false }).map((item) => ({
        ...item,
        user_email: 'ventas@kalarti.com',
        leads_count: 0,
      }));
      dispatch({ type: 'SET_INMUEBLES', payload: fallback });
    } finally {
      setLoading(false);
    }
  };

  const openAdminModal = async (inmueble) => {
    setSelectedInmueble(inmueble);
    setShowAdminModal(true);
    try {
      if (isUuid(inmueble.id)) {
        const { data } = await supabase
          .from('inmueble_leads')
          .select('*')
          .eq('inmueble_id', inmueble.id);
        setLeads(data || []);
      } else {
        setLeads([]);
      }
    } catch {
      setLeads([]);
    }
  };

  const openEditModal = async (inmueble) => {
    setSelectedInmueble(inmueble);
    setAmenidadesText(
      Array.isArray(inmueble?.amenidades) ? inmueble.amenidades.join('\n') : ''
    );
    setFotosAdicionales([]);
    setShowModal(true);

    if (inmueble && isUuid(inmueble.id)) {
      try {
        const { data } = await supabase
          .from('inmueble_fotos')
          .select('*')
          .eq('inmueble_id', inmueble.id)
          .order('orden');
        if (data) {
          setFotosAdicionales(
            data.map((f) => ({
              id: f.id,
              url: f.url,
              descripcion: f.descripcion || '',
              isExisting: true,
            }))
          );
        }
      } catch (e) {
        console.error('Error fetching photos:', e);
      }
    }
  };

  const openNewModal = () => {
    setSelectedInmueble(null);
    setAmenidadesText('');
    setFotosAdicionales([]);
    setShowModal(true);
  };

  const addQuickAmenidad = (amenidad) => {
    const currentLines = amenidadesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!currentLines.includes(amenidad)) {
      const updated = [...currentLines, amenidad].join('\n');
      setAmenidadesText(updated);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newFotos = files.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      descripcion: f.name,
      isExisting: false,
    }));
    setFotosAdicionales((prev) => [...prev, ...newFotos]);
    e.target.value = '';
  };

  const removeFoto = async (index) => {
    const foto = fotosAdicionales[index];
    if (foto.isExisting) {
      if (window.confirm('¿Eliminar esta foto de la base de datos?')) {
        await supabase.from('inmueble_fotos').delete().eq('id', foto.id);
        setFotosAdicionales((prev) => prev.filter((_, i) => i !== index));
      }
    } else {
      setFotosAdicionales((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateFotoDesc = (index, desc) => {
    const newFotos = [...fotosAdicionales];
    newFotos[index].descripcion = desc;
    setFotosAdicionales(newFotos);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este inmueble?')) {
      try {
        const { error } = await supabase.from('inmuebles').delete().eq('id', id);
        if (error) throw error;
        fetchInmuebles();
      } catch (err) {
        alert('Error al eliminar inmueble: ' + err.message);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const titulo = (fd.get('titulo') || '').toString().trim();
    const subtitulo = (fd.get('subtitulo') || '').toString().trim();
    const precio = Number(fd.get('precio')) || 0;
    const precio_texto = (fd.get('precio_texto') || '').toString().trim();
    const tipo = (fd.get('tipo') || 'Apartamento').toString();
    const subtipo = (fd.get('subtipo') || '').toString().trim();
    const etiqueta_especial = (fd.get('etiqueta_especial') || '').toString().trim();
    const licencia_turistica = fd.get('licencia_turistica') === 'on';
    const operacion = (fd.get('operacion') || 'VENTA').toString();
    const estado = (fd.get('estado') || 'DISPONIBLE').toString();
    const ciudad = (fd.get('ciudad') || '').toString().trim();
    const departamento = (fd.get('departamento') || '').toString().trim();
    const sector = (fd.get('sector') || '').toString().trim();
    const direccion = (fd.get('direccion') || '').toString().trim();
    const maps_url = (fd.get('maps_url') || '').toString().trim();
    const area_terreno = Number(fd.get('area_terreno')) || 0;
    const area_construida = Number(fd.get('area_construida')) || 0;
    const habitaciones = Number(fd.get('habitaciones')) || 0;
    const banos = Number(fd.get('banos')) || 0;
    const parqueaderos = Number(fd.get('parqueaderos')) || 0;
    const pisoVal = fd.get('piso');
    const piso = pisoVal ? Number(pisoVal) : null;
    const descripcion_corta = (fd.get('descripcion_corta') || '').toString().trim();
    const descripcion_completa = (fd.get('descripcion_completa') || '').toString().trim();
    const video_url = (fd.get('video_url') || '').toString().trim();
    const plano_url = (fd.get('plano_url') || '').toString().trim();
    const tour_360_url = (fd.get('tour_360_url') || '').toString().trim();
    let portada_url = (fd.get('portada_url') || '').toString().trim() || selectedInmueble?.portada_url || '';

    const amenidadesList = amenidadesText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    setUploading(true);

    // Subir nueva portada si se seleccionó archivo
    const portadaFile = fd.get('portada_file');
    if (portadaFile && portadaFile.size > 0) {
      const fileExt = portadaFile.name.split('.').pop();
      const fileName = `portada_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `propiedades/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('inmuebles')
        .upload(filePath, portadaFile);
      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from('inmuebles').getPublicUrl(filePath);
        portada_url = publicUrl;
      } else {
        console.error('Error subiendo imagen de portada:', uploadError);
      }
    }

    const prevMeta =
      selectedInmueble?.espacios_zonas &&
      typeof selectedInmueble.espacios_zonas === 'object'
        ? selectedInmueble.espacios_zonas
        : {};

    const slug =
      selectedInmueble?.slug ||
      prevMeta.slug ||
      slugifyInmueble(titulo, `inmueble-${Date.now()}`);

    const espacios_zonas = {
      ...prevMeta,
      slug,
      static_id: selectedInmueble?.static_id || prevMeta.static_id || selectedInmueble?.id || null,
      subtitulo,
      precio_texto,
      subtipo,
      etiqueta_especial,
      licencia_turistica,
      sector,
      piso,
      video_url,
      plano_url,
      maps_url,
      descripcion_corta,
      descripcion_completa,
      caracteristicas_internas:
        selectedInmueble?.caracteristicas_internas || prevMeta.caracteristicas_internas || [],
      galeria: selectedInmueble?.galeria || prevMeta.galeria || [],
    };

    const payload = {
      titulo,
      descripcion: descripcion_corta || descripcion_completa.slice(0, 260),
      tipo,
      operacion,
      precio,
      ciudad,
      departamento,
      direccion,
      tour_360_url,
      portada_url,
      area_terreno,
      area_construida,
      habitaciones,
      banos,
      parqueaderos,
      amenidades: amenidadesList,
      espacios_zonas,
      propietario_nombre: (fd.get('propietario_nombre') || '').toString().trim(),
      propietario_telefono: (fd.get('propietario_telefono') || '').toString().trim(),
      comision_pct: Number(fd.get('comision_pct')) || 0,
      estado,
    };

    let currentInmuebleId =
      selectedInmueble && isUuid(selectedInmueble.id) ? selectedInmueble.id : null;

    try {
      if (currentInmuebleId) {
        const { error } = await supabase
          .from('inmuebles')
          .update(payload)
          .eq('id', currentInmuebleId);
        if (error) throw error;
      } else {
        if (user?.id) payload.user_id = user.id;
        const { data, error } = await supabase
          .from('inmuebles')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        currentInmuebleId = data.id;
      }

      // Guardar fotos adicionales
      for (let i = 0; i < fotosAdicionales.length; i++) {
        const foto = fotosAdicionales[i];
        if (!foto.isExisting && foto.file) {
          const fileExt = foto.file.name.split('.').pop();
          const fileName = `${currentInmuebleId}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `propiedades/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('inmuebles')
            .upload(filePath, foto.file);

          if (uploadError) {
            console.error('Error subiendo foto:', uploadError);
            continue;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('inmuebles').getPublicUrl(filePath);

          await supabase.from('inmueble_fotos').insert({
            inmueble_id: currentInmuebleId,
            url: publicUrl,
            descripcion: foto.descripcion,
            orden: i,
            tipo: 'FOTO',
          });
        } else if (foto.isExisting) {
          await supabase
            .from('inmueble_fotos')
            .update({ descripcion: foto.descripcion, orden: i })
            .eq('id', foto.id);
        }
      }

      await fetchInmuebles();
      setShowModal(false);
      setSaveMessage(`Inmueble "${titulo}" actualizado y publicado en la web.`);
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err) {
      alert('Error guardando inmueble: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1240px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            Gestión de Inmuebles (Sincronizado con Web)
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>
            Cualquier cambio que guardes aquí actualiza inmediatamente el catálogo público{' '}
            <a
              href="/propiedades"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'underline' }}
            >
              /propiedades ↗
            </a>{' '}
            y la página individual de cada inmueble.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href="/propiedades"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#f8fafc',
              color: '#0f172a',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              border: '1px solid #cbd5e1',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
            }}
          >
            🌐 Ver Catálogo Web ↗
          </a>
          <button
            onClick={openNewModal}
            style={{
              background: '#2563eb',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>➕</span> Nuevo Inmueble
          </button>
        </div>
      </div>

      {saveMessage && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #10b981',
            color: '#065f46',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>✅ {saveMessage}</span>
          <button
            onClick={() => setSaveMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Cargando inmuebles sincronizados...
        </div>
      ) : inmuebles.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            background: 'white',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏢</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#334155' }}>
            No hay inmuebles registrados
          </h3>
          <p style={{ color: '#64748b', marginTop: '8px' }}>Crea tu primer inmueble.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px',
          }}
        >
          {inmuebles.map((inmueble) => (
            <div
              key={inmueble.id || inmueble.slug}
              style={{
                background: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ height: '175px', backgroundColor: '#0f172a', position: 'relative' }}>
                <img
                  src={inmueble.portada_url || '/icon.png'}
                  alt={inmueble.titulo}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(15,23,42,0.85)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  {inmueble.tipo} • {inmueble.ciudad}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: inmueble.estado === 'DISPONIBLE' ? '#10b981' : '#f59e0b',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  {inmueble.estado}
                </div>
              </div>

              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    marginBottom: '4px',
                    lineHeight: '1.35',
                  }}
                >
                  {inmueble.titulo}
                </h3>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb', marginBottom: '4px' }}>
                  {formatCurrency(inmueble.precio)}
                </div>
                {inmueble.precio_texto && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    {inmueble.precio_texto}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                    <span>🛏️</span> {inmueble.habitaciones || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                    <span>🛁</span> {inmueble.banos || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                    <span>🚗</span> {inmueble.parqueaderos || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                    <span>📐</span> {inmueble.area_construida || inmueble.area_terreno || 0} m²
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginBottom: '14px',
                    padding: '8px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    flex: 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Ubicación:</span>{' '}
                    <strong style={{ color: '#334155' }}>
                      {inmueble.ciudad}, {inmueble.departamento}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Asesor/Propietario:</span>{' '}
                    <span style={{ color: '#334155' }}>{inmueble.propietario_nombre || 'Comercial Kalarti'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>URL pública:</span>{' '}
                    <a
                      href={`/propiedades/${inmueble.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}
                    >
                      Ver ficha ↗
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => openEditModal(inmueble)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    ✏️ Editar Información
                  </button>
                  <button
                    onClick={() => openAdminModal(inmueble)}
                    style={{
                      padding: '9px 12px',
                      background: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                    title="Ver Leads y CRM"
                  >
                    ⚙️ CRM
                  </button>
                  <button
                    onClick={() => handleDelete(inmueble.id)}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: 'white',
                      color: '#ef4444',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Eliminar"
                  >
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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15,23,42,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <form
            onSubmit={handleSave}
            style={{
              background: 'white',
              width: '920px',
              maxWidth: '100%',
              maxHeight: '92vh',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>
                  {selectedInmueble ? `Editar: ${selectedInmueble.titulo}` : 'Nuevo Inmueble'}
                </h2>
                {selectedInmueble?.slug && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Ruta web:{' '}
                    <a
                      href={`/propiedades/${selectedInmueble.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb' }}
                    >
                      /propiedades/{selectedInmueble.slug} ↗
                    </a>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* SECCIÓN 1: TÍTULO, PRECIO Y CLASIFICACIÓN */}
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#0f172a',
                  marginBottom: '14px',
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '6px',
                }}
              >
                1. Información Principal y Precio
              </h3>
              <div style={{ display: 'grid', gap: '14px', marginBottom: '26px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Título del inmueble *
                    </label>
                    <input
                      type="text"
                      name="titulo"
                      required
                      defaultValue={selectedInmueble?.titulo || ''}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Estado en Página Web *
                    </label>
                    <select
                      name="estado"
                      defaultValue={selectedInmueble?.estado || 'DISPONIBLE'}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                    >
                      <option value="DISPONIBLE">DISPONIBLE (Visible en web)</option>
                      <option value="RESERVADO">RESERVADO</option>
                      <option value="VENDIDO">VENDIDO</option>
                      <option value="PAUSADO">PAUSADO (Oculto en web)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    Subtítulo destacado (aparece debajo del título en la ficha)
                  </label>
                  <input
                    type="text"
                    name="subtitulo"
                    defaultValue={selectedInmueble?.subtitulo || ''}
                    placeholder="Ej. 2 lotes juntos o individuales de 96.6m² c/u, listos para construir..."
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Precio Numérico (COP) *
                    </label>
                    <input
                      type="number"
                      name="precio"
                      required
                      defaultValue={selectedInmueble?.precio || 0}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0284c7' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Texto de Precio (Aclaración debajo del precio)
                    </label>
                    <input
                      type="text"
                      name="precio_texto"
                      defaultValue={selectedInmueble?.precio_texto || ''}
                      placeholder="Ej. $45.000.000 COP por lote ($90.000.000 ambos)"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Tipo
                    </label>
                    <select
                      name="tipo"
                      defaultValue={selectedInmueble?.tipo || 'Apartamento'}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="Apartamento">Apartamento</option>
                      <option value="Casa">Casa</option>
                      <option value="Lote">Lote</option>
                      <option value="Local">Local</option>
                      <option value="Oficina">Oficina</option>
                      <option value="Finca">Finca</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Operación
                    </label>
                    <select
                      name="operacion"
                      defaultValue={selectedInmueble?.operacion || 'VENTA'}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="VENTA">En Venta</option>
                      <option value="ALQUILER">En Alquiler</option>
                      <option value="PROYECTO">Proyecto / Preventa</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Subtipo (Ej. Cabaña Campestre, Lote Urbanizado)
                    </label>
                    <input
                      type="text"
                      name="subtipo"
                      defaultValue={selectedInmueble?.subtipo || ''}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Etiqueta Especial (Ej. Locales Comerciales)
                    </label>
                    <input
                      type="text"
                      name="etiqueta_especial"
                      defaultValue={selectedInmueble?.etiqueta_especial || ''}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ paddingBottom: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="licencia_turistica"
                        defaultChecked={Boolean(selectedInmueble?.licencia_turistica)}
                      />
                      Tiene Licencia Turística (Airbnb/Booking)
                    </label>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: UBICACIÓN Y ESPECIFICACIONES */}
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#0f172a',
                  marginBottom: '14px',
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '6px',
                }}
              >
                2. Ubicación y Especificaciones Técnicas
              </h3>
              <div style={{ display: 'grid', gap: '14px', marginBottom: '26px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Ciudad / Municipio *
                    </label>
                    <input
                      type="text"
                      name="ciudad"
                      required
                      defaultValue={selectedInmueble?.ciudad || 'Pasto'}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Departamento *
                    </label>
                    <input
                      type="text"
                      name="departamento"
                      required
                      defaultValue={selectedInmueble?.departamento || 'Nariño'}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Sector / Barrio / Condominio
                    </label>
                    <input
                      type="text"
                      name="sector"
                      defaultValue={selectedInmueble?.sector || ''}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Dirección Completa
                    </label>
                    <input
                      type="text"
                      name="direccion"
                      defaultValue={selectedInmueble?.direccion || ''}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Enlace Google Maps (maps_url)
                    </label>
                    <input
                      type="url"
                      name="maps_url"
                      defaultValue={selectedInmueble?.maps_url || ''}
                      placeholder="https://maps.app.goo.gl/..."
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                      Área Terreno (m²)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="area_terreno"
                      defaultValue={selectedInmueble?.area_terreno || 0}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                      Área Const. (m²)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="area_construida"
                      defaultValue={selectedInmueble?.area_construida || 0}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                      Habitaciones
                    </label>
                    <input
                      type="number"
                      name="habitaciones"
                      defaultValue={selectedInmueble?.habitaciones || 0}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                      Baños
                    </label>
                    <input
                      type="number"
                      name="banos"
                      defaultValue={selectedInmueble?.banos || 0}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                      Parqueaderos
                    </label>
                    <input
                      type="number"
                      name="parqueaderos"
                      defaultValue={selectedInmueble?.parqueaderos || 0}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                      Piso / Niveles
                    </label>
                    <input
                      type="number"
                      name="piso"
                      defaultValue={selectedInmueble?.piso || ''}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: DESCRIPCIONES Y AMENIDADES */}
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#0f172a',
                  marginBottom: '14px',
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '6px',
                }}
              >
                3. Descripciones y Amenidades
              </h3>
              <div style={{ display: 'grid', gap: '14px', marginBottom: '26px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    Descripción Corta (Resumen que aparece en las tarjetas del catálogo /propiedades)
                  </label>
                  <textarea
                    rows="2"
                    name="descripcion_corta"
                    defaultValue={selectedInmueble?.descripcion_corta || selectedInmueble?.descripcion || ''}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    Descripción Detallada Completa (Texto completo que aparece dentro de la página del inmueble)
                  </label>
                  <textarea
                    rows="8"
                    name="descripcion_completa"
                    defaultValue={selectedInmueble?.descripcion_completa || selectedInmueble?.descripcion || ''}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit', lineHeight: '1.5' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    Amenidades y Características Destacadas (Una por línea)
                  </label>
                  <textarea
                    rows="5"
                    value={amenidadesText}
                    onChange={(e) => setAmenidadesText(e.target.value)}
                    placeholder="Escribe una amenidad por cada línea..."
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>
                      + Agregar rápido:
                    </span>
                    {QUICK_AMENIDADES.map((am) => (
                      <button
                        key={am}
                        type="button"
                        onClick={() => addQuickAmenidad(am)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '14px',
                          padding: '3px 9px',
                          fontSize: '11px',
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        + {am}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: MULTIMEDIA */}
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#0f172a',
                  marginBottom: '14px',
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '6px',
                }}
              >
                4. Fotografías, Video y Planos
              </h3>
              <div style={{ display: 'grid', gap: '14px', marginBottom: '26px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      URL de Imagen de Portada Actual
                    </label>
                    <input
                      type="text"
                      name="portada_url"
                      defaultValue={selectedInmueble?.portada_url || ''}
                      placeholder="/inmuebles-web/... o https://..."
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      O Subir Nueva Imagen de Portada desde tu equipo
                    </label>
                    <input
                      type="file"
                      name="portada_file"
                      accept="image/*"
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      URL de Video Recorrido
                    </label>
                    <input
                      type="text"
                      name="video_url"
                      defaultValue={selectedInmueble?.video_url || ''}
                      placeholder="/inmuebles-web/.../video.mp4"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      URL de Plano Arquitectónico
                    </label>
                    <input
                      type="text"
                      name="plano_url"
                      defaultValue={selectedInmueble?.plano_url || ''}
                      placeholder="/inmuebles-web/.../plano.jpg"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Tour Virtual 360 (URL)
                    </label>
                    <input
                      type="text"
                      name="tour_360_url"
                      defaultValue={selectedInmueble?.tour_360_url || ''}
                      placeholder="https://..."
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    Subir Fotos Adicionales a la Galería 📷
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '12px',
                    }}
                  />

                  {fotosAdicionales.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                      {fotosAdicionales.map((foto, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            background: 'white',
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            alignItems: 'center',
                          }}
                        >
                          <img
                            src={foto.url}
                            alt="preview"
                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              value={foto.descripcion}
                              onChange={(e) => updateFotoDesc(index, e.target.value)}
                              placeholder="Descripción de la foto"
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                              }}
                            />
                            {foto.isExisting && (
                              <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                                Guardada en nube
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFoto(index)}
                            style={{
                              background: '#fee2e2',
                              color: '#ef4444',
                              border: 'none',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 5: DATOS ADMINISTRATIVOS */}
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#0f172a',
                  marginBottom: '14px',
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '6px',
                }}
              >
                5. Datos Administrativos Internos
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    Nombre del Propietario / Asesor
                  </label>
                  <input
                    type="text"
                    name="propietario_nombre"
                    defaultValue={selectedInmueble?.propietario_nombre || ''}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    Teléfono Propietario / WhatsApp
                  </label>
                  <input
                    type="text"
                    name="propietario_telefono"
                    defaultValue={selectedInmueble?.propietario_telefono || ''}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    % Comisión de Agencia
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="comision_pct"
                    defaultValue={selectedInmueble?.comision_pct ?? 3.0}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                borderRadius: '0 0 16px 16px',
              }}
            >
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={uploading}
                style={{
                  padding: '10px 18px',
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploading}
                style={{
                  padding: '10px 24px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                }}
              >
                {uploading ? 'Guardando cambios...' : '💾 Guardar y Publicar en Web'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ADMINISTRAR INMUEBLE (LEADS Y CRM) */}
      {showAdminModal && selectedInmueble && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: 'white',
              width: '900px',
              maxWidth: '95%',
              height: '80vh',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>
                  Administrar: {selectedInmueble.titulo}
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  CRM de Propiedad • Creado por: {selectedInmueble.user_email}
                </div>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  width: '300px',
                  background: '#f1f5f9',
                  borderRight: '1px solid #e2e8f0',
                  padding: '20px',
                  overflowY: 'auto',
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Datos del Propietario
                </h3>
                <div
                  style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                    {selectedInmueble.propietario_nombre || 'No registrado'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#475569', marginTop: '8px' }}>
                    📞 {selectedInmueble.propietario_telefono || '---'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>
                    ✉️ {selectedInmueble.propietario_email || '---'}
                  </div>
                </div>

                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Métricas Financieras
                </h3>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Precio Base</span>
                    <strong style={{ fontSize: '13px' }}>{formatCurrency(selectedInmueble.precio)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>
                      Comisión ({selectedInmueble.comision_pct || 0}%)
                    </span>
                    <strong style={{ color: '#10b981', fontSize: '13px' }}>
                      {formatCurrency((selectedInmueble.precio * (selectedInmueble.comision_pct || 0)) / 100)}
                    </strong>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Leads Totales</span>
                    <strong style={{ color: '#2563eb', fontSize: '14px' }}>{leads.length}</strong>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                    Leads / Interesados ({leads.length})
                  </h3>
                </div>

                {leads.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    No hay interesados aún para esta propiedad.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {leads.map((lead) => (
                      <div
                        key={lead.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>
                            {lead.cliente_nombre}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                            📞 {lead.cliente_telefono} • Registrado:{' '}
                            {new Date(lead.created_at).toLocaleDateString()}
                          </div>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#475569',
                              marginTop: '8px',
                              background: '#f1f5f9',
                              padding: '8px',
                              borderRadius: '6px',
                              fontStyle: 'italic',
                            }}
                          >
                            "{lead.mensaje}"
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <select
                            defaultValue={lead.estado}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              border: '1px solid #cbd5e1',
                              outline: 'none',
                              background: lead.estado === 'NUEVO' ? '#dbeafe' : '#f0fdf4',
                              color: lead.estado === 'NUEVO' ? '#1e40af' : '#166534',
                            }}
                          >
                            <option value="NUEVO">NUEVO</option>
                            <option value="CONTACTADO">CONTACTADO</option>
                            <option value="VISITA_PROGRAMADA">VISITA PROGRAMADA</option>
                            <option value="OFERTA_REALIZADA">OFERTA REALIZADA</option>
                            <option value="CERRADO">CERRADO EXITOSO</option>
                          </select>
                          <div style={{ marginTop: '12px' }}>
                            <a
                              href={`https://wa.me/${lead.cliente_telefono}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                textDecoration: 'none',
                                background: '#25D366',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                              }}
                            >
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
