'use client';

/**
 * Kalarti Construction Landing Page
 * Route: /landing/construccion
 * 
 * Self-contained marketing landing page with:
 * - Hero section with CTA
 * - Services grid
 * - Stats counter animation
 * - Process steps
 * - Team section
 * - Lead capture form → /api/marketing/lead
 * - WhatsApp floating button
 * - Tracking (GCLID/MSCLKID/UTM)
 */

import { useState, useEffect, useRef } from 'react';

// ===== TRACKING UTILITY =====
function captureTrackingParams() {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const tracking = {
        gclid: params.get('gclid') || getCookie('_kalarti_gclid') || '',
        msclkid: params.get('msclkid') || getCookie('_kalarti_msclkid') || '',
        utm_source: params.get('utm_source') || getCookie('_kalarti_utm_source') || '',
        utm_medium: params.get('utm_medium') || getCookie('_kalarti_utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || getCookie('_kalarti_utm_campaign') || '',
    };
    // Persist to cookies
    Object.entries(tracking).forEach(([key, val]) => {
        if (val) setCookie(`_kalarti_${key}`, val, 90);
    });
    return tracking;
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? v.pop() : '';
}

// ===== COMPONENTS =====

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
                <div className="lp-nav-logo">
                    <div className="lp-logo-emblem">K</div>
                    <span className="lp-logo-text">KALARTI</span>
                    <span className="lp-logo-tagline">Constructores y Consultores</span>
                </div>
                <div className={`lp-nav-links ${mobileOpen ? 'lp-nav-links--open' : ''}`}>
                    <a href="#servicios" onClick={() => setMobileOpen(false)}>Servicios</a>
                    <a href="#proceso" onClick={() => setMobileOpen(false)}>Proceso</a>
                    <a href="#equipo" onClick={() => setMobileOpen(false)}>Equipo</a>
                    <a href="#contacto" className="lp-nav-cta" onClick={() => setMobileOpen(false)}>Cotizar Gratis</a>
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
                        +10 Años Construyendo Confianza
                    </div>
                    <h1 className="lp-hero-title">
                        Construimos el <span className="lp-gradient-text">Hogar de Tus Sueños</span> en Pasto y Nariño
                    </h1>
                    <p className="lp-hero-subtitle">
                        Ingenieros certificados con metodología BIM. Desde el diseño hasta la entrega de llaves,
                        con presupuestos transparentes y calidad garantizada.
                    </p>
                    <div className="lp-hero-actions">
                        <a href="#contacto" className="lp-btn lp-btn-primary lp-btn-lg">
                            💬 Solicita Tu Cotización Gratis
                        </a>
                        <a href="https://wa.me/573152717932?text=Hola%2C%20me%20interesa%20una%20cotización%20de%20construcción"
                           className="lp-btn lp-btn-whatsapp lp-btn-lg" target="_blank" rel="noopener">
                            📱 WhatsApp Directo
                        </a>
                    </div>
                    <div className="lp-hero-trust">
                        <div className="lp-trust-item">✅ Ingenieros Certificados</div>
                        <div className="lp-trust-item">✅ Metodología BIM</div>
                        <div className="lp-trust-item">✅ Presupuesto Transparente</div>
                    </div>
                </div>
                <div className="lp-hero-visual">
                    <div className="lp-hero-card"><div className="lp-card-icon">🏗️</div><div className="lp-card-label">Proyectos</div><div className="lp-card-value">+150</div></div>
                    <div className="lp-hero-card lp-card-2"><div className="lp-card-icon">⭐</div><div className="lp-card-label">Satisfacción</div><div className="lp-card-value">98%</div></div>
                    <div className="lp-hero-card lp-card-3"><div className="lp-card-icon">📐</div><div className="lp-card-label">Tecnología</div><div className="lp-card-value">BIM 5D</div></div>
                </div>
            </div>
        </section>
    );
}

const SERVICES = [
    { icon: '🏠', title: 'Construcción de Viviendas', desc: 'Casas, apartamentos y edificaciones residenciales con diseño personalizado y acabados premium.', features: ['Diseño arquitectónico a medida', 'Estructura antisísmica', 'Acabados de alta calidad'] },
    { icon: '📐', title: 'Diseño Estructural BIM', desc: 'Modelación 3D con metodología BIM para visualizar tu proyecto antes de construir.', features: ['Modelación 3D completa', 'Presupuesto integrado 5D', 'Detección de conflictos'] },
    { icon: '🏗️', title: 'Obras Civiles', desc: 'Construcción de vías, puentes, alcantarillados y obras de infraestructura pública.', features: ['Pavimentos y vías', 'Redes hidrosanitarias', 'Estructura metálica'] },
    { icon: '📋', title: 'Consultoría e Interventoría', desc: 'Supervisión, auditoría y gestión de proyectos para entidades públicas y privadas.', features: ['Interventoría de obras', 'Estudios ambientales', 'Contratación estatal'] },
];

function ServicesSection() {
    return (
        <section className="lp-services" id="servicios">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Nuestros Servicios</span>
                    <h2 className="lp-section-title">Soluciones Integrales de Construcción</h2>
                    <p className="lp-section-desc">Desde la consultoría inicial hasta la entrega de llaves, cubrimos todo el ciclo de tu proyecto.</p>
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

function StatsSection() {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    const [counts, setCounts] = useState([0, 0, 0, 0]);
    const targets = [150, 10, 6, 98];
    const labels = ['Proyectos Completados', 'Años de Experiencia', 'Ingenieros Especialistas', '% Satisfacción Clientes'];

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
                            <div className="lp-stat-number">{c}+</div>
                            <div className="lp-stat-label">{labels[i]}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const STEPS = [
    { num: '01', title: 'Consulta Inicial', desc: 'Evaluamos tus necesidades, terreno y presupuesto sin compromiso.' },
    { num: '02', title: 'Diseño BIM', desc: 'Creamos el modelo 3D de tu proyecto para que lo visualices antes de construir.' },
    { num: '03', title: 'Construcción', desc: 'Ejecutamos la obra con seguimiento en tiempo real y reportes semanales.' },
    { num: '04', title: 'Entrega', desc: 'Entrega llave en mano con garantía y documentación completa.' },
];

function ProcessSection() {
    return (
        <section className="lp-process" id="proceso">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Cómo Trabajamos</span>
                    <h2 className="lp-section-title">Tu Proyecto en 4 Pasos</h2>
                </div>
                <div className="lp-process-grid">
                    {STEPS.map((s, i) => (
                        <div key={i} className="lp-process-step">
                            <div className="lp-step-number">{s.num}</div>
                            <h3>{s.title}</h3>
                            <p>{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const TEAM = [
    { initials: 'JAP', name: 'Jaime Andrés Paz', role: 'CEO — Ingeniero Civil', spec: 'Esp. Vías, Interventoría, Contratación Estatal' },
    { initials: 'JCE', name: 'Juan Camilo Enríquez', role: 'Gerente Comercial', spec: 'M.Sc. Ingeniería Civil, Construcción' },
    { initials: 'GS', name: 'Guillermo Salomón', role: 'Coordinador BIM', spec: 'Arquitecto, Esp. BIM Management' },
    { initials: 'ACG', name: 'Ana Cristina Garces', role: 'Directora de Proyectos', spec: 'Ing. Civil — Redes Hidro Sanitarias' },
];

function TeamSection() {
    return (
        <section className="lp-team" id="equipo">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Nuestro Equipo</span>
                    <h2 className="lp-section-title">Profesionales Certificados</h2>
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
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', servicio: '', ciudad: '', mensaje: '' });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const tracking = captureTrackingParams();
        const payload = { ...formData, ...tracking, landing_page: window.location.pathname };

        try {
            const res = await fetch('/api/marketing/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setSubmitted(true);
            } else {
                throw new Error('API error');
            }
            // Fallback: open WhatsApp
            const msg = encodeURIComponent(`Hola, soy ${formData.nombre}. Me interesa ${formData.servicio}. Tel: ${formData.telefono}. ${formData.mensaje || ''}`);
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
                        <span className="lp-section-tag">Cotización Gratuita</span>
                        <h2 className="lp-section-title" style={{ textAlign: 'left' }}>¿Listo Para Tu Proyecto?</h2>
                        <p>Cuéntanos sobre tu proyecto y recibe una cotización personalizada sin compromiso. Nuestro equipo te contactará en menos de 24 horas.</p>
                        <div className="lp-contact-details">
                            <div className="lp-contact-item"><span>📍</span><div><strong>Oficina</strong><p>Cra 28a No 17-15 Ed. Antonella Of. 401 — Pasto, Nariño</p></div></div>
                            <div className="lp-contact-item"><span>📞</span><div><strong>Teléfono</strong><p>+57 317 772 5056</p></div></div>
                            <div className="lp-contact-item"><span>✉️</span><div><strong>Email</strong><p>consultoria@kalarti.com</p></div></div>
                        </div>
                    </div>
                    <div className="lp-form-wrapper">
                        {!submitted ? (
                            <form className="lp-lead-form" onSubmit={handleSubmit}>
                                <h3>Solicita Tu Cotización</h3>
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
                                        <option value="">Selecciona un servicio</option>
                                        <option value="construccion_vivienda">Construcción de Vivienda</option>
                                        <option value="remodelacion">Remodelación</option>
                                        <option value="diseno_arquitectonico">Diseño Arquitectónico</option>
                                        <option value="diseno_estructural">Diseño Estructural</option>
                                        <option value="consultoria">Consultoría / Interventoría</option>
                                        <option value="obras_civiles">Obras Civiles</option>
                                        <option value="ambiental">Estudios Ambientales</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="ciudad">Ciudad / Municipio</label>
                                    <input type="text" id="ciudad" name="ciudad" placeholder="Pasto, Ipiales, Tumaco..." value={formData.ciudad} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="mensaje">Cuéntanos sobre tu proyecto</label>
                                    <textarea id="mensaje" name="mensaje" rows="3" placeholder="Describe brevemente tu proyecto..." value={formData.mensaje} onChange={handleChange} />
                                </div>
                                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-full" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Solicitar Cotización Gratuita'}
                                </button>
                                <p className="lp-form-disclaimer">Al enviar, aceptas que te contactemos. Sin spam, sin compromisos.</p>
                            </form>
                        ) : (
                            <div className="lp-form-success">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3>¡Gracias por tu interés!</h3>
                                <p>Nuestro equipo te contactará en menos de 24 horas por WhatsApp.</p>
                                <a href="https://wa.me/573152717932" className="lp-btn lp-btn-whatsapp" target="_blank" rel="noopener">
                                    O escríbenos ahora por WhatsApp
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
                        <div className="lp-nav-logo"><div className="lp-logo-emblem">K</div><span className="lp-logo-text" style={{ color: '#fff' }}>KALARTI</span></div>
                        <p>Constructores y Consultores S.A.S.</p>
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Cra 28a No 17-15 Ed. Antonella Of. 401 — Pasto, Nariño</p>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Servicios</h4>
                        <a href="#servicios">Construcción de Viviendas</a>
                        <a href="#servicios">Diseño BIM</a>
                        <a href="#servicios">Obras Civiles</a>
                        <a href="#servicios">Consultoría</a>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Contacto</h4>
                        <a href="tel:+573177725056">+57 317 772 5056</a>
                        <a href="mailto:consultoria@kalarti.com">consultoria@kalarti.com</a>
                        <a href="https://kalarti.com" target="_blank" rel="noopener">www.kalarti.com</a>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    <p>© 2026 KALARTI Constructores y Consultores S.A.S. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
}

// ===== MAIN PAGE =====
export default function LandingConstruccion() {
    return (
        <>
            <link rel="stylesheet" href="/landing-construccion.css" />
            <Navbar />
            <HeroSection />
            <ServicesSection />
            <StatsSection />
            <ProcessSection />
            <TeamSection />
            <ContactSection />
            <Footer />
            <a href="https://wa.me/573152717932?text=Hola%2C%20vi%20su%20página%20y%20me%20interesa%20una%20cotización"
               className="lp-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </>
    );
}
