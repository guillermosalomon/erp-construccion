'use client';

/**
 * Landing Geo-SEO: Barranquilla & Atlántico — Plan de Manejo Ambiental (PMA) y Consultoría Ambiental
 * Route: /landing/plan-de-manejo-ambiental-barranquilla
 * Basada en el sistema de diseño premium de /landing/construccion
 */

import { useState, useEffect } from 'react';

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
                    <span className="lp-logo-tagline">Barranquilla & Atlántico</span>
                </a>
                <div className={`lp-nav-links ${mobileOpen ? 'lp-nav-links--open' : ''}`}>
                    <a href="#servicios" onClick={() => setMobileOpen(false)}>Servicios PMA</a>
                    <a href="#cumplimiento" onClick={() => setMobileOpen(false)}>Normativa EPA & CRA</a>
                    <a href="#sectores" onClick={() => setMobileOpen(false)}>Alcance Regional</a>
                    <a href="#contacto" className="lp-nav-cta" onClick={() => setMobileOpen(false)}>Cotizar PMA</a>
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
                        Barranquilla, Soledad, Malambo, Puerto Colombia, Galapa & Atlántico
                    </div>
                    <h1 className="lp-hero-title">
                        Plan de Manejo Ambiental (PMA) y <span className="lp-gradient-text">Consultoría Ambiental</span> en Barranquilla y el Atlántico
                    </h1>
                    <p className="lp-hero-subtitle">
                        Formulación, radicación, interventoría y seguimiento de <strong>Planes de Manejo Ambiental (PMA)</strong> para obras civiles, proyectos urbanísticos, parques industriales y sector portuario en el Caribe colombiano. Cumplimiento integral ante <strong>EPA Barranquilla Verde</strong>, <strong>CRA (Corporación Autónoma Regional del Atlántico)</strong> y <strong>ANLA</strong>.
                    </p>
                    <div className="lp-hero-actions">
                        <a href="#contacto" className="lp-btn lp-btn-primary lp-btn-lg">
                            🌎 Cotizar Plan de Manejo Ambiental
                        </a>
                        <a href="https://wa.me/573152717932?text=Hola%2C%20solicito%20cotizaci%C3%B3n%20para%20Plan%20de%20Manejo%20Ambiental%20(PMA)%20en%20Barranquilla%20o%20el%20Atl%C3%A1ntico"
                           className="lp-btn lp-btn-whatsapp lp-btn-lg" target="_blank" rel="noopener">
                            📱 WhatsApp Consultor Ambiental
                        </a>
                    </div>
                    <div className="lp-hero-trust">
                        <div className="lp-trust-item">✅ Normativa EPA Barranquilla Verde & CRA</div>
                        <div className="lp-trust-item">✅ Gestión RCD (Res. 0472/17 y 1257/21)</div>
                        <div className="lp-trust-item">✅ Informes ICA & Licenciamiento</div>
                    </div>
                </div>
                <div className="lp-hero-visual">
                    <div className="lp-hero-card"><div className="lp-card-icon">🌎</div><div className="lp-card-label">Instrumento</div><div className="lp-card-value">PMA & ICA</div></div>
                    <div className="lp-hero-card lp-card-2"><div className="lp-card-icon">🏛️</div><div className="lp-card-label">Autoridades</div><div className="lp-card-value">EPA / CRA</div></div>
                    <div className="lp-hero-card lp-card-3"><div className="lp-card-icon">♻️</div><div className="lp-card-label">Economía Circular</div><div className="lp-card-value">RCD 100%</div></div>
                </div>
            </div>
        </section>
    );
}

const SERVICES = [
    {
        icon: '📋',
        title: 'Formulación y Ejecución de Planes de Manejo Ambiental (PMA)',
        desc: 'Diseño técnico de programas de prevención, mitigación, corrección y compensación de impactos ambientales para proyectos constructivos, viales, industriales y logísticos en Barranquilla y el departamento del Atlántico.',
        features: [
            'Línea base ambiental (medios abiótico, biótico y socioeconómico)',
            'Matrices de evaluación de impactos ambientales (Metodología Conesa / EPM)',
            'Fichas de manejo ambiental con indicadores, costos y cronograma',
            'Planes de contingencia, gestión del riesgo y seguimiento y monitoreo'
        ]
    },
    {
        icon: '🏛️',
        title: 'Trámites y Permisos ante EPA Barranquilla Verde, CRA y ANLA',
        desc: 'Gestión integral de permisos, concesiones y autorizaciones ambientales requeridas antes y durante la ejecución de proyectos en jurisdicción urbana, metropolitana y departamental.',
        features: [
            'Permisos de aprovechamiento forestal e inventario silvicultural urbano',
            'Permisos de vertimientos a cuerpos de agua y alcantarillado',
            'Permisos de ocupación de cauces y canalización de arroyos',
            'Elaboración y radicación de Informes de Cumplimiento Ambiental (ICA)'
        ]
    },
    {
        icon: '♻️',
        title: 'Programa de Manejo Ambiental de RCD (Escombros y Demolición)',
        desc: 'Estructuración y reporte del Programa de Manejo Ambiental de Residuos de Construcción y Demolición (RCD) conforme a la Resolución 0472 de 2017 y Resolución 1257 de 2021.',
        features: [
            'Inscripción como gran o pequeño generador de RCD ante EPA / CRA',
            'Metas de aprovechamiento y economía circular en obra',
            'Trazabilidad de gestores autorizados, transporte y puntos limpios',
            'Certificaciones de disposición final para cierre ambiental de obra'
        ]
    },
    {
        icon: '💧',
        title: 'Estudios Hidrológicos de Arroyos, Drenaje Pluvial & SIG Territorial',
        desc: 'Modelación hidrológica e hidráulica y cartografía SIG bajo lineamientos IGAC y POMCA para sustentar licencias de urbanismo, obras hidráulicas y control de escorrentía en el Caribe.',
        features: [
            'Modelación hidráulica 1D/2D de arroyos y canales pluviales (HEC-RAS)',
            'Geodatabase corporativa (GDB) bajo modelo de almacenamiento ANLA',
            'Zonificación ambiental, rondas hídricas y determinantes del POT',
            'Diseño de Sistemas Urbanos de Drenaje Sostenible (SUDS)'
        ]
    }
];

function ServicesSection() {
    return (
        <section className="lp-services" id="servicios">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Portafolio Ambiental en el Atlántico</span>
                    <h2 className="lp-section-title">Ingeniería y Gestión Ambiental para Construcción e Industria</h2>
                    <p className="lp-section-desc">Garantizamos seguridad jurídica, viabilidad técnica y cero sanciones ambientales en el desarrollo de tus proyectos en Barranquilla y municipios del Atlántico.</p>
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

function ComplianceSection() {
    return (
        <section className="lp-process" id="cumplimiento" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Metodología de Trabajo</span>
                    <h2 className="lp-section-title">Ruta de Aprobación y Seguimiento de tu PMA</h2>
                    <p className="lp-section-desc">Acompañamos cada fase del proyecto desde la planeación pre-constructiva hasta el cierre y desmantelamiento ambiental:</p>
                </div>
                <div className="lp-process-grid">
                    <div className="lp-process-step">
                        <div className="lp-step-number">01</div>
                        <h3>Diagnóstico & Línea Base</h3>
                        <p>Levantamiento de información primaria y secundaria, inspección del predio, identificación de determinantes ambientales de la CRA / EPA y requerimientos del POT.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">02</div>
                        <h3>Formulación del PMA</h3>
                        <p>Evaluación matricial de impactos y estructuración de programas de manejo para suelo, aire, ruido, componente hídrico, cobertura vegetal, RCD y gestión social.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">03</div>
                        <h3>Radicación & Permisos</h3>
                        <p>Presentación técnica ante EPA Barranquilla Verde, CRA o interventoría del contrato, atendiendo requerimientos y visitas de evaluación en campo.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">04</div>
                        <h3>Ejecución & Informes ICA</h3>
                        <p>Residencia e interventoría ambiental en obra, monitoreos ambientales y entrega periódica de Informes de Cumplimiento Ambiental (ICA).</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function RegionalScopeSection() {
    return (
        <section className="lp-process" id="sectores">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Alcance Territorial en el Caribe</span>
                    <h2 className="lp-section-title">Cobertura en Barranquilla y Todo el Departamento del Atlántico</h2>
                    <p className="lp-section-desc">Atendemos los corredores de mayor dinamismo inmobiliario, portuario, logístico y de infraestructura del departamento:</p>
                </div>
                <div className="lp-services-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🏙️</div>
                        <h3>Distrito de Barranquilla</h3>
                        <p>Proyectos residenciales en altura, centros empresariales, obras de canalización de arroyos, malla vial e infraestructura urbana bajo jurisdicción de EPA Barranquilla Verde.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🏭</div>
                        <h3>Corredor Industrial (Malambo, Galapa & Soledad)</h3>
                        <p>Zonas francas, parques industriales, bodegas logísticas y plantas manufactureras con trámites de emisiones, vertimientos y PMA ante la CRA.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🌊</div>
                        <h3>Puerto Colombia & Eje Costero</h3>
                        <p>Desarrollos urbanísticos campestres, proyectos turísticos, hotelería sostenible y obras de protección costera en el litoral del Atlántico.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🚢</div>
                        <h3>Sector Portuario, Vial & Energético</h3>
                        <p>Terminales portuarias sobre el Río Magdalena, proyectos solares fotovoltaicos, subestaciones y concesiones viales departamentales y nacionales.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ContactSection() {
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        email: '',
        servicio: 'formulacion_pma_barranquilla',
        ciudad: 'Barranquilla / Atlántico',
        mensaje: ''
    });
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
            fuente: 'Landing Geo-SEO PMA Barranquilla y Atlántico'
        };

        try {
            await fetch('/api/marketing/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const msg = encodeURIComponent(`Hola, soy ${formData.nombre}. Solicito cotización para ${formData.servicio} en ${formData.ciudad}. Tel: ${formData.telefono}. ${formData.mensaje || ''}`);
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
                        <span className="lp-section-tag">Consultoría Ambiental Caribe</span>
                        <h2 className="lp-section-title" style={{ textAlign: 'left' }}>Solicita tu Propuesta Técnica de PMA</h2>
                        <p>Cuéntanos la ubicación y el alcance de tu obra o proyecto en Barranquilla o cualquier municipio del Atlántico. Recibe cotización técnica detallada en menos de 24 horas.</p>
                        <div className="lp-contact-details">
                            <div className="lp-contact-item"><span>📍</span><div><strong>Cobertura Regional</strong><p>Barranquilla, Soledad, Malambo, Puerto Colombia, Galapa, Sabanagrande, Baranoa y todo el Atlántico</p></div></div>
                            <div className="lp-contact-item"><span>📱</span><div><strong>WhatsApp Directo</strong><p>+57 315 271 7932</p></div></div>
                            <div className="lp-contact-item"><span>✉️</span><div><strong>Email Corporativo</strong><p>consultoria@kalarti.com</p></div></div>
                        </div>
                    </div>
                    <div className="lp-form-wrapper">
                        {!submitted ? (
                            <form className="lp-lead-form" onSubmit={handleSubmit}>
                                <h3>Cotizar Plan de Manejo Ambiental</h3>
                                <div className="lp-form-row">
                                    <div className="lp-form-group">
                                        <label htmlFor="nombre">Nombre o Empresa *</label>
                                        <input type="text" id="nombre" name="nombre" required placeholder="Tu nombre o constructora" value={formData.nombre} onChange={handleChange} />
                                    </div>
                                    <div className="lp-form-group">
                                        <label htmlFor="telefono">WhatsApp / Teléfono *</label>
                                        <input type="tel" id="telefono" name="telefono" required placeholder="+57 300 123 4567" value={formData.telefono} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="email">Correo Electrónico *</label>
                                    <input type="email" id="email" name="email" required placeholder="tu@empresa.com" value={formData.email} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="servicio">Requerimiento Ambiental *</label>
                                    <select id="servicio" name="servicio" required value={formData.servicio} onChange={handleChange}>
                                        <option value="formulacion_pma_barranquilla">Formulación de Plan de Manejo Ambiental (PMA)</option>
                                        <option value="programa_rcd_escombros">Programa de Manejo Ambiental de RCD (Res. 0472 / 1257)</option>
                                        <option value="permisos_epa_cra">Permisos Ambientales ante EPA Barranquilla Verde / CRA</option>
                                        <option value="informes_ica_interventoria">Informes de Cumplimiento Ambiental (ICA) / Interventoría</option>
                                        <option value="estudios_hidrologicos_arroyos">Estudio Hidrológico / Ocupación de Cauce y SIG</option>
                                    </select>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="ciudad">Municipio o Sector en el Atlántico</label>
                                    <input type="text" id="ciudad" name="ciudad" placeholder="Barranquilla, Puerto Colombia, Malambo, Galapa..." value={formData.ciudad} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="mensaje">Descripción del Proyecto</label>
                                    <textarea id="mensaje" name="mensaje" rows="3" placeholder="Tipo de obra (edificación, bodega, vía, urbanismo), área aproximada o requerimiento de la autoridad ambiental..." value={formData.mensaje} onChange={handleChange} />
                                </div>
                                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-full" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Solicitar Propuesta Técnica ➔'}
                                </button>
                                <p className="lp-form-disclaimer">Atención inmediata para constructoras, promotores e industrias en el Atlántico.</p>
                            </form>
                        ) : (
                            <div className="lp-form-success">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3>¡Solicitud Recibida!</h3>
                                <p>Nuestro equipo de consultoría ambiental se pondrá en contacto contigo en breve.</p>
                                <a href="https://wa.me/573152717932" className="lp-btn lp-btn-whatsapp" target="_blank" rel="noopener">
                                    Escribir Directamente por WhatsApp
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
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>División Ambiental & Ingeniería — Cobertura Barranquilla y Atlántico</p>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Servicios Ambientales</h4>
                        <a href="#servicios">Planes de Manejo Ambiental (PMA)</a>
                        <a href="#servicios">Trámites EPA & CRA</a>
                        <a href="#servicios">Gestión Integral de RCD</a>
                        <a href="#servicios">Hidrología & SIG Ambiental</a>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Contacto</h4>
                        <a href="tel:+573177725056">+57 317 772 5056</a>
                        <a href="https://wa.me/573152717932">+57 315 271 7932</a>
                        <a href="mailto:consultoria@kalarti.com">consultoria@kalarti.com</a>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    <p>© 2026 KALARTI Constructores y Consultores S.A.S. Consultoría Ambiental en Barranquilla y el Atlántico.</p>
                </div>
            </div>
        </footer>
    );
}

export default function LandingPMABarranquilla() {
    return (
        <>
            <link rel="stylesheet" href="/landing-construccion.css" />
            <Navbar />
            <HeroSection />
            <ServicesSection />
            <ComplianceSection />
            <RegionalScopeSection />
            <ContactSection />
            <Footer />
            <a href="https://wa.me/573152717932?text=Hola%2C%20solicito%20cotizaci%C3%B3n%20para%20Plan%20de%20Manejo%20Ambiental%20(PMA)%20en%20Barranquilla%20o%20el%20Atl%C3%A1ntico"
               className="lp-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </>
    );
}
