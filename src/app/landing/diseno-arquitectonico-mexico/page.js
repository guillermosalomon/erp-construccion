'use client';

/**
 * Landing Internacional: Riviera Maya (México) — Eco-Luxury Architecture, Interiors, Landscape & BIM Management
 * Route: /landing/diseno-arquitectonico-mexico
 * Basada en el sistema de diseño premium de /landing/construccion
 */

import { useState, useEffect, useRef } from 'react';

function captureTrackingParams() {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
        gclid: params.get('gclid') || '',
        msclkid: params.get('msclkid') || '',
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
    };
}

function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`lp-navbar ${scrolled ? 'lp-navbar--scrolled' : ''}`}>
            <div className="lp-nav-container">
                <a href="/" className="lp-nav-logo">
                    <img src="/icon.png" alt="Kalarti Logo" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }} />
                    <span className="lp-logo-text">KALARTI</span>
                    <span className="lp-logo-tagline">Riviera Maya Architecture & BIM</span>
                </a>
                <div className={`lp-nav-links ${mobileOpen ? 'lp-nav-links--open' : ''}`}>
                    <a href="#servicios" onClick={() => setMobileOpen(false)}>Servicios</a>
                    <a href="#pilares" onClick={() => setMobileOpen(false)}>Interiores & Paisajismo</a>
                    <a href="#bim" onClick={() => setMobileOpen(false)}>BIM Management</a>
                    <a href="#contacto" className="lp-nav-cta" onClick={() => setMobileOpen(false)}>Cotizar Proyecto</a>
                </div>
                <button className="lp-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menú">
                    <span /><span /><span />
                </button>
            </div>
        </nav>
    );
}

function HeroSection() {
    return (
        <section className="lp-hero">
            <div className="lp-hero-shapes">
                <div className="lp-shape lp-shape-1" />
                <div className="lp-shape lp-shape-2" />
                <div className="lp-shape lp-shape-3" />
            </div>
            <div className="lp-hero-container">
                <div className="lp-hero-content">
                    <div className="lp-hero-badge">
                        <span className="lp-badge-dot" />
                        México — Tulum, Cancún, Playa del Carmen & Bacalar
                    </div>
                    <h1 className="lp-hero-title">
                        Arquitectura Eco-Luxury, <span className="lp-gradient-text">Interiores, Paisajismo</span> & BIM en Riviera Maya
                    </h1>
                    <p className="lp-hero-subtitle">
                        Creamos eco-villas de lujo, hoteles boutique y desarrollos glamping que seducen al viajero internacional. Fusión magistral de bio-arquitectura en bambú/guadua, interiorismo chukum boho-chic, paisajismo selvático integrado y control riguroso con <strong>BIM Management en Revit</strong> dirigido por el Arq. Guillermo Salomón.
                    </p>
                    <div className="lp-hero-actions">
                        <a href="#contacto" className="lp-btn lp-btn-primary lp-btn-lg">
                            🌿 Iniciar Consulta de Proyecto
                        </a>
                        <a href="https://wa.me/573152717932?text=Hola%2C%20me%20interesa%20consultar%20dise%C3%B1o%20arquitect%C3%B3nico%2C%20interiores%20o%20BIM%20para%20un%20proyecto%20en%20Riviera%20Maya"
                           className="lp-btn lp-btn-whatsapp lp-btn-lg" target="_blank" rel="noopener">
                            📱 WhatsApp Consultor Internacional
                        </a>
                    </div>
                    <div className="lp-hero-trust">
                        <div className="lp-trust-item">✅ Coordinación BIM 5D Revit</div>
                        <div className="lp-trust-item">✅ Interiorismo Boho-Chic & Chukum</div>
                        <div className="lp-trust-item">✅ Paisajismo Selvático & Piscinas Cenote</div>
                    </div>
                </div>
                <div className="lp-hero-visual">
                    <div className="lp-hero-card"><div className="lp-card-icon">🎋</div><div className="lp-card-label">Filosofía</div><div className="lp-card-value">Eco-Luxury</div></div>
                    <div className="lp-hero-card lp-card-2"><div className="lp-card-icon">🏺</div><div className="lp-card-label">Acabados</div><div className="lp-card-value">Chukum</div></div>
                    <div className="lp-hero-card lp-card-3"><div className="lp-card-icon">🖥️</div><div className="lp-card-label">Tecnología</div><div className="lp-card-value">BIM 5D</div></div>
                </div>
            </div>
        </section>
    );
}

const SERVICES = [
    {
        icon: '🌴',
        title: 'Diseño Arquitectónico Eco-Luxury & Bio-Construcción',
        desc: 'Villas exclusivas inmersas en la selva maya, hoteles boutique tropicales y glampings de alto rendimiento. Geometrías orgánicas en bambú/guadua y maderas endémicas que respetan la flora nativa.',
        features: [
            'Estructuras icónicas en Guadua/Bambú y maderas finas (zapote, parota)',
            'Diseño bioclimático con ventilación pasiva y cubiertas termoacústicas',
            'Integración de normativas ambientales y bajas huellas de carbono',
            'Renders fotorrealistas Twinmotion y recorridos 3D para preventas'
        ]
    },
    {
        icon: '🪑',
        title: 'Diseño de Interiores & Acabados Boho-Chic de Autor',
        desc: 'Atmósferas sensoriales que invitan al descanso. Aplicación de estucos mayas tradicionales (chukum), mampostería en piedra caliza, maderas cálidas y mobiliario a medida despiezado paramétricamente.',
        features: [
            'Despiece milimétrico en Revit de carpintería fija, pérgolas y baños abiertos',
            'Iluminación escenográfica con tonalidades cálidas regulables',
            'Mobiliario con textiles orgánicos de lino y yute',
            'Catálogos de compras y fichas técnicas para proveedores locales'
        ]
    },
    {
        icon: '🌿',
        title: 'Paisajismo Selvático & Piscinas Tipo Cenote',
        desc: 'Transformación del terreno en un edén tropical privado. Piscinas orgánicas con bordes de roca caliza, espejos de agua, senderos biofílicos y paletas vegetales autóctonas de bajo consumo hídrico.',
        features: [
            'Piscinas naturales integradas con cascadas y áreas de relajación',
            'Preservación y protagonismo de árboles centenarios en el diseño',
            'Jardines interiores con orquídeas y helechos selváticos',
            'Sistemas biológicos de filtración y captación de agua de lluvia'
        ]
    },
    {
        icon: '🖥️',
        title: 'Implementación BIM Management & Soporte a Preventas',
        desc: 'Liderado por el Arq. Guillermo Salomón (Esp. BIM Management). Coordinación integral 3D de Arquitectura, Estructura e Instalaciones MEP para garantizar una obra sin sorpresas ni sobrecostos.',
        features: [
            'Detección anticipada de colisiones (Clash Detection) en Revit',
            'Cubicaciones y presupuestos 5D para desarrolladores e inversionistas',
            'Modelos interactivos para commercial decks y comercialización digital',
            'Planos de taller y coordinación técnica para contratistas en Quintana Roo'
        ]
    }
];

function ServicesSection() {
    return (
        <section className="lp-services" id="servicios">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Nuestros 4 Pilares en Riviera Maya</span>
                    <h2 className="lp-section-title">De la Selva Maya a la Arquitectura de Lujo Internacional</h2>
                    <p className="lp-section-desc">Diseñamos propiedades emblemáticas que capturan el espíritu de Tulum y Cancún, respaldadas por ingeniería de precisión digital.</p>
                </div>
                <div className="lp-services-grid">
                    {SERVICES.map((s, i) => (
                        <div key={i} className="lp-service-card">
                            <div className="lp-service-icon">{s.icon}</div>
                            <h3>{s.title}</h3>
                            <p>{s.desc}</p>
                            <ul className="lp-service-features">
                                {s.features.map((f, j) => <li key={j}>{f}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function PillarsSection() {
    return (
        <section className="lp-process" id="pilares" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Concepto Diferenciador</span>
                    <h2 className="lp-section-title">¿Por Qué Fusionar Arquitectura, Interiores y Paisajismo?</h2>
                    <p className="lp-section-desc">En el Caribe mexicano, la rentabilidad hotelera y residencial depende de generar una experiencia inmersiva e inolvidable:</p>
                </div>
                <div className="lp-process-grid">
                    <div className="lp-process-step">
                        <div className="lp-step-number">01</div>
                        <h3>Bio-Arquitectura</h3>
                        <p>Diseños que se funden con el follaje selvático y captan brisas marinas, reduciendo la factura de climatización mecánica.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">02</div>
                        <h3>Interiores con Alma</h3>
                        <p>Superficies continuas de chukum y madera tratada que transmiten serenidad y resisten la humedad salina del Caribe.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">03</div>
                        <h3>Paisajismo Exuberante</h3>
                        <p>Cenotes artificiales y vegetación tropical que garantizan privacidad total entre villas y una atmósfera paradisíaca.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">04</div>
                        <h3>BIM Management</h3>
                        <p>Control financiero y constructivo desde el primer día para levantar capital e iniciar preventas con confianza absoluta.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function BIMSection() {
    return (
        <section className="lp-process" id="bim">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Garantía Inmobiliaria</span>
                    <h2 className="lp-section-title">BIM 5D: La Clave del Éxito para Desarrolladores en Quintana Roo</h2>
                    <p className="lp-section-desc">Invertir en Tulum o Cancún exige certidumbre presupuestaria. Con la metodología BIM eliminamos la incertidumbre:</p>
                </div>
                <div className="lp-services-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🔍</div>
                        <h3>Cero Desfases de Obra</h3>
                        <p>Cada bajante sanitaria, viga y equipo de filtración de albercas se resuelve digitalmente antes de construir.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">📊</div>
                        <h3>Control Financiero 5D</h3>
                        <p>Cubicaciones exactas que permiten negociar precios justos con contratistas locales y proveedores de acabados.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🎥</div>
                        <h3>Potencia de Preventa</h3>
                        <p>Renders y videos cinematográficos extraídos del modelo para campañas de marketing internacional de alto impacto.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🌐</div>
                        <h3>Supervisión a Distancia</h3>
                        <p>Ideal para inversionistas en EE.UU., Europa o Ciudad de México que requieren reportes visuales con datos fidedignos.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ContactSection() {
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', servicio: 'eco_villa_tulum', ubicacion: 'Tulum / Riviera Maya', mensaje: '' });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const tracking = captureTrackingParams();
        const payload = {
            ...formData,
            ...tracking,
            landing_page: window.location.pathname,
            fuente: 'Landing Internacional México (Arquitectura, Interiores & BIM)'
        };

        try {
            await fetch('/api/marketing/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const msg = encodeURIComponent(`Hola, soy ${formData.nombre}. Me interesa cotizar: ${formData.servicio} en ${formData.ubicacion}. Tel: ${formData.telefono}. ${formData.mensaje || ''}`);
            window.open(`https://wa.me/573152717932?text=${msg}`, '_blank');
            setSubmitted(true);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    return (
        <section className="lp-contact" id="contacto">
            <div className="lp-container">
                <div className="lp-contact-grid">
                    <div className="lp-contact-info">
                        <span className="lp-section-tag">Riviera Maya Projects</span>
                        <h2 className="lp-section-title" style={{ textAlign: 'left' }}>Iniciemos Tu Proyecto</h2>
                        <p>Comparte con nosotros la visión de tu lote o desarrollo turístico en el Caribe mexicano. Nuestro director de arquitectura y BIM te responderá en menos de 24 horas para coordinar una reunión técnica.</p>
                        <div className="lp-contact-details">
                            <div className="lp-contact-item"><span>📍</span><div><strong>Zonas de Cobertura</strong><p>Tulum, Cancún, Playa del Carmen, Puerto Morelos, Bacalar y Cozumel</p></div></div>
                            <div className="lp-contact-item"><span>📱</span><div><strong>WhatsApp Internacional</strong><p>+57 315 271 7932</p></div></div>
                            <div className="lp-contact-item"><span>✉️</span><div><strong>Email</strong><p>consultoria@kalarti.com</p></div></div>
                        </div>
                    </div>
                    <div className="lp-form-wrapper">
                        {!submitted ? (
                            <form className="lp-lead-form" onSubmit={handleSubmit}>
                                <h3>Solicitar Asesoría de Diseño & BIM</h3>
                                <div className="lp-form-row">
                                    <div className="lp-form-group">
                                        <label htmlFor="nombre">Nombre Completo *</label>
                                        <input type="text" id="nombre" name="nombre" required placeholder="Tu nombre" value={formData.nombre} onChange={handleChange} />
                                    </div>
                                    <div className="lp-form-group">
                                        <label htmlFor="telefono">WhatsApp / Teléfono *</label>
                                        <input type="tel" id="telefono" name="telefono" required placeholder="+52 (000) 000-0000 / +1..." value={formData.telefono} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="email">Correo Electrónico *</label>
                                    <input type="email" id="email" name="email" required placeholder="tu@email.com" value={formData.email} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="servicio">Servicio de Interés *</label>
                                    <select id="servicio" name="servicio" required value={formData.servicio} onChange={handleChange}>
                                        <option value="eco_villa_tulum">Eco-Villa de Lujo / Residencia Selvática</option>
                                        <option value="hotel_boutique_resort">Hotel Boutique / Glamping Resort</option>
                                        <option value="interiorismo_chukum">Diseño de Interiores Boho-Chic (Chukum & Madera)</option>
                                        <option value="paisajismo_albercas_cenote">Paisajismo Selvático & Albercas Tipo Cenote</option>
                                        <option value="bim_management_desarrolladores">Implementación BIM Management & Coordinación 5D</option>
                                        <option value="paquete_integral_mexico">Paquete Completo (Arquitectura + Interiores + Paisajismo + BIM)</option>
                                    </select>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="ubicacion">Ubicación del Terreno</label>
                                    <input type="text" id="ubicacion" name="ubicacion" placeholder="Tulum (La Veleta, Aldea Zama), Playa del Carmen, Bacalar..." value={formData.ubicacion} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="mensaje">Detalles del Proyecto</label>
                                    <textarea id="mensaje" name="mensaje" rows="3" placeholder="Superficie aproximada en m², número de llaves/habitaciones, cronograma..." value={formData.mensaje} onChange={handleChange} />
                                </div>
                                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-full" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Solicitar Propuesta de Diseño ➔'}
                                </button>
                                <p className="lp-form-disclaimer">Información confidencial para desarrolladores y propietarios.</p>
                            </form>
                        ) : (
                            <div className="lp-form-success">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3>¡Solicitud Recibida!</h3>
                                <p>Un arquitecto especialista en proyectos para Riviera Maya se comunicará contigo vía WhatsApp.</p>
                                <a href="https://wa.me/573152717932" className="lp-btn lp-btn-whatsapp" target="_blank" rel="noopener">
                                    Escribir por WhatsApp Directo
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer className="lp-footer">
            <div className="lp-container">
                <div className="lp-footer-content">
                    <div className="lp-footer-brand">
                        <div className="lp-nav-logo">
                            <img src="/icon.png" alt="Kalarti Logo" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }} />
                            <span className="lp-logo-text" style={{ color: '#fff' }}>KALARTI</span>
                        </div>
                        <p>Constructores y Consultores S.A.S. — División Internacional</p>
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>México • Riviera Maya • Eco-Luxury Architecture, Interiors, Landscape & BIM</p>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Servicios México</h4>
                        <a href="#servicios">Eco-Villas & Hoteles</a>
                        <a href="#servicios">Diseño de Interiores</a>
                        <a href="#servicios">Paisajismo Selvático</a>
                        <a href="#bim">BIM Management 5D</a>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Contacto</h4>
                        <a href="https://wa.me/573152717932">+57 315 271 7932</a>
                        <a href="mailto:consultoria@kalarti.com">consultoria@kalarti.com</a>
                        <a href="https://kalarti.com" target="_blank" rel="noopener">www.kalarti.com</a>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    <p>© 2026 KALARTI Constructores y Consultores S.A.S. Proyectos Riviera Maya, México.</p>
                </div>
            </div>
        </footer>
    );
}

export default function LandingMexico() {
    return (
        <>
            <link rel="stylesheet" href="/landing-construccion.css" />
            <Navbar />
            <HeroSection />
            <ServicesSection />
            <PillarsSection />
            <BIMSection />
            <ContactSection />
            <Footer />
            <a href="https://wa.me/573152717932?text=Hola%2C%20me%20interesa%20consultar%20dise%C3%B1o%20arquitect%C3%B3nico%20y%20BIM%20en%20Riviera%20Maya"
               className="lp-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </>
    );
}
