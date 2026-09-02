'use client';

/**
 * Landing: Pasto & Nariño — Consultoría, Diseño Estructural y Vulnerabilidad Sísmica
 * Route: /landing/diseno-estructural-pasto-narino
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
                    <span className="lp-logo-tagline">Sede Pasto & Nariño</span>
                </a>
                <div className={`lp-nav-links ${mobileOpen ? 'lp-nav-links--open' : ''}`}>
                    <a href="#servicios" onClick={() => setMobileOpen(false)}>Servicios</a>
                    <a href="#vulnerabilidad" onClick={() => setMobileOpen(false)}>Vulnerabilidad Sísmica</a>
                    <a href="#equipo" onClick={() => setMobileOpen(false)}>Especialistas</a>
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
                        Sede Pasto — Ed. Antonella Of. 401
                    </div>
                    <h1 className="lp-hero-title">
                        Cálculo Estructural, <span className="lp-gradient-text">Vulnerabilidad Sísmica</span> & BIM en Pasto
                    </h1>
                    <p className="lp-hero-subtitle">
                        Zona de amenaza sísmica alta. Evaluaciones post-sismo, dictámenes técnicos, patología estructural y memorias de cálculo avaladas bajo norma NSR-10 por la <strong>Ing. Sandra Paz (Esp. Estructural)</strong> y coordinación BIM por el <strong>Arq. Guillermo Salomón</strong>.
                    </p>
                    <div className="lp-hero-actions">
                        <a href="#contacto" className="lp-btn lp-btn-primary lp-btn-lg">
                            🔍 Solicitar Evaluación Sísmica
                        </a>
                        <a href="https://wa.me/573152717932?text=Hola%2C%20solicito%20asesor%C3%ADa%20para%20estudio%20estructural%20o%20vulnerabilidad%20s%C3%ADsmica%20en%20Pasto"
                           className="lp-btn lp-btn-whatsapp lp-btn-lg" target="_blank" rel="noopener">
                            📱 WhatsApp Especialista
                        </a>
                    </div>
                    <div className="lp-hero-trust">
                        <div className="lp-trust-item">✅ Esp. Estructural NSR-10</div>
                        <div className="lp-trust-item">✅ Dictámenes Post-Sismo</div>
                        <div className="lp-trust-item">✅ Curadurías 1 y 2 de Pasto</div>
                    </div>
                </div>
                <div className="lp-hero-visual">
                    <div className="lp-hero-card"><div className="lp-card-icon">🏢</div><div className="lp-card-label">Sede Local</div><div className="lp-card-value">Pasto</div></div>
                    <div className="lp-hero-card lp-card-2"><div className="lp-card-icon">⚡</div><div className="lp-card-label">Amenaza Sísmica</div><div className="lp-card-value">Alta</div></div>
                    <div className="lp-hero-card lp-card-3"><div className="lp-card-icon">📐</div><div className="lp-card-label">Metodología</div><div className="lp-card-value">BIM 5D</div></div>
                </div>
            </div>
        </section>
    );
}

const SERVICES = [
    {
        icon: '⚠️',
        title: 'Estudio de Vulnerabilidad Sísmica y Evaluación Post-Sismo',
        desc: 'Inspección técnica de edificaciones afectadas por sismos recientes. Diagnóstico de patología estructural, agrietamientos, desplomes y dictámenes técnicos para habitabilidad segura.',
        features: [
            'Inspección in situ de grietas, vigas y columnas',
            'Evaluación bajo NSR-10 Título A.10',
            'Propuesta de reforzamiento estructural y rehabilitación',
            'Dictamen técnico para copropiedades y aseguradoras'
        ]
    },
    {
        icon: '📐',
        title: 'Cálculo Estructural y Licencias (Curadurías)',
        desc: 'Memorias de cálculo completas y planos estructurales en concreto reforzado, estructura metálica y cimentaciones especiales avalados por la Ing. Sandra del Pilar Paz.',
        features: [
            'Radicación y aprobación en Curadurías Urbanas',
            'Modelación en ETABS, SAP2000 y CYPECAD',
            'Diseño de cimentaciones en suelos volcánicos de Nariño',
            'Revisión independiente y peritajes estructurales'
        ]
    },
    {
        icon: '🖥️',
        title: 'Coordinación BIM 5D & Diseño Arquitectónico',
        desc: 'Diseño arquitectónico de residencias de lujo, comercio y remodelaciones coordinadas en Autodesk Revit por el Arq. Guillermo Salomón (Esp. BIM Management).',
        features: [
            'Modelado interdisciplinar Arq + Estructura + MEP',
            'Detección temprana de colisiones (Clash Detection)',
            'Renders fotorrealistas en Twinmotion y recorridos 3D',
            'Despiece milimétrico de carpintería y acabados'
        ]
    },
    {
        icon: '🌿',
        title: 'Bio-Construcción y Estructuras en Guadua',
        desc: 'Diseño y cálculo de viviendas campestres, glampings y cubiertas en Guadua Angustifolia Kunth bajo el Título E de la NSR-10.',
        features: [
            'Viviendas híbridas (ladrillo a la vista + guadua interior)',
            'Inmunización certificada con sales de boro',
            'Ensayos de uniones y columnas compuestas',
            'Confort térmico andino y sostenibilidad'
        ]
    },
    {
        icon: '💧',
        title: 'Redes Hidrosanitarias (HDS) & Contra Incendio (RCI)',
        desc: 'Diseño integral de acueducto, alcantarillado, redes de rociadores y bombas contra incendio por la Ing. Ana Cristina Garcés.',
        features: [
            'Cumplimiento de norma técnica y Empopasto',
            'Sistemas de bombeo y tanques de reserva',
            'Redes RCI bajo normativa NFPA 13 y 14',
            'Modelado MEP en Revit sin interferencias'
        ]
    },
    {
        icon: '📋',
        title: 'Consultoría, Auditoría e Interventoría de Obras',
        desc: 'Supervisión técnica independiente, interventoría de obras públicas y privadas, estudios ambientales y gestión contractual.',
        features: [
            'Supervisión técnica continua en obra',
            'Control de calidad de concretos y aceros',
            'Planes de Manejo Ambiental y Saneamiento',
            'Contratación estatal y alianzas público-privadas'
        ]
    }
];

function ServicesSection() {
    return (
        <section className="lp-services" id="servicios">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Nuestros Servicios en Nariño</span>
                    <h2 className="lp-section-title">Ingeniería Estructural, Consultoría & Arquitectura</h2>
                    <p className="lp-section-desc">Cubrimos desde la inspección de seguridad sísmica y el cálculo estructural hasta la entrega de obras con metodología BIM.</p>
                </div>
                <div className="lp-services-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
                    {SERVICES.map((s, i) => (
                        <div key={i} className="lp-service-card" style={i === 0 ? { border: '2px solid #d4a843', background: '#fffdfa' } : {}}>
                            <div className="lp-service-icon">{s.icon}</div>
                            {i === 0 && <span style={{ background: '#d4a843', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', display: 'inline-block', marginBottom: '10px', textTransform: 'uppercase' }}>Servicio Prioritario Post-Sismo</span>}
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

function VulnerabilityHighlight() {
    return (
        <section className="lp-process" id="vulnerabilidad" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Protocolo de Seguridad</span>
                    <h2 className="lp-section-title">¿Tu Edificación Presenta Fisuras o Daños tras los Sismos Recientes?</h2>
                    <p className="lp-section-desc">Pasto y los municipios del departamento de Nariño se localizan en una de las regiones de más alta sismicidad en Colombia. Conoce el protocolo de atención inmediata que realizamos:</p>
                </div>
                <div className="lp-process-grid">
                    <div className="lp-process-step">
                        <div className="lp-step-number">01</div>
                        <h3>Visita de Inspección</h3>
                        <p>Ingenieros estructurales examinan elementos portantes (columnas, vigas, muros de carga y losas) para descartar riesgo de colapso.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">02</div>
                        <h3>Dictamen Técnico</h3>
                        <p>Emitimos concepto formal sobre la seguridad y habitabilidad de la edificación para copropiedades, empresas o viviendas particulares.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">03</div>
                        <h3>Diseño de Reforzamiento</h3>
                        <p>Calculamos la solución óptima: encamisado de columnas, fibra de carbono (CFRP), adición de muros estructurales o arriostramientos.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">04</div>
                        <h3>Trámite & Ejecución</h3>
                        <p>Aprobación de licencia de reforzamiento en Curaduría Urbana y supervisión técnica durante la intervención de obra.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function StatsSection() {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    const [counts, setCounts] = useState([0, 0, 0, 0]);
    const targets = [150, 12, 100, 99];
    const labels = ['Proyectos en Nariño', 'Años de Trayectoria', '% Cumplimiento NSR-10', '% Satisfacción en Obra'];

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
        }, { threshold: 0.3 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!visible) return;
        const duration = 1500;
        const steps = 60;
        let step = 0;
        const timer = setInterval(() => {
            step++;
            setCounts(targets.map(t => Math.min(Math.round((step / steps) * t), t)));
            if (step >= steps) clearInterval(timer);
        }, duration / steps);
        return () => clearInterval(timer);
    }, [visible]);

    return (
        <section className="lp-stats" ref={ref}>
            <div className="lp-container">
                <div className="lp-stats-grid">
                    {counts.map((c, i) => (
                        <div key={i} className="lp-stat-item">
                            <div className="lp-stat-number">{c}{i === 2 || i === 3 ? '%' : '+'}</div>
                            <div className="lp-stat-label">{labels[i]}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const TEAM = [
    { initials: 'SPJ', name: 'Ing. Sandra del Pilar Paz Jojoa', role: 'Gerente de Construcción', spec: 'Esp. Estructural (Cálculo Sísmico NSR-10)' },
    { initials: 'GS', name: 'Arq. Guillermo J. Salomón Solarte', role: 'Coordinador BIM', spec: 'Esp. BIM Management & Bio-Construcción' },
    { initials: 'JAP', name: 'Ing. Jaime Andrés Paz Jojoa', role: 'CEO KALARTI', spec: 'Esp. Vías, Interventoría & Contratación' },
    { initials: 'ACG', name: 'Ing. Ana Cristina Garcés', role: 'Directora de Proyectos', spec: 'Ing. Civil — Redes Hidrosanitarias & RCI' },
];

function TeamSection() {
    return (
        <section className="lp-team" id="equipo">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Equipo Directivo & Consultor</span>
                    <h2 className="lp-section-title">Especialistas al Frente de Tu Proyecto</h2>
                    <p className="lp-section-desc">Un equipo multidisciplinario con sede en Pasto que respalda cada cálculo y decisión técnica.</p>
                </div>
                <div className="lp-team-grid">
                    {TEAM.map((t, i) => (
                        <div key={i} className="lp-team-card">
                            <div className="lp-team-avatar">{t.initials}</div>
                            <h4>{t.name}</h4>
                            <p className="lp-team-role">{t.role}</p>
                            <p className="lp-team-spec">{t.spec}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ContactSection() {
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', servicio: 'vulnerabilidad_sismica', ciudad: 'Pasto', mensaje: '' });
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
            fuente: 'Landing Pasto & Nariño (Vulnerabilidad y Cálculo)'
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
                        <span className="lp-section-tag">Sede Pasto & Nariño</span>
                        <h2 className="lp-section-title" style={{ textAlign: 'left' }}>Agenda Tu Evaluación Técnica</h2>
                        <p>Comunícate directamente con nuestros ingenieros y arquitectos en Pasto. Recibe respuesta y cotización en menos de 24 horas.</p>
                        <div className="lp-contact-details">
                            <div className="lp-contact-item"><span>📍</span><div><strong>Oficina Central</strong><p>Cra 28a No 17-15 Ed. Antonella Of. 401 — Pasto, Nariño</p></div></div>
                            <div className="lp-contact-item"><span>📞</span><div><strong>Teléfono Fijo / Celular</strong><p>+57 317 772 5056 / +57 315 271 7932</p></div></div>
                            <div className="lp-contact-item"><span>✉️</span><div><strong>Email Oficial</strong><p>consultoria@kalarti.com</p></div></div>
                        </div>
                    </div>
                    <div className="lp-form-wrapper">
                        {!submitted ? (
                            <form className="lp-lead-form" onSubmit={handleSubmit}>
                                <h3>Solicitar Asesoría o Dictamen</h3>
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
                                        <option value="vulnerabilidad_sismica">Estudio de Vulnerabilidad Sísmica / Post-Sismo</option>
                                        <option value="calculo_estructural_nsr10">Cálculo Estructural NSR-10 (Curadurías)</option>
                                        <option value="reforzamiento_estructural">Reforzamiento Estructural y Patología</option>
                                        <option value="diseno_arquitectonico_bim">Diseño Arquitectónico & Coordinación BIM</option>
                                        <option value="bio_construccion_guadua">Bio-Construcción en Guadua</option>
                                        <option value="redes_hidrosanitarias">Redes Hidrosanitarias & RCI</option>
                                        <option value="interventoria_consultoria">Interventoría / Consultoría de Obra</option>
                                    </select>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="ciudad">Municipio / Sector</label>
                                    <input type="text" id="ciudad" name="ciudad" placeholder="Pasto, Ipiales, Túquerres, Catambuco..." value={formData.ciudad} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="mensaje">Detalles del Proyecto o Daños Observados</label>
                                    <textarea id="mensaje" name="mensaje" rows="3" placeholder="Describe brevemente el inmueble, si presenta fisuras, número de pisos..." value={formData.mensaje} onChange={handleChange} />
                                </div>
                                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-full" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Solicitar Evaluación Técnica'}
                                </button>
                                <p className="lp-form-disclaimer">Información protegida. Te contactaremos con confidencialidad profesional.</p>
                            </form>
                        ) : (
                            <div className="lp-form-success">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3>¡Solicitud Recibida!</h3>
                                <p>Un especialista estructural de nuestra sede en Pasto te contactará en breve.</p>
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
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Cra 28a No 17-15 Ed. Antonella Of. 401 — Pasto, Nariño</p>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Servicios Nariño</h4>
                        <a href="#vulnerabilidad">Vulnerabilidad Sísmica</a>
                        <a href="#servicios">Cálculo Estructural NSR-10</a>
                        <a href="#servicios">Coordinación BIM 5D</a>
                        <a href="#servicios">Bio-Construcción en Guadua</a>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Contacto</h4>
                        <a href="tel:+573177725056">+57 317 772 5056</a>
                        <a href="https://wa.me/573152717932">+57 315 271 7932</a>
                        <a href="mailto:consultoria@kalarti.com">consultoria@kalarti.com</a>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    <p>© 2026 KALARTI Constructores y Consultores S.A.S. Sede Pasto & Nariño.</p>
                </div>
            </div>
        </footer>
    );
}

export default function LandingPastoNarino() {
    return (
        <>
            <link rel="stylesheet" href="/landing-construccion.css" />
            <Navbar />
            <HeroSection />
            <ServicesSection />
            <VulnerabilityHighlight />
            <StatsSection />
            <TeamSection />
            <ContactSection />
            <Footer />
            <a href="https://wa.me/573152717932?text=Hola%2C%20solicito%20asesor%C3%ADa%20para%20estudio%20estructural%20o%20vulnerabilidad%20en%20Pasto"
               className="lp-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </>
    );
}
