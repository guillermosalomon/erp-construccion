'use client';

/**
 * Landing Internacional: Panamá — Architectural Design, Interior Fit-Out, Landscape & BIM Management
 * Route: /landing/diseno-estructural-panama
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
                    <span className="lp-logo-tagline">Panamá Architecture & BIM</span>
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
                        Panamá — Ciudad de Panamá, Costa del Este, Santa María & Buenaventura
                    </div>
                    <h1 className="lp-hero-title">
                        Diseño Arquitectónico, <span className="lp-gradient-text">Interiores, Paisajismo</span> & BIM en Panamá
                    </h1>
                    <p className="lp-hero-subtitle">
                        Consultoría y diseño integral para desarrolladores e inversionistas en Panamá. Proyectos residenciales de lujo, oficinas corporativas, bodegas logísticas y retail coordinados con metodología <strong>BIM Management en Revit</strong> por el Arq. Guillermo Salomón. Máxima precisión en costos y cero desviaciones en obra.
                    </p>
                    <div className="lp-hero-actions">
                        <a href="#contacto" className="lp-btn lp-btn-primary lp-btn-lg">
                            📊 Solicitar Propuesta Técnica
                        </a>
                        <a href="https://wa.me/573152717932?text=Hola%2C%20me%20interesa%20consultar%20dise%C3%B1o%20arquitect%C3%B3nico%2C%20interiores%20o%20BIM%20para%20un%20proyecto%20en%20Panam%C3%A1"
                           className="lp-btn lp-btn-whatsapp lp-btn-lg" target="_blank" rel="noopener">
                            📱 WhatsApp Consultor BIM
                        </a>
                    </div>
                    <div className="lp-hero-trust">
                        <div className="lp-trust-item">✅ Coordinación BIM 5D Revit</div>
                        <div className="lp-trust-item">✅ Interiorismo Corporativo & Residencial</div>
                        <div className="lp-trust-item">✅ Paisajismo Tropical & Rooftops</div>
                    </div>
                </div>
                <div className="lp-hero-visual">
                    <div className="lp-hero-card"><div className="lp-card-icon">🏢</div><div className="lp-card-label">Sectores</div><div className="lp-card-value">Corp & Lujo</div></div>
                    <div className="lp-hero-card lp-card-2"><div className="lp-card-icon">🪑</div><div className="lp-card-label">Fit-Out</div><div className="lp-card-value">A Medida</div></div>
                    <div className="lp-hero-card lp-card-3"><div className="lp-card-icon">🖥️</div><div className="lp-card-label">Tecnología</div><div className="lp-card-value">BIM 5D</div></div>
                </div>
            </div>
        </section>
    );
}

const SERVICES = [
    {
        icon: '🏢',
        title: 'Diseño Arquitectónico Residencial & Comercial',
        desc: 'Villas de lujo en Santa María y Buenaventura, torres residenciales, naves logísticas y complejos retail de gran escala adaptados a la normativa panameña.',
        features: [
            'Protección solar pasiva y segundas pieles bioclimáticas',
            'Grandes luces para bodegas comerciales y naves logísticas',
            'Integración de normativas de zonificación y accesibilidad',
            'Renders fotorrealistas Twinmotion y recorridos virtuales 3D'
        ]
    },
    {
        icon: '🪑',
        title: 'Diseño de Interiores & Fit-Out Corporativo',
        desc: 'Transformamos espacios de trabajo y residencias de alto perfil. Diseño de áreas colaborativas, lobbys de acceso, cocinas de autor y despiece paramétrico de mobiliario.',
        features: [
            'Despiece milimétrico en Revit de carpintería y acabados',
            'Iluminación escenográfica con cálculo de luxes',
            'Acústica y climatización integrada sin ductos visibles',
            'Selección y especificación de mobiliario de importación'
        ]
    },
    {
        icon: '🌿',
        title: 'Paisajismo Urbano & Terrazas Biofílicas',
        desc: 'Diseño paisajístico adaptado al clima tropical de Panamá. Pieles vegetales, azoteas verdes transitables (rooftops), piscinas sin fin y microclimas de sombra.',
        features: [
            'Especies tropicales de alto impacto visual y bajo mantenimiento',
            'Sistemas de riego eficiente y captación pluvial',
            'Terrazas y áreas sociales exteriores protegidas del calor',
            'Diseño de iluminación paisajística nocturna'
        ]
    },
    {
        icon: '🖥️',
        title: 'Implementación BIM Management & Clash Detection',
        desc: 'Liderado por el Arq. Guillermo Salomón (Esp. BIM Management). Coordinación espacial 3D de Arquitectura, Estructura y Redes MEP (HVAC, HDS, Eléctricas y RCI).',
        features: [
            'Detección anticipada de choques interdisciplinarios',
            'Presupuesto 5D con cubicaciones precisas de materiales',
            'Planos de taller y coordinación para contratistas',
            'Gemelo digital (Digital Twin) para operación y mantenimiento'
        ]
    }
];

function ServicesSection() {
    return (
        <section className="lp-services" id="servicios">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Propuesta de Valor en Panamá</span>
                    <h2 className="lp-section-title">Ingeniería y Diseño Integral para Desarrollos de Alto Nivel</h2>
                    <p className="lp-section-desc">Aportamos una visión multidisciplinaria que eleva la rentabilidad de desarrolladores y la experiencia de usuarios finales.</p>
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
                    <span className="lp-section-tag">Diseño Holístico</span>
                    <h2 className="lp-section-title">Interiores, Paisajismo y Arquitectura en Perfecta Armonía</h2>
                    <p className="lp-section-desc">En el mercado corporativo y residencial de Panamá, cada metro cuadrado debe ofrecer distinción estética y eficiencia operacional:</p>
                </div>
                <div className="lp-process-grid">
                    <div className="lp-process-step">
                        <div className="lp-step-number">01</div>
                        <h3>Volumetría Eficiente</h3>
                        <p>Aprovechamiento máximo del coeficiente de edificabilidad con fachadas inteligentes que reducen el gasto en aire acondicionado.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">02</div>
                        <h3>Experiencia Interior</h3>
                        <p>Espacios fluidos donde el mobiliario, los revestimientos y la iluminación responden a la identidad de marca o estilo de vida del cliente.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">03</div>
                        <h3>Oasis Tropical</h3>
                        <p>Zonas exteriores vivas que refrescan el entorno urbano y valorizan las áreas de descanso y convivencia.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">04</div>
                        <h3>Control BIM Total</h3>
                        <p>Centralización de toda la información en modelos Revit para que inversionistas y gerentes de proyecto tomen decisiones con datos reales.</p>
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
                    <span className="lp-section-tag">Metodología BIM 5D</span>
                    <h2 className="lp-section-title">¿Por Qué Implementar BIM Management en Panamá?</h2>
                    <p className="lp-section-desc">Panamá maneja proyectos de alta inversión donde un error en obra cuesta cientos de miles de dólares. BIM resuelve los dolores críticos:</p>
                </div>
                <div className="lp-services-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">⚡</div>
                        <h3>Cero Choques MEP vs Estructura</h3>
                        <p>Resolvemos interferencias de ductos de HVAC, bandejas eléctricas y pluviales antes del vaciado de losas.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">📊</div>
                        <h3>Presupuestos y Cubicaciones 5D</h3>
                        <p>Extracción instantánea de metros lineales, kilos de acero y volúmenes de concreto sin márgenes de error manual.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🤝</div>
                        <h3>Coordinación de Subcontratistas</h3>
                        <p>Un solo modelo federado en la nube que alinea a diseñadores, calculistas y constructores en tiempo real.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🏆</div>
                        <h3>Entrega As-Built Impecable</h3>
                        <p>Modelos finales listos para la administración de activos de fondos de inversión y family offices.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ContactSection() {
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', servicio: 'bim_management_panama', ubicacion: 'Ciudad de Panamá / Costa del Este', mensaje: '' });
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
            fuente: 'Landing Internacional Panamá (Arquitectura, Interiores & BIM)'
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
                        <span className="lp-section-tag">Panamá Developments</span>
                        <h2 className="lp-section-title" style={{ textAlign: 'left' }}>Agenda Tu Reunión Técnica</h2>
                        <p>Cuéntanos los requerimientos de tu desarrollo comercial o residencial en Panamá. Nuestro equipo de arquitectura y coordinación BIM responderá en menos de 24 horas.</p>
                        <div className="lp-contact-details">
                            <div className="lp-contact-item"><span>📍</span><div><strong>Cobertura</strong><p>Ciudad de Panamá, Costa del Este, Santa María, Punta Pacífica, Buenaventura y Panamá Pacífico</p></div></div>
                            <div className="lp-contact-item"><span>📱</span><div><strong>Línea WhatsApp</strong><p>+57 315 271 7932</p></div></div>
                            <div className="lp-contact-item"><span>✉️</span><div><strong>Email</strong><p>consultoria@kalarti.com</p></div></div>
                        </div>
                    </div>
                    <div className="lp-form-wrapper">
                        {!submitted ? (
                            <form className="lp-lead-form" onSubmit={handleSubmit}>
                                <h3>Cotizar Proyecto o Consultoría BIM</h3>
                                <div className="lp-form-row">
                                    <div className="lp-form-group">
                                        <label htmlFor="nombre">Nombre Completo *</label>
                                        <input type="text" id="nombre" name="nombre" required placeholder="Tu nombre o empresa" value={formData.nombre} onChange={handleChange} />
                                    </div>
                                    <div className="lp-form-group">
                                        <label htmlFor="telefono">WhatsApp / Teléfono *</label>
                                        <input type="tel" id="telefono" name="telefono" required placeholder="+507 0000-0000" value={formData.telefono} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="email">Correo Electrónico *</label>
                                    <input type="email" id="email" name="email" required placeholder="tu@empresa.com" value={formData.email} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="servicio">Servicio de Interés *</label>
                                    <select id="servicio" name="servicio" required value={formData.servicio} onChange={handleChange}>
                                        <option value="bim_management_panama">Implementación BIM Management & Coordinación 5D</option>
                                        <option value="diseno_arquitectonico_residencial">Diseño Arquitectónico Residencial de Lujo</option>
                                        <option value="fitout_interiores_corporativo">Diseño de Interiores & Fit-Out Corporativo</option>
                                        <option value="bodegas_logistica_retail">Diseño de Bodegas Comerciales / Retail</option>
                                        <option value="paisajismo_rooftops">Paisajismo Tropical & Terrazas Biofílicas</option>
                                    </select>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="ubicacion">Zona o Sector en Panamá</label>
                                    <input type="text" id="ubicacion" name="ubicacion" placeholder="Costa del Este, Santa María, San Francisco..." value={formData.ubicacion} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="mensaje">Detalles del Proyecto</label>
                                    <textarea id="mensaje" name="mensaje" rows="3" placeholder="Área aproximada en m², tipo de edificación o requerimientos BIM..." value={formData.mensaje} onChange={handleChange} />
                                </div>
                                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-full" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Solicitar Propuesta Técnica ➔'}
                                </button>
                                <p className="lp-form-disclaimer">Información confidencial para inversionistas y desarrolladores.</p>
                            </form>
                        ) : (
                            <div className="lp-form-success">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3>¡Solicitud Enviada!</h3>
                                <p>Un especialista en proyectos para Panamá se pondrá en contacto contigo por WhatsApp en breve.</p>
                                <a href="https://wa.me/573152717932" className="lp-btn lp-btn-whatsapp" target="_blank" rel="noopener">
                                    Abrir WhatsApp Directo
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
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Panamá • Architectural Design, Interiors, Landscape & BIM Management</p>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Servicios Panamá</h4>
                        <a href="#servicios">Diseño Arquitectónico</a>
                        <a href="#servicios">Diseño de Interiores</a>
                        <a href="#servicios">Paisajismo Urbano</a>
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
                    <p>© 2026 KALARTI Constructores y Consultores S.A.S. Proyectos Panamá.</p>
                </div>
            </div>
        </footer>
    );
}

export default function LandingPanama() {
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
            <a href="https://wa.me/573152717932?text=Hola%2C%20me%20interesa%20consultar%20dise%C3%B1o%20arquitect%C3%B3nico%20y%20BIM%20en%20Panam%C3%A1"
               className="lp-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </>
    );
}
