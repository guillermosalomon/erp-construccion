'use client';

/**
 * Landing: Bogotá & Sabana — Cálculo Estructural, Curadurías & Vulnerabilidad Sísmica
 * Route: /landing/calculo-estructural-bogota
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
                    <span className="lp-logo-tagline">Bogotá & Sabana</span>
                </a>
                <div className={`lp-nav-links ${mobileOpen ? 'lp-nav-links--open' : ''}`}>
                    <a href="#servicios" onClick={() => setMobileOpen(false)}>Cálculo NSR-10</a>
                    <a href="#vulnerabilidad" onClick={() => setMobileOpen(false)}>Vulnerabilidad Sísmica</a>
                    <a href="#proceso" onClick={() => setMobileOpen(false)}>Curadurías</a>
                    <a href="#contacto" className="lp-nav-cta" onClick={() => setMobileOpen(false)}>Cotizar Estudio</a>
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
                        Bogotá, Chía, Cajicá & La Sabana
                    </div>
                    <h1 className="lp-hero-title">
                        Cálculo Estructural NSR-10, <span className="lp-gradient-text">Curadurías</span> & Vulnerabilidad en Bogotá
                    </h1>
                    <p className="lp-hero-subtitle">
                        Memorias de cálculo avaladas por la <strong>Ing. Sandra del Pilar Paz (Esp. Estructural)</strong> para licencias de construcción en Curadurías Urbanas de Bogotá y municipios de la Sabana. Estudios de vulnerabilidad sísmica y reforzamiento estructural.
                    </p>
                    <div className="lp-hero-actions">
                        <a href="#contacto" className="lp-btn lp-btn-primary lp-btn-lg">
                            📐 Cotizar Cálculo Estructural
                        </a>
                        <a href="https://wa.me/573152717932?text=Hola%2C%20solicito%20cotizaci%C3%B3n%20para%20c%C3%A1lculo%20estructural%20o%20vulnerabilidad%20en%20Bogot%C3%A1"
                           className="lp-btn lp-btn-whatsapp lp-btn-lg" target="_blank" rel="noopener">
                            📱 WhatsApp Especialista
                        </a>
                    </div>
                    <div className="lp-hero-trust">
                        <div className="lp-trust-item">✅ Memorias Aprobadas en Curadurías</div>
                        <div className="lp-trust-item">✅ Cumplimiento Estricto NSR-10</div>
                        <div className="lp-trust-item">✅ Coordinación BIM en Revit</div>
                    </div>
                </div>
                <div className="lp-hero-visual">
                    <div className="lp-hero-card"><div className="lp-card-icon">🏛️</div><div className="lp-card-label">Curadurías</div><div className="lp-card-value">1 a 5</div></div>
                    <div className="lp-hero-card lp-card-2"><div className="lp-card-icon">📐</div><div className="lp-card-label">Norma Sísmica</div><div className="lp-card-value">NSR-10</div></div>
                    <div className="lp-hero-card lp-card-3"><div className="lp-card-icon">🏢</div><div className="lp-card-label">Cobertura</div><div className="lp-card-value">Sabana</div></div>
                </div>
            </div>
        </section>
    );
}

const SERVICES = [
    {
        icon: '📐',
        title: 'Cálculo y Modelación Estructural NSR-10',
        desc: 'Diseño estructural sismorresistente para edificaciones residenciales, comerciales e industriales en Bogotá, Chía, Cajicá, Cota y Sopó.',
        features: [
            'Modelación tridimensional en ETABS, SAP2000 y CYPE',
            'Planos estructurales con despiece detallado de acero',
            'Diseño de cimentaciones en suelos blandos de la Sabana',
            'Aval técnico para radicación en Curadurías Urbanas'
        ]
    },
    {
        icon: '⚠️',
        title: 'Estudio de Vulnerabilidad Sísmica y Reforzamiento',
        desc: 'Diagnóstico técnico del estado estructural de edificaciones existentes bajo NSR-10 Título A.10. Evaluación de patología y diseño de reforzamiento.',
        features: [
            'Inspección in situ de grietas y patología estructural',
            'Evaluación de capacidad sismorresistente',
            'Diseño de reforzamiento con fibra de carbono (CFRP) o acero',
            'Dictamen para copropiedades, aseguradoras y trámites'
        ]
    },
    {
        icon: '🖥️',
        title: 'Coordinación BIM 5D en Revit (Cero Interferencias)',
        desc: 'Integración simultánea del modelo estructural con redes hidrosanitarias, eléctricas y ventilación para evitar colisiones en obra.',
        features: [
            'Detección de interferencias interdisciplinares (Clash Detection)',
            'Pases de losa y vigas 100% coordinados antes de fundir',
            'Cuantificación exacta de materiales y presupuesto',
            'Entrega de gemelo digital para control de obra'
        ]
    },
    {
        icon: '📑',
        title: 'Peritajes y Trámites de Licencia en Curadurías',
        desc: 'Acompañamiento integral ante curadores urbanos para licencias de obra nueva, ampliaciones, adecuaciones y modificaciones.',
        features: [
            'Revisión de requisitos de norma urbana y sismo-resistencia',
            'Respuesta a actas de observaciones técnicas',
            'Peritajes técnicos y levantamientos estructurales',
            'Agilidad en tiempos de radicación y aprobación'
        ]
    }
];

function ServicesSection() {
    return (
        <section className="lp-services" id="servicios">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Servicios Bogotá & Sabana</span>
                    <h2 className="lp-section-title">Ingeniería Estructural Confiable y Avalada</h2>
                    <p className="lp-section-desc">Garantizamos proyectos estructuralmente seguros, normativamente viables y aprobados sin contratiempos.</p>
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

function VulnerabilitySection() {
    return (
        <section className="lp-process" id="vulnerabilidad" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Evaluación Estructural</span>
                    <h2 className="lp-section-title">¿Tu Edificación Requiere Estudio de Vulnerabilidad Sísmica?</h2>
                    <p className="lp-section-desc">En Bogotá y la Sabana, muchas edificaciones construidas antes de normas recientes o con modificaciones requieren certificar su seguridad sísmica:</p>
                </div>
                <div className="lp-process-grid">
                    <div className="lp-process-step">
                        <div className="lp-step-number">01</div>
                        <h3>Levantamiento Estructural</h3>
                        <p>Geometría de la estructura existente, espesores de muros y localización de elementos portantes.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">02</div>
                        <h3>Ensayos de Materiales</h3>
                        <p>Extracción de núcleos de concreto, esclerometría y detección electromagnética de aceros (ferroscan).</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">03</div>
                        <h3>Modelación Matemática</h3>
                        <p>Análisis lineal y no lineal bajo el espectro de aceleración sísmica de la microzonificación de Bogotá.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">04</div>
                        <h3>Concepto & Reforzamiento</h3>
                        <p>Planos y especificaciones de reforzamiento listos para ejecución y aprobación en Curaduría Urbana.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ContactSection() {
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', servicio: 'calculo_estructural', ciudad: 'Bogotá', mensaje: '' });
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
            fuente: 'Landing Bogotá (Cálculo y Vulnerabilidad)'
        };

        try {
            await fetch('/api/marketing/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const msg = encodeURIComponent(`Hola, soy ${formData.nombre} en ${formData.ciudad}. Requiero cotización para: ${formData.servicio}. Tel: ${formData.telefono}. ${formData.mensaje || ''}`);
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
                        <span className="lp-section-tag">Bogotá & Sabana</span>
                        <h2 className="lp-section-title" style={{ textAlign: 'left' }}>Cotiza Tu Estudio Estructural</h2>
                        <p>Envíanos los datos preliminares de tu proyecto y recibe cotización técnica en menos de 24 horas por nuestro equipo de ingenieros.</p>
                        <div className="lp-contact-details">
                            <div className="lp-contact-item"><span>📍</span><div><strong>Cobertura</strong><p>Bogotá (Todas las localidades), Chía, Cajicá, Cota, Sopó, Tabio y La Calera</p></div></div>
                            <div className="lp-contact-item"><span>📱</span><div><strong>Línea WhatsApp</strong><p>+57 315 271 7932</p></div></div>
                            <div className="lp-contact-item"><span>✉️</span><div><strong>Correo</strong><p>consultoria@kalarti.com</p></div></div>
                        </div>
                    </div>
                    <div className="lp-form-wrapper">
                        {!submitted ? (
                            <form className="lp-lead-form" onSubmit={handleSubmit}>
                                <h3>Solicitar Cotización de Cálculo</h3>
                                <div className="lp-form-row">
                                    <div className="lp-form-group">
                                        <label htmlFor="nombre">Nombre Completo *</label>
                                        <input type="text" id="nombre" name="nombre" required placeholder="Tu nombre" value={formData.nombre} onChange={handleChange} />
                                    </div>
                                    <div className="lp-form-group">
                                        <label htmlFor="telefono">WhatsApp / Teléfono *</label>
                                        <input type="tel" id="telefono" name="telefono" required placeholder="+57 300 123 4567" value={formData.telefono} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="email">Correo Electrónico</label>
                                    <input type="email" id="email" name="email" placeholder="tu@email.com" value={formData.email} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="servicio">Servicio de Interés *</label>
                                    <select id="servicio" name="servicio" required value={formData.servicio} onChange={handleChange}>
                                        <option value="calculo_estructural">Cálculo Estructural NSR-10 (Curaduría)</option>
                                        <option value="vulnerabilidad_sismica_bogota">Estudio de Vulnerabilidad Sísmica / Reforzamiento</option>
                                        <option value="coordinacion_bim_revit">Coordinación BIM 5D (Revit MEP & Estructura)</option>
                                        <option value="peritaje_estructural">Peritaje Técnico / Revisión Independiente</option>
                                    </select>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="ciudad">Ubicación (Localidad o Municipio)</label>
                                    <input type="text" id="ciudad" name="ciudad" placeholder="Usaquén, Suba, Chía, Cajicá..." value={formData.ciudad} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="mensaje">Detalles del Inmueble o Proyecto</label>
                                    <textarea id="mensaje" name="mensaje" rows="3" placeholder="Área aproximada en m², número de pisos, uso (vivienda/comercio)..." value={formData.mensaje} onChange={handleChange} />
                                </div>
                                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-full" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Cotizar Cálculo en Bogotá ➔'}
                                </button>
                                <p className="lp-form-disclaimer">Información tratada con confidencialidad profesional.</p>
                            </form>
                        ) : (
                            <div className="lp-form-success">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3>¡Solicitud Recibida!</h3>
                                <p>Un ingeniero especialista se comunicará contigo vía WhatsApp en breve.</p>
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
                        <p>Constructores y Consultores S.A.S.</p>
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Bogotá D.C. & Sabana de Bogotá</p>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Servicios Bogotá</h4>
                        <a href="#servicios">Cálculo Estructural NSR-10</a>
                        <a href="#vulnerabilidad">Vulnerabilidad Sísmica</a>
                        <a href="#servicios">Coordinación BIM 5D</a>
                        <a href="#proceso">Trámites en Curadurías</a>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Contacto</h4>
                        <a href="https://wa.me/573152717932">+57 315 271 7932</a>
                        <a href="mailto:consultoria@kalarti.com">consultoria@kalarti.com</a>
                        <a href="https://kalarti.com" target="_blank" rel="noopener">www.kalarti.com</a>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    <p>© 2026 KALARTI Constructores y Consultores S.A.S. Cobertura Bogotá & Sabana.</p>
                </div>
            </div>
        </footer>
    );
}

export default function LandingBogota() {
    return (
        <>
            <link rel="stylesheet" href="/landing-construccion.css" />
            <Navbar />
            <HeroSection />
            <ServicesSection />
            <VulnerabilitySection />
            <ContactSection />
            <Footer />
            <a href="https://wa.me/573152717932?text=Hola%2C%20solicito%20asesor%C3%ADa%20en%20Bogot%C3%A1%20para%20c%C3%A1lculo%20estructural"
               className="lp-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </>
    );
}
