'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { inmuebles as officialInmuebles } from '@/data/inmuebles';

export default function PropiedadesMarketplace() {
  const [inmuebles, setInmuebles] = useState(officialInmuebles);
  const [loading, setLoading] = useState(false);
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInmuebles();
  }, []);

  const fetchInmuebles = async () => {
    if (!supabase) {
      setInmuebles(officialInmuebles);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*, inmueble_fotos(*)')
        .eq('estado', 'DISPONIBLE')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Merge: keep all official rich static properties with slugs
      // and append any newly created dynamic properties that might exist
      if (data && data.length > 0) {
        const extraProperties = data.filter(
          (d) => !officialInmuebles.some((o) => o.titulo.toLowerCase() === d.titulo.toLowerCase())
        );
        setInmuebles([...officialInmuebles, ...extraProperties]);
      } else {
        setInmuebles(officialInmuebles);
      }
    } catch (err) {
      console.warn('Using official static portfolio:', err.message);
      setInmuebles(officialInmuebles);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  };

  // Filtering
  const filteredInmuebles = inmuebles.filter((i) => {
    const matchesTipo = 
      filterTipo === 'Todos' ? true :
      filterTipo === 'Apartamentos' ? i.tipo.toLowerCase().includes('apartamento') :
      filterTipo === 'Casas' ? (i.tipo.toLowerCase().includes('casa') || (i.subtipo && i.subtipo.toLowerCase().includes('cabaña'))) :
      filterTipo === 'Lotes' ? i.tipo.toLowerCase().includes('lote') : true;

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || (
      (i.titulo && i.titulo.toLowerCase().includes(term)) ||
      (i.ciudad && i.ciudad.toLowerCase().includes(term)) ||
      (i.departamento && i.departamento.toLowerCase().includes(term)) ||
      (i.sector && i.sector.toLowerCase().includes(term)) ||
      (i.descripcion_corta && i.descripcion_corta.toLowerCase().includes(term))
    );

    return matchesTipo && matchesSearch;
  });

  return (
    <div className="marketplace-root">
      <style>{`
        .marketplace-root {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background-color: #f8fafc;
          min-height: 100vh;
          color: #1e293b;
        }

        .market-nav {
          background: #0f172a;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .market-hero {
          background: linear-gradient(rgba(15,23,42,0.85), rgba(15,23,42,0.85)), url(/inmuebles-web/apartamento-turistico-santa-marina-santa-marta/portada.jpg) center/cover;
          padding: 60px 16px;
          text-align: center;
          color: white;
        }

        .market-search-bar {
          background: white;
          padding: 8px;
          border-radius: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
        }

        .market-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 28px;
        }

        @media (max-width: 768px) {
          .market-nav {
            padding: 12px 16px;
          }
          .market-hero {
            padding: 40px 14px;
          }
          .market-hero-title {
            font-size: 26px !important;
          }
          .market-hero-sub {
            font-size: 15px !important;
            margin-bottom: 24px !important;
          }
          .market-search-bar {
            flex-direction: column;
            padding: 10px;
          }
          .market-search-bar select,
          .market-search-bar input,
          .market-search-bar button {
            width: 100% !important;
            flex: none !important;
            box-sizing: border-box;
          }
          .market-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .market-container {
            padding: 32px 14px !important;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="market-nav">
        <Link href="/" style={{ fontSize: '20px', fontWeight: '800', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/icon.png" alt="Kalarti Logo" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain' }} />
          KALARTI <span style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '600' }}>Inmobiliaria</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>Inicio</Link>
          <a 
            href="https://wa.me/573177725056?text=Hola%20Ana,%20quisiera%20asesor%C3%ADa%20para%20comprar%20un%20inmueble%20en%20Kalarti" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              background: '#22c55e', color: 'white', padding: '7px 13px', borderRadius: '8px', 
              textDecoration: 'none', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' 
            }}
          >
            WhatsApp
          </a>
        </div>
      </nav>

      {/* HERO BUSCADOR */}
      <div className="market-hero">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ background: '#f59e0b', color: '#0f172a', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Portafolio Oficial 2026
          </span>
          <h1 className="market-hero-title" style={{ fontSize: '38px', fontWeight: '800', margin: '16px 0 10px 0', lineHeight: '1.2' }}>
            Inmuebles y Proyectos en Venta
          </h1>
          <p className="market-hero-sub" style={{ fontSize: '17px', color: '#cbd5e1', marginBottom: '32px', lineHeight: '1.5' }}>
            Apartamentos turísticos, casas campestres y lotes urbanizados en Pasto, Chachagüí, Santa Marta y El Bordo.
          </p>

          {/* BARRA DE FILTROS RESPONSIVA */}
          <div className="market-search-bar">
            <select 
              value={filterTipo} 
              onChange={(e) => setFilterTipo(e.target.value)}
              style={{ flex: '1 1 170px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b', outline: 'none', background: '#f8fafc', fontWeight: '600' }}
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Apartamentos">Apartamentos</option>
              <option value="Casas">Casas / Cabañas</option>
              <option value="Lotes">Lotes / Terrenos</option>
            </select>

            <input 
              type="text" 
              placeholder="Buscar por ciudad, sector o palabra clave (ej. Pasto, Chachagüí, Santa Marta)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: '2 1 260px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', color: '#1e293b' }} 
            />

            <button 
              onClick={() => {}}
              style={{ background: '#0284c7', color: 'white', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
            >
              Explorar
            </button>
          </div>
        </div>
      </div>

      {/* GRID DE INMUEBLES */}
      <div className="market-container" style={{ padding: '50px 20px', maxWidth: '1360px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
              Propiedades Disponibles ({filteredInmuebles.length})
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Selecciona una propiedad para ver detalles, planos, fotos, videos y consultar con la asesora Ana.
            </p>
          </div>

          {/* Botones de filtro rápido */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['Todos', 'Apartamentos', 'Casas', 'Lotes'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterTipo(cat)}
                style={{
                  padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer',
                  background: filterTipo === cat ? '#0f172a' : '#e2e8f0',
                  color: filterTipo === cat ? 'white' : '#475569',
                  transition: 'all 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredInmuebles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px' }}>No encontramos inmuebles con ese criterio</h3>
            <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>Prueba cambiando el tipo o la palabra clave de búsqueda.</p>
            <button 
              onClick={() => { setFilterTipo('Todos'); setSearchTerm(''); }}
              style={{ background: '#0284c7', color: 'white', padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Ver todos los inmuebles
            </button>
          </div>
        ) : (
          <div className="market-grid">
            {filteredInmuebles.map((inmueble) => {
              const waMsg = inmueble.asesor?.whatsapp_msg || `Hola Ana, me interesa la propiedad ${inmueble.titulo}`;
              const waLink = `https://wa.me/${inmueble.asesor?.telefono || '573177725056'}?text=${encodeURIComponent(waMsg)}`;

              return (
                <div 
                  key={inmueble.id}
                  style={{ 
                    background: 'white', borderRadius: '16px', overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid #e2e8f0',
                    display: 'flex', flexDirection: 'column'
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.transform = 'translateY(-4px)'; 
                    e.currentTarget.style.boxShadow = '0 16px 20px -5px rgba(0, 0, 0, 0.08)'; 
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.transform = 'none'; 
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; 
                  }}
                >
                  {/* IMAGEN Y BADGES */}
                  <Link href={`/propiedades/${inmueble.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ height: '220px', position: 'relative', overflow: 'hidden', background: '#0f172a' }}>
                      <img 
                        src={inmueble.portada_url} 
                        alt={inmueble.titulo} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }} 
                        onMouseOver={(e) => e.target.style.transform = 'scale(1.04)'}
                        onMouseOut={(e) => e.target.style.transform = 'none'}
                      />
                      
                      {/* Badge Operación */}
                      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ background: '#0284c7', color: 'white', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>
                          {inmueble.operacion}
                        </span>
                        {inmueble.licencia_turistica && (
                          <span style={{ background: '#10b981', color: 'white', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px' }}>
                            Licencia Turística
                          </span>
                        )}
                      </div>

                      {/* Badge Video */}
                      {inmueble.video_url && (
                        <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          📹 Video
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* CONTENIDO DE LA TARJETA */}
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {inmueble.tipo} • 📍 {inmueble.ciudad}
                    </div>

                    <Link href={`/propiedades/${inmueble.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0', lineHeight: '1.35', minHeight: '48px' }}>
                        {inmueble.titulo}
                      </h3>
                    </Link>

                    <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.5', margin: '0 0 14px 0', flex: 1 }}>
                      {inmueble.descripcion_corta}
                    </p>

                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#0284c7', marginBottom: '14px' }}>
                      {formatCurrency(inmueble.precio)}
                    </div>

                    {/* ESPECIFICACIONES RAPIDAS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '16px', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                      {inmueble.habitaciones && <div>🛏️ {inmueble.habitaciones} Habs</div>}
                      {inmueble.banos && <div>🚿 {inmueble.banos} Baños</div>}
                      {inmueble.parqueaderos && <div>🚗 {inmueble.parqueaderos} Parq.</div>}
                      <div>📐 {inmueble.area_construida || inmueble.area_terreno} m²</div>
                    </div>

                    {/* BOTONES DE ACCION */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                      <Link 
                        href={`/propiedades/${inmueble.slug}`}
                        style={{
                          background: '#0f172a', color: 'white', textAlign: 'center', padding: '11px',
                          borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '13px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        Ver Detalles ↗
                      </Link>

                      <a 
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Escribir a Ana por WhatsApp"
                        style={{
                          background: '#22c55e', color: 'white', padding: '11px 15px',
                          borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        💬
                      </a>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '36px 20px', marginTop: '50px', textAlign: 'center', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ margin: '0 0 8px 0', color: '#f8fafc', fontWeight: 'bold', fontSize: '15px' }}>KALARTI Inmobiliaria & Construcción</p>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>Portafolio de bienes raíces seleccionados con rigor técnico y legal en Colombia.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Inicio</Link>
            <Link href="/propiedades" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Catálogo</Link>
            <a href="https://wa.me/573177725056?text=Hola%20Ana,%20quisiera%20asesor%C3%ADa%20inmobiliaria" target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 'bold' }}>WhatsApp Ana: +57 317 772 5056</a>
          </div>
          <p style={{ fontSize: '12px', marginTop: '20px', color: '#64748b' }}>© {new Date().getFullYear()} Kalarti. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  );
}
