'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function PropertyDetailClient({ inmueble, relatedInmuebles }) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', mensaje: '' });
  const [formStatus, setFormStatus] = useState({ loading: false, success: false, error: null });
  const thumbnailsRef = useRef(null);

  // Build media list: include video, floor plan, and gallery photos
  const mediaList = [];

  if (inmueble.video_url) {
    mediaList.push({
      type: 'video',
      url: inmueble.video_url,
      label: 'Video Recorrido',
      thumb: inmueble.portada_url
    });
  }

  if (inmueble.plano_url) {
    mediaList.push({
      type: 'image',
      url: inmueble.plano_url,
      label: 'Plano Arquitectónico',
      alt: `Plano ${inmueble.titulo}`
    });
  }

  if (inmueble.galeria && inmueble.galeria.length > 0) {
    inmueble.galeria.forEach((item, idx) => {
      if (!mediaList.some(m => m.url === item.url)) {
        mediaList.push({
          type: 'image',
          url: item.url,
          label: `Foto ${idx + 1}`,
          alt: item.alt || inmueble.titulo
        });
      }
    });
  } else if (inmueble.portada_url) {
    mediaList.push({
      type: 'image',
      url: inmueble.portada_url,
      label: 'Portada',
      alt: inmueble.titulo
    });
  }

  const currentMedia = mediaList[activeMediaIndex] || mediaList[0];

  const handlePrev = (e) => {
    e?.stopPropagation();
    setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setActiveMediaIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

  // Scroll active thumbnail smoothly into view
  useEffect(() => {
    if (thumbnailsRef.current) {
      const activeEl = thumbnailsRef.current.children[activeMediaIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeMediaIndex]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  const defaultWaMsg = `Hola Ana, me interesa recibir más información sobre la propiedad ${inmueble.titulo}`;
  const whatsappMsg = inmueble.asesor?.whatsapp_msg || defaultWaMsg;
  const whatsappUrl = `https://wa.me/${inmueble.asesor?.telefono || '573177725056'}?text=${encodeURIComponent(whatsappMsg)}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null });

    try {
      const res = await fetch('/api/marketing/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          telefono: formData.telefono,
          email: formData.email,
          servicio: 'inmobiliaria',
          ciudad: inmueble.ciudad,
          mensaje: `Interés en propiedad: ${inmueble.titulo} (Ref: ${inmueble.id}). Mensaje: ${formData.mensaje}`,
          landing_page: `/propiedades/${inmueble.slug}`
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFormStatus({ loading: false, success: true, error: null });
        setFormData({ nombre: '', telefono: '', email: '', mensaje: '' });
      } else {
        throw new Error(json.error || 'Error al enviar solicitud');
      }
    } catch (err) {
      console.error(err);
      setFormStatus({ loading: false, success: false, error: 'Hubo un error al enviar tu consulta. Por favor contáctanos por WhatsApp.' });
    }
  };

  return (
    <div className="property-page-root">
      <style>{`
        .property-page-root {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background-color: #f8fafc;
          min-height: 100vh;
          color: #1e293b;
        }
        
        .prop-nav {
          background: #0f172a;
          padding: 14px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .prop-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.85fr) minmax(320px, 1fr);
          gap: 32px;
        }

        .prop-media-stage {
          background: #0f172a;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          height: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12);
          user-select: none;
        }

        /* Botones de Carrusel */
        .prop-carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.75);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.25);
          font-size: 28px;
          font-weight: 300;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 30;
          transition: all 0.2s ease;
          backdrop-filter: blur(6px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .prop-carousel-btn:hover {
          background: rgba(15, 23, 42, 0.95);
          transform: translateY(-50%) scale(1.08);
        }

        .prop-carousel-btn:active {
          transform: translateY(-50%) scale(0.96);
        }

        .prop-carousel-prev {
          left: 14px;
        }

        .prop-carousel-next {
          right: 14px;
        }

        .prop-carousel-counter {
          position: absolute;
          bottom: 14px;
          right: 14px;
          background: rgba(15, 23, 42, 0.75);
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 700;
          backdrop-filter: blur(4px);
          z-index: 25;
          letter-spacing: 0.04em;
        }

        /* Tira de Miniaturas con Barra de Desplazamiento Horizontal */
        .prop-thumbnails-strip {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          padding: 10px 4px 14px 4px;
          margin-top: 10px;
          margin-bottom: 12px;
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 #e2e8f0;
        }

        .prop-thumbnails-strip::-webkit-scrollbar {
          height: 7px;
        }
        .prop-thumbnails-strip::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 6px;
        }
        .prop-thumbnails-strip::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 6px;
        }
        .prop-thumbnails-strip::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }

        .prop-thumb-btn {
          flex: 0 0 88px !important;
          width: 88px !important;
          min-width: 88px !important;
          height: 62px !important;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          background: #1e293b;
          padding: 0;
          border: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .prop-thumb-btn.active {
          border: 3px solid #0284c7 !important;
          box-shadow: 0 0 0 1px #0284c7;
        }

        .prop-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .prop-sidebar-sticky {
          position: sticky;
          top: 80px;
        }

        .prop-specs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 16px;
        }

        .mobile-floating-bar {
          display: none;
        }

        /* RESPONSIVE BREAKPOINTS */
        @media (max-width: 1024px) {
          .prop-main-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .prop-sidebar-sticky {
            position: static;
          }
        }

        @media (max-width: 768px) {
          .prop-nav {
            padding: 10px 14px;
          }
          .prop-nav-logo-text {
            font-size: 17px !important;
          }
          .prop-media-stage {
            height: 320px;
            border-radius: 12px;
          }
          .prop-carousel-btn {
            width: 38px;
            height: 38px;
            font-size: 24px;
          }
          .prop-carousel-prev {
            left: 8px;
          }
          .prop-carousel-next {
            right: 8px;
          }
          .prop-thumb-btn {
            flex: 0 0 76px !important;
            width: 76px !important;
            min-width: 76px !important;
            height: 54px !important;
          }
          .prop-header-flex {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .prop-price-box {
            text-align: left !important;
            border-top: 1px solid #f1f5f9;
            padding-top: 12px;
          }
          .prop-price-val {
            font-size: 26px !important;
          }
          .prop-h1 {
            font-size: 22px !important;
          }
          .prop-card-padding {
            padding: 20px 16px !important;
          }
          .prop-specs-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            padding: 16px !important;
          }

          /* Barra flotante inferior de WhatsApp */
          .mobile-floating-bar {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(8px);
            padding: 10px 14px;
            border-top: 1px solid #e2e8f0;
            z-index: 999;
            box-shadow: 0 -4px 15px rgba(0,0,0,0.08);
            gap: 12px;
            align-items: center;
          }

          .property-page-root {
            padding-bottom: 74px;
          }
        }

        @media (max-width: 480px) {
          .prop-media-stage {
            height: 260px;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="prop-nav">
        <Link href="/" style={{ fontWeight: '800', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }} className="prop-nav-logo-text">
          <img src="/icon.png" alt="Kalarti Logo" style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'contain' }} />
          KALARTI <span style={{ color: '#f59e0b', fontSize: '13px', fontWeight: '600' }}>Inmobiliaria</span>
        </Link>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/propiedades" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
            ← Catálogo
          </Link>
          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              background: '#22c55e', color: 'white', padding: '7px 12px', borderRadius: '8px', 
              textDecoration: 'none', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
            }}
          >
            WhatsApp
          </a>
        </div>
      </nav>

      {/* BREADCRUMB & TITULO HERO */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '18px 16px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {/* Breadcrumbs */}
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Inicio</Link>
            <span>/</span>
            <Link href="/propiedades" style={{ color: '#64748b', textDecoration: 'none' }}>Propiedades</Link>
            <span>/</span>
            <span style={{ color: '#0f172a', fontWeight: '600' }}>{inmueble.titulo}</span>
          </div>

          <div className="prop-header-flex">
            <div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: '#0284c7', color: 'white', padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                  {inmueble.operacion}
                </span>
                <span style={{ background: '#e2e8f0', color: '#334155', padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                  {inmueble.tipo}
                </span>
                {inmueble.licencia_turistica && (
                  <span style={{ background: '#10b981', color: 'white', padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                    Licencia Turística
                  </span>
                )}
                {inmueble.etapa && (
                  <span style={{ background: '#f59e0b', color: '#0f172a', padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                    {inmueble.etapa} • Entrega {inmueble.entrega}
                  </span>
                )}
              </div>
              <h1 className="prop-h1" style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', lineHeight: '1.25' }}>
                {inmueble.titulo}
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                📍 {inmueble.direccion} • <strong>{inmueble.ciudad}, {inmueble.departamento}</strong>
              </p>
            </div>

            <div className="prop-price-box" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Precio de Venta</div>
              <div className="prop-price-val" style={{ fontSize: '32px', fontWeight: '900', color: '#0284c7' }}>
                {formatCurrency(inmueble.precio)}
              </div>
              {inmueble.precio_texto && (
                <div style={{ fontSize: '12px', color: '#64748b' }}>{inmueble.precio_texto}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: MEDIA + SIDEBAR */}
      <div style={{ maxWidth: '1280px', margin: '20px auto', padding: '0 16px' }}>
        <div className="prop-main-grid">
          
          {/* COLUMNA IZQUIERDA: GALERIA Y DETALLES */}
          <div>
            {/* STAGE MULTIMEDIA CON BOTONES DE CARRUSEL */}
            <div className="prop-media-stage">
              {currentMedia?.type === 'video' ? (
                <video 
                  key={currentMedia.url}
                  controls 
                  autoPlay 
                  playsInline 
                  src={currentMedia.url} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                />
              ) : (
                <img 
                  key={currentMedia?.url}
                  src={currentMedia?.url} 
                  alt={currentMedia?.alt || inmueble.titulo} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0f172a' }} 
                />
              )}

              {/* Botón Carrusel Anterior */}
              {mediaList.length > 1 && (
                <button 
                  type="button"
                  onClick={handlePrev}
                  className="prop-carousel-btn prop-carousel-prev"
                  title="Foto anterior"
                  aria-label="Foto anterior"
                >
                  ‹
                </button>
              )}

              {/* Botón Carrusel Siguiente */}
              {mediaList.length > 1 && (
                <button 
                  type="button"
                  onClick={handleNext}
                  className="prop-carousel-btn prop-carousel-next"
                  title="Foto siguiente"
                  aria-label="Foto siguiente"
                >
                  ›
                </button>
              )}

              {/* Badge de tipo de recurso */}
              <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', color: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', zIndex: 25 }}>
                {currentMedia?.type === 'video' ? '📹 Video Oficial' : currentMedia?.label || 'Fotografía'}
              </div>

              {/* Contador de fotos en Carrusel */}
              {mediaList.length > 1 && (
                <div className="prop-carousel-counter">
                  {activeMediaIndex + 1} / {mediaList.length}
                </div>
              )}
            </div>

            {/* TIRA DE MINIATURAS CON BARRA DE DESPLAZAMIENTO HORIZONTAL */}
            {mediaList.length > 1 && (
              <div 
                ref={thumbnailsRef}
                className="prop-thumbnails-strip"
              >
                {mediaList.map((media, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveMediaIndex(idx)}
                    className={`prop-thumb-btn ${activeMediaIndex === idx ? 'active' : ''}`}
                    title={media.label}
                  >
                    <img 
                      src={media.thumb || media.url} 
                      alt={media.label} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    {media.type === 'video' && (
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', color: 'white', fontSize: '18px' }}>
                        ▶
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* BARRA DE ESPECIFICACIONES CLAVE */}
            <div className="prop-specs-grid" style={{ 
              margin: '16px 0 24px 0', background: 'white', padding: '20px', 
              borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' 
            }}>
              {inmueble.area_construida && (
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Área Construida</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>📐 {inmueble.area_construida} m²</div>
                </div>
              )}
              {inmueble.area_terreno && (
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Área Terreno</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>🌿 {inmueble.area_terreno} m²</div>
                </div>
              )}
              {inmueble.habitaciones && (
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Habitaciones</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>🛏️ {inmueble.habitaciones}</div>
                </div>
              )}
              {inmueble.banos && (
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Baños</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>🚿 {inmueble.banos}</div>
                </div>
              )}
              {inmueble.parqueaderos && (
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Parqueaderos</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>🚗 {inmueble.parqueaderos}</div>
                </div>
              )}
              {inmueble.piso && (
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Piso</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>🏢 Piso {inmueble.piso}</div>
                </div>
              )}
            </div>

            {/* DESCRIPCIÓN COMPLETA */}
            <div className="prop-card-padding" style={{ background: 'white', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: 0, marginBottom: '14px' }}>
                Descripción Detallada
              </h2>
              <div style={{ color: '#475569', lineHeight: '1.75', fontSize: '15px', whiteSpace: 'pre-line' }}>
                {inmueble.descripcion_completa}
              </div>
            </div>

            {/* AMENIDADES Y ZONAS COMUNES */}
            {inmueble.amenidades && inmueble.amenidades.length > 0 && (
              <div className="prop-card-padding" style={{ background: 'white', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: 0, marginBottom: '16px' }}>
                  Amenidades y Características Destacadas
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {inmueble.amenidades.map((amenidad, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '16px' }}>✓</span>
                      <span style={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>{amenidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTOR Y UBICACIÓN */}
            <div className="prop-card-padding" style={{ background: 'white', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: 0, marginBottom: '12px' }}>
                Ubicación y Entorno
              </h2>
              <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6', marginBottom: '18px' }}>
                {inmueble.direccion}. Ubicado en <strong>{inmueble.ciudad}, {inmueble.departamento}</strong>, con acceso directo a vías principales y servicios.
              </p>
              
              {inmueble.maps_url && (
                <a 
                  href={inmueble.maps_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: '#eff6ff', color: '#0284c7', padding: '12px 20px', borderRadius: '10px',
                    textDecoration: 'none', fontWeight: '700', fontSize: '14px', border: '1px solid #bfdbfe'
                  }}
                >
                  📍 Ver ubicación en Google Maps ↗
                </a>
              )}
            </div>

          </div>

          {/* COLUMNA DERECHA: SIDEBAR DE CONTACTO */}
          <div>
            <div className="prop-sidebar-sticky">
              
              {/* CARD DE CONTACTO */}
              <div style={{ 
                background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.06)', marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#f59e0b', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                    👩‍💼
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>Ana</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Asesora Inmobiliaria Kalarti</div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Precio de Venta</div>
                <div style={{ fontSize: '26px', fontWeight: '900', color: '#0284c7', margin: '4px 0 16px 0' }}>
                  {formatCurrency(inmueble.precio)}
                </div>

                {/* BOTON WHATSAPP */}
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    background: '#22c55e', color: 'white', padding: '14px', borderRadius: '12px',
                    textDecoration: 'none', fontWeight: '800', fontSize: '15px', marginBottom: '16px',
                    boxShadow: '0 8px 16px -4px rgba(34, 197, 94, 0.4)', transition: 'transform 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                  <span style={{ fontSize: '18px' }}>💬</span> Chatear por WhatsApp
                </a>

                <div style={{ textAlign: 'center', margin: '14px 0', position: 'relative' }}>
                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
                  <span style={{ position: 'absolute', top: '-9px', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0 10px', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}>
                    O ENVÍANOS UN MENSAJE
                  </span>
                </div>

                {/* FORMULARIO DE LEADS */}
                {formStatus.success ? (
                  <div style={{ background: '#ecfdf5', color: '#065f46', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '26px', marginBottom: '6px' }}>🎉</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>¡Solicitud enviada!</div>
                    <div style={{ fontSize: '13px', color: '#047857' }}>Ana se comunicará contigo al teléfono indicado lo más pronto posible.</div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Tu Nombre *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ej. Carlos Mendoza"
                        value={formData.nombre}
                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Tu Teléfono / WhatsApp *</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="Ej. 317 123 4567"
                        value={formData.telefono}
                        onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Correo electrónico (opcional)</label>
                      <input 
                        type="email" 
                        placeholder="ejemplo@correo.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Consulta</label>
                      <textarea 
                        rows="3" 
                        placeholder="Quisiera coordinar una visita o conocer opciones de pago..."
                        value={formData.mensaje}
                        onChange={e => setFormData({ ...formData, mensaje: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                      ></textarea>
                    </div>

                    {formStatus.error && (
                      <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: '500' }}>{formStatus.error}</div>
                    )}

                    <button 
                      type="submit" 
                      disabled={formStatus.loading}
                      style={{ 
                        background: '#0f172a', color: 'white', padding: '12px', borderRadius: '10px', 
                        fontSize: '14px', fontWeight: '700', border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(15,23,42,0.2)'
                      }}
                    >
                      {formStatus.loading ? 'Enviando...' : 'Enviar Consulta'}
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* OTRAS PROPIEDADES DISPONIBLES */}
        {relatedInmuebles && relatedInmuebles.length > 0 && (
          <div style={{ marginTop: '48px', borderTop: '1px solid #e2e8f0', paddingTop: '30px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>
              Otras Propiedades Disponibles
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
              {relatedInmuebles.map((item) => (
                <Link 
                  key={item.id} 
                  href={`/propiedades/${item.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ height: '170px', position: 'relative' }}>
                      <img src={item.portada_url} alt={item.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#0f172a', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                        {item.tipo}
                      </div>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{item.ciudad}</div>
                      <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0', lineHeight: '1.3' }}>{item.titulo}</h3>
                      <div style={{ fontSize: '17px', fontWeight: '800', color: '#0284c7' }}>{formatCurrency(item.precio)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* BARRA FLOTANTE MÓVIL DE WHATSAPP */}
      <div className="mobile-floating-bar">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Precio</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#0284c7', lineHeight: '1' }}>{formatCurrency(inmueble.precio)}</div>
        </div>
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#22c55e', color: 'white', padding: '10px 16px', borderRadius: '10px',
            textDecoration: 'none', fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <span>💬</span> WhatsApp
        </a>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '36px 20px', marginTop: '60px', textAlign: 'center', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ margin: '0 0 8px 0', color: '#f8fafc', fontWeight: 'bold', fontSize: '15px' }}>KALARTI Inmobiliaria & Construcción</p>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>Propiedades exclusivas en Pasto, Chachagüí, Santa Marta y Suroccidente colombiano.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Inicio</Link>
            <Link href="/propiedades" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Catálogo</Link>
            <a href="https://wa.me/573177725056" target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 'bold' }}>WhatsApp: +57 317 772 5056</a>
          </div>
          <p style={{ fontSize: '12px', marginTop: '20px', color: '#64748b' }}>© {new Date().getFullYear()} Kalarti. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  );
}
