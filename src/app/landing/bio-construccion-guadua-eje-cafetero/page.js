'use client';

/**
 * Landing: Eje Cafetero & Risaralda — Bio-Construcción, Guadua & Vulnerabilidad Sísmica
 * Route: /landing/bio-construccion-guadua-eje-cafetero
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
                    <span className="lp-logo-tagline">Risaralda & Eje Cafetero</span>
                </a>
                <div className={`lp-nav-links ${mobileOpen ? 'lp-nav-links--open' : ''}`}>
                    <a href="#vulnerabilidad" onClick={() => setMobileOpen(false)}>Evaluación Sísmica</a>
                    <a href="#servicios" onClick={() => setMobileOpen(false)}>Bio-Construcción & Guadua</a>
                    <a href="#proceso" onClick={() => setMobileOpen(false)}>Proceso</a>
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
                        Risaralda, Quindío & Caldas — Cobertura Regional
                    </div>
                    <h1 className="lp-hero-title">
                        Bio-Construcción, <span className="lp-gradient-text">Vulnerabilidad Sísmica</span> & Guadua en Risaralda
                    </h1>
                    <p className="lp-hero-subtitle">
                        Seguridad estructural y arquitectura sostenible en el Eje Cafetero. Evaluaciones técnicas post-sismo, patología en fincas e inspección estructural, combinadas con diseño de glampings y viviendas sismorresistentes en Guadua Angustifolia (NSR-10 Título E).
                    </p>
                    <div className="lp-hero-actions">
                        <a href="#contacto" className="lp-btn lp-btn-primary lp-btn-lg">
                            🔍 Solicitar Inspección / Cotización
                        </a>
                        <a href="https://wa.me/573152717932?text=Hola%2C%20solicito%20asesor%C3%ADa%20en%20Risaralda%20y%20Eje%20Cafetero%20para%20vulnerabilidad%20s%C3%ADsmica%20o%20guadua"
                           className="lp-btn lp-btn-whatsapp lp-btn-lg" target="_blank" rel="noopener">
                            📱 WhatsApp Especialista
                        </a>
                    </div>
                    <div className="lp-hero-trust">
                        <div className="lp-trust-item">✅ Peritaje Post-Sismo Risaralda</div>
                        <div className="lp-trust-item">✅ Guadua NSR-10 Título E</div>
                        <div className="lp-trust-item">✅ Glampings & Eco-Turismo</div>
                    </div>
                </div>
                <div className="lp-hero-visual">
                    <div className="lp-hero-card"><div className="lp-card-icon">🎋</div><div className="lp-card-label">Acero Vegetal</div><div className="lp-card-value">Guadua</div></div>
                    <div className="lp-hero-card lp-card-2"><div className="lp-card-icon">⚠️</div><div className="lp-card-label">Sismos Recientes</div><div className="lp-card-value">Evaluación</div></div>
                    <div className="lp-hero-card lp-card-3"><div className="lp-card-icon">🏡</div><div className="lp-card-label">Turismo</div><div className="lp-card-value">Glamping</div></div>
                </div>
            </div>
        </section>
    );
}

const SERVICES = [
    {
        icon: '⚠️',
        title: 'Estudio de Vulnerabilidad Sísmica y Daños Post-Sismo en Risaralda',
        desc: 'Inspección urgente para viviendas urbanas, fincas cafeteras y hoteles campestres afectados por los recientes temblores en Pereira, Dosquebradas, Santa Rosa y municipios vecinos.',
        features: [
            'Inspección de fisuras en mampostería, concreto y bahareque',
            'Dictamen técnico de seguridad y estabilidad estructural',
            'Propuesta de reforzamiento estructural conforme a NSR-10',
            'Certificación para compañías de seguros y administraciones'
        ]
    },
    {
        icon: '🎋',
        title: 'Estructuras Sismorresistentes en Guadua Angustifolia',
        desc: 'Construcción con el "acero vegetal" colombiano. Material elástico ideal para zonas sísmicas, debidamente inmunizado con sales de boro para durar más de 50 años.',
        features: [
            'Cumplimiento de la norma NSR-10 Título E',
            'Uniones empernadas con inyección de mortero de alta resistencia',
            'Columnas compuestas y entrepisos aligerados',
            'Cero riesgo de pandeo mediante diseño de diafragmas'
        ]
    },
    {
        icon: '🏕️',
        title: 'Diseño y Construcción de Glampings A-Frame & Eco-Resorts',
        desc: 'Alojamientos turísticos de alta rentabilidad con arquitectura icónica en Guadua y madera tratada. Diseño bioclimático integrado al paisaje cafetero.',
        features: [
            'Modelación 3D fotorrealista y recorridos virtuales',
            'Estructuras A-Frame con ventanales panorámicos',
            'Presupuesto 5D con retorno de inversión estimado',
            'Diseño de cubiertas termoacústicas y techos verdes'
        ]
    },
    {
        icon: '📐',
        title: 'Cálculo Estructural y Licencias en Curaduría',
        desc: 'Memorias de cálculo avaladas por ingenieros especialistas para radicación de licencias en curadurías de Pereira, Dosquebradas, Manizales y Armenia.',
        features: [
            'Diseño estructural en concreto, metal y guadua',
            'Estudios de suelos y cimentaciones en ladera',
            'Acompañamiento en trámites de planeación y curadurías',
            'Interventoría y supervisión técnica en obra'
        ]
    }
];

function ServicesSection() {
    return (
        <section className="lp-services" id="servicios">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Especialidades en el Eje Cafetero</span>
                    <h2 className="lp-section-title">Soluciones de Ingeniería y Bio-Construcción</h2>
                    <p className="lp-section-desc">Combinamos la más avanzada ingeniería sismorresistente con la tradición y nobleza de los materiales naturales.</p>
                </div>
                <div className="lp-services-grid">
                    {SERVICES.map((s, i) => (
                        <div key={i} className="lp-service-card" style={i === 0 ? { border: '2px solid #d4a843', background: '#fffdfa' } : {}}>
                            <div className="lp-service-icon">{s.icon}</div>
                            {i === 0 && <span style={{ background: '#d4a843', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', display: 'inline-block', marginBottom: '10px', textTransform: 'uppercase' }}>Atención Sismo Risaralda</span>}
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
                    <span className="lp-section-tag">Alerta Sísmica Eje Cafetero</span>
                    <h2 className="lp-section-title">¿Tu Finca, Vivienda u Hotel Sufrió Daños por los Movimientos Telúricos?</h2>
                    <p className="lp-section-desc">Risaralda y los departamentos vecinos han sentido con fuerza los recientes eventos sísmicos. Nuestro equipo de ingenieros estructurales realiza:</p>
                </div>
                <div className="lp-process-grid">
                    <div className="lp-process-step">
                        <div className="lp-step-number">01</div>
                        <h3>Inspección en Sitio</h3>
                        <p>Evaluación minuciosa de zapatas, muros de contención, columnas y uniones de cubierta.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">02</div>
                        <h3>Diagnóstico Estructural</h3>
                        <p>Determinamos si el daño compromete la estabilidad global del inmueble o requiere intervención localizada.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">03</div>
                        <h3>Propuesta de Refuerzo</h3>
                        <p>Diseño de soluciones técnicas: reforzamiento con pórticos de acero, fibra de carbono o reestructuración en guadua.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">04</div>
                        <h3>Dictamen Certificado</h3>
                        <p>Concepto técnico firmado con matrícula profesional para trámites legales, bancarios o de aseguramiento.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ContactSection() {
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', servicio: 'vulnerabilidad_risaralda', ciudad: 'Pereira', mensaje: '' });
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
            fuente: 'Landing Risaralda & Eje Cafetero (Guadua y Vulnerabilidad)'
        };

        try {
            await fetch('/api/marketing/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const msg = encodeURIComponent(`Hola, soy ${formData.nombre} en ${formData.ciudad}. Requiero asesoría en: ${formData.servicio}. Tel: ${formData.telefono}. ${formData.mensaje || ''}`);
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
                        <span className="lp-section-tag">Risaralda & Eje Cafetero</span>
                        <h2 className="lp-section-title" style={{ textAlign: 'left' }}>Agenda Tu Asesoría o Peritaje</h2>
                        <p>Consulta con nuestros especialistas en bio-construcción o solicita una visita técnica de evaluación de vulnerabilidad sísmica para tu inmueble.</p>
                        <div className="lp-contact-details">
                            <div className="lp-contact-item"><span>📍</span><div><strong>Cobertura Regional</strong><p>Pereira, Dosquebradas, Santa Rosa de Cabal, Armenia y Manizales</p></div></div>
                            <div className="lp-contact-item"><span>📱</span><div><strong>WhatsApp Especialista</strong><p>+57 315 271 7932</p></div></div>
                            <div className="lp-contact-item"><span>✉️</span><div><strong>Correo</strong><p>consultoria@kalarti.com</p></div></div>
                        </div>
                    </div>
                    <div className="lp-form-wrapper">
                        {!submitted ? (
                            <form className="lp-lead-form" onSubmit={handleSubmit}>
                                <h3>Solicitar Asesoría o Inspección</h3>
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
                                    <label htmlFor="servicio">Servicio Requerido *</label>
                                    <select id="servicio" name="servicio" required value={formData.servicio} onChange={handleChange}>
                                        <option value="vulnerabilidad_risaralda">Estudio de Vulnerabilidad Sísmica / Daños Post-Sismo</option>
                                        <option value="glamping_eco_resort">Diseño y Construcción de Glamping / Eco-Resort</option>
                                        <option value="vivienda_campestre_guadua">Casa Campestre en Guadua Angustifolia</option>
                                        <option value="calculo_estructural_curaduria">Cálculo Estructural NSR-10 & Licencias</option>
                                        <option value="reforzamiento_fincas">Reforzamiento Estructural para Fincas y Viviendas</option>
                                    </select>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="ciudad">Municipio o Vereda</label>
                                    <input type="text" id="ciudad" name="ciudad" placeholder="Pereira, Dosquebradas, Santa Rosa, Salento..." value={formData.ciudad} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="mensaje">Descripción de la Solicitud o Estado del Inmueble</label>
                                    <textarea id="mensaje" name="mensaje" rows="3" placeholder="Tipo de proyecto, si presenta fisuras tras el sismo, área estimada..." value={formData.mensaje} onChange={handleChange} />
                                </div>
                                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-full" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Solicitar Asesoría en Risaralda ➔'}
                                </button>
                                <p className="lp-form-disclaimer">Respuesta garantizada en menos de 24 horas por nuestro equipo técnico.</p>
                            </form>
                        ) : (
                            <div className="lp-form-success">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3>¡Solicitud Enviada!</h3>
                                <p>Un especialista se pondrá en contacto contigo por WhatsApp en breve.</p>
                                <a href="https://wa.me/573152717932" className="lp-btn lp-btn-whatsapp" target="_blank" rel="noopener">
                                    Contactar por WhatsApp
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
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Risaralda, Quindío y Caldas — Eje Cafetero</p>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Servicios Eje Cafetero</h4>
                        <a href="#vulnerabilidad">Vulnerabilidad Sísmica</a>
                        <a href="#servicios">Bio-Construcción en Guadua</a>
                        <a href="#servicios">Glampings & Eco-Resorts</a>
                        <a href="#servicios">Cálculo Estructural NSR-10</a>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Contacto</h4>
                        <a href="https://wa.me/573152717932">+57 315 271 7932</a>
                        <a href="mailto:consultoria@kalarti.com">consultoria@kalarti.com</a>
                        <a href="https://kalarti.com" target="_blank" rel="noopener">www.kalarti.com</a>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    <p>© 2026 KALARTI Constructores y Consultores S.A.S. Cobertura Risaralda & Eje Cafetero.</p>
                </div>
            </div>
        </footer>
    );
}

export default function LandingEjeCafetero() {
    return (
        <>
            <link rel="stylesheet" href="/landing-construccion.css" />
            <Navbar />
            <HeroSection />
            <ServicesSection />
            <VulnerabilitySection />
            <ContactSection />
            <Footer />
            <a href="https://wa.me/573152717932?text=Hola%2C%20solicito%20asesor%C3%ADa%20en%20Risaralda%20y%20Eje%20Cafetero"
               className="lp-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </>
    );
}
