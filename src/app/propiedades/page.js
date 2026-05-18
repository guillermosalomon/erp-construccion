'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Mock data en caso de que falle
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
    tour_360_url: 'https://kuula.co/share/collection/7lQbl?fs=1&vr=1&sd=1&initload=0&thumbs=1&chromeless=1&logo=0', // Ejemplo kuula
    amenidades: ['Piscina', 'Terraza', 'Jardín', 'Seguridad 24/7'],
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
    tour_360_url: 'https://kuula.co/share/collection/7lQbl?fs=1&vr=1&sd=1&initload=0&thumbs=1&chromeless=1&logo=0',
    amenidades: ['Balcón', 'Gimnasio', 'Coworking'],
    created_at: new Date().toISOString()
  }
];

export default function PropiedadesMarketplace() {
  const [inmuebles, setInmuebles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInmueble, setSelectedInmueble] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null); // { type: 'tour' | 'image', url: string }
  const [filterTipo, setFilterTipo] = useState('Todos');

  useEffect(() => {
    fetchInmuebles();
  }, []);

  const fetchInmuebles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*, inmueble_fotos(*)')
        .eq('estado', 'DISPONIBLE')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setInmuebles(data && data.length > 0 ? data : mockInmuebles);
    } catch (err) {
      console.error('Error fetching inmuebles:', err);
      setInmuebles(mockInmuebles);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  };

  const filteredInmuebles = filterTipo === 'Todos' 
    ? inmuebles 
    : inmuebles.filter(i => i.tipo === filterTipo);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        .modal-content-flex {
          flex-direction: row;
        }
        .media-container {
          flex: 2;
        }
        .info-container {
          flex: 1;
        }
        .search-bar-flex {
          display: flex;
          gap: 8px;
          flex-direction: row;
        }
        @media (max-width: 768px) {
          .modal-content-flex {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .media-container {
            flex: none !important;
            height: 60vh !important;
            width: 100% !important;
          }
          .info-container {
            flex: none !important;
            overflow-y: visible !important;
            padding: 20px !important;
          }
          .search-bar-flex {
            flex-direction: column !important;
          }
        }
      `}</style>
      {/* HEADER PUBLICO */}
      <nav style={{ 
        background: '#0f172a', padding: '20px 40px', display: 'flex', 
        justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 
      }}>
        <Link href="/" style={{ fontSize: '24px', fontWeight: '800', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/icon.png" alt="Kalarti Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} />
          KALARTI Market
        </Link>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link href="/" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: '500' }}>Ecosistema</Link>
          <Link href="/erp" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: '600' }}>Ingresar al ERP</Link>
        </div>
      </nav>

      {/* HERO BUSCADOR */}
      <div style={{ 
        background: 'linear-gradient(rgba(15,23,42,0.8), rgba(15,23,42,0.8)), url(/render_casa_moderna_1779125189945.png) center/cover', 
        padding: '80px 40px', textAlign: 'center', color: 'white' 
      }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '16px' }}>Encuentra tu próximo hogar o inversión</h1>
        <p style={{ fontSize: '20px', color: '#cbd5e1', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
          Explora proyectos inmobiliarios con tecnología 360 y modelo BIM integrado.
        </p>

        {/* Barra de Filtros */}
        <div className="search-bar-flex" style={{ 
          background: 'white', padding: '8px', borderRadius: '12px', 
          maxWidth: '800px', margin: '0 auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
        }}>
          <select 
            value={filterTipo} 
            onChange={e => setFilterTipo(e.target.value)}
            style={{ flex: 1, padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none' }}
          >
            <option value="Todos">Todos los tipos</option>
            <option value="Casa">Casas</option>
            <option value="Apartamento">Apartamentos</option>
            <option value="Lote">Lotes</option>
            <option value="Local">Locales</option>
          </select>
          <input 
            type="text" 
            placeholder="Ciudad, zona o palabra clave..." 
            style={{ flex: 2, padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none' }} 
          />
          <button style={{ background: '#f59e0b', color: '#0f172a', padding: '16px 32px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
            Buscar
          </button>
        </div>
      </div>

      {/* GRID DE INMUEBLES */}
      <div style={{ padding: '60px 40px', maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b', marginBottom: '32px' }}>Propiedades Destacadas</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Cargando portafolio...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '32px' }}>
            {filteredInmuebles.map(inmueble => (
              <div 
                key={inmueble.id} 
                onClick={() => {
                  setSelectedInmueble(inmueble);
                  setActiveMedia(inmueble.tour_360_url ? { type: 'tour', url: inmueble.tour_360_url } : { type: 'image', url: inmueble.portada_url });
                }}
                style={{ 
                  background: 'white', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', transition: 'all 0.3s', border: '1px solid #e2e8f0'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
              >
                <div style={{ height: '240px', position: 'relative' }}>
                  <img src={inmueble.portada_url || '/api/placeholder/400/300'} alt={inmueble.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '16px', left: '16px', background: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px' }}>
                    {inmueble.operacion}
                  </div>
                  {inmueble.tour_360_url && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '16px' }}>👁️</span> Tour 360°
                    </div>
                  )}
                </div>
                <div style={{ padding: '24px' }}>
                  <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>{inmueble.tipo} • {inmueble.ciudad}</div>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>{inmueble.titulo}</h3>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#f59e0b', marginBottom: '20px' }}>{formatCurrency(inmueble.precio)}</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px', color: '#475569', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🛏️ {inmueble.habitaciones}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🛁 {inmueble.banos}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🚗 {inmueble.parqueaderos}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📐 {inmueble.area_construida}m²</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE Y TOUR 360 */}
      {selectedInmueble && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', width: '1200px', maxWidth: '100%', height: '90vh',
            borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{selectedInmueble.titulo}</h2>
              <button onClick={() => setSelectedInmueble(null)} style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            
            <div className="modal-content-flex" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Lado izquierdo: Media (360 o Imagen) */}
              <div className="media-container" style={{ background: '#000', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  {activeMedia?.type === 'tour' ? (
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      allow="xr-spatial-tracking; gyroscope; accelerometer" 
                      allowFullScreen 
                      scrolling="no" 
                      src={activeMedia.url}
                    ></iframe>
                  ) : (
                    <img src={activeMedia?.url || selectedInmueble.portada_url} alt="Media" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#0f172a' }} />
                  )}
                  
                  {activeMedia?.type === 'tour' && (
                    <div style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></span>
                      Tour Virtual 360°
                    </div>
                  )}
                </div>
                
              </div>
              
              {/* Lado derecho: Info */}
              <div className="info-container" style={{ padding: '32px', overflowY: 'auto', background: '#f8fafc' }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#2563eb', marginBottom: '8px' }}>
                  {formatCurrency(selectedInmueble.precio)}
                </div>
                <div style={{ color: '#64748b', fontSize: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📍 {selectedInmueble.direccion}, {selectedInmueble.ciudad}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Habitaciones</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{selectedInmueble.habitaciones}</div>
                  </div>
                  <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Baños</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{selectedInmueble.banos}</div>
                  </div>
                  <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Área Construida</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{selectedInmueble.area_construida} m²</div>
                  </div>
                  <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Parqueaderos</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{selectedInmueble.parqueaderos}</div>
                  </div>
                </div>
                
                {/* Carrusel miniatura (Gallery) movido aquí */}
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>Fotos Adicionales o Video 📹 (Múltiple)</h3>
                <div style={{ background: '#f1f5f9', padding: '12px', display: 'flex', gap: '12px', overflowX: 'auto', borderRadius: '12px', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
                  {/* Thumbnail del Tour 360 si existe */}
                  {selectedInmueble.tour_360_url && (
                    <div 
                      onClick={() => setActiveMedia({ type: 'tour', url: selectedInmueble.tour_360_url })}
                      style={{ 
                        width: '80px', height: '60px', borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
                        border: activeMedia?.url === selectedInmueble.tour_360_url ? '3px solid #3b82f6' : '3px solid transparent',
                        background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', position: 'relative'
                      }}
                    >
                      <img src={selectedInmueble.portada_url} alt="Tour 360" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, borderRadius: '4px' }} />
                      <div style={{ position: 'absolute', zIndex: 10, fontSize: '24px' }}>👁️</div>
                    </div>
                  )}
                  
                  {/* Thumbnail de Portada */}
                  {selectedInmueble.portada_url && (
                    <div 
                      onClick={() => setActiveMedia({ type: 'image', url: selectedInmueble.portada_url })}
                      style={{ 
                        width: '80px', height: '60px', borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
                        border: activeMedia?.url === selectedInmueble.portada_url ? '3px solid #3b82f6' : '3px solid transparent'
                      }}
                    >
                      <img src={selectedInmueble.portada_url} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                    </div>
                  )}
                  
                  {/* Thumbnails Adicionales */}
                  {selectedInmueble.inmueble_fotos && selectedInmueble.inmueble_fotos.map(foto => (
                    <div 
                      key={foto.id}
                      onClick={() => setActiveMedia({ type: 'image', url: foto.url })}
                      style={{ 
                        width: '80px', height: '60px', borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
                        border: activeMedia?.url === foto.url ? '3px solid #3b82f6' : '3px solid transparent'
                      }}
                    >
                      <img src={foto.url} alt="Foto Extra" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>Descripción</h3>
                <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '32px' }}>
                  {selectedInmueble.descripcion}
                </p>

                {selectedInmueble.amenidades && selectedInmueble.amenidades.length > 0 && (
                  <>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>Zonas y Amenidades</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '40px' }}>
                      {selectedInmueble.amenidades.map((amenidad, idx) => (
                        <div key={idx} style={{ background: '#e0e7ff', color: '#4338ca', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '600' }}>
                          ✓ {amenidad}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <button style={{ width: '100%', background: '#2563eb', color: 'white', padding: '16px', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#1d4ed8'} onMouseOut={(e) => e.target.style.background = '#2563eb'}>
                  Contactar Asesor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
