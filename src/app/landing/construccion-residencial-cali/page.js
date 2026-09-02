'use client';

/**
 * Landing: Cali & Valle del Cauca — Casas Campestres, BIM & Vulnerabilidad Sísmica
 * Route: /landing/construccion-residencial-cali
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
                    <span className="lp-logo-tagline">Cali & Valle del Cauca</span>
                </a>
                <div className={`lp-nav-links ${mobileOpen ? 'lp-nav-links--open' : ''}`}>
                    <a href="#vulnerabilidad" onClick={() => setMobileOpen(false)}>Evaluación Sísmica</a>
                    <a href="#servicios" onClick={() => setMobileOpen(false)}>Casas Campestres & BIM</a>
                    <a href="#proceso" onClick={() => setMobileOpen(false)}>Metodología</a>
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
                        Valle del Cauca — Cali, Buga, Jamundí & Rozo
                    </div>
                    <h1 className="lp-hero-title">
                        Casas Campestres, <span className="lp-gradient-text">Vulnerabilidad Sísmica</span> & BIM en el Valle
                    </h1>
                    <p className="lp-hero-subtitle">
                        Protege tu inversión tras los recientes sismos en el Valle del Cauca. Evaluaciones técnicas de vulnerabilidad estructural, patología y diseño de residencias campestres de lujo coordinadas en BIM Revit (Caso Buga House 230 m²).
                    </p>
                    <div className="lp-hero-actions">
                        <a href="#contacto" className="lp-btn lp-btn-primary lp-btn-lg">
                            🔍 Solicitar Evaluación / Cotización
                        </a>
                        <a href="https://wa.me/573152717932?text=Hola%2C%20solicito%20asesor%C3%ADa%20en%20Cali%20y%20Valle%20del%20Cauca%20para%20vulnerabilidad%20s%C3%ADsmica%20o%20dise%C3%B1o%20campestre"
                           className="lp-btn lp-btn-whatsapp lp-btn-lg" target="_blank" rel="noopener">
                            📱 WhatsApp Especialista
                        </a>
                    </div>
                    <div className="lp-hero-trust">
                        <div className="lp-trust-item">✅ Peritaje Post-Sismo NSR-10</div>
                        <div className="lp-trust-item">✅ Confort Térmico Bioclimático</div>
                        <div className="lp-trust-item">✅ Coordinación BIM 5D</div>
                    </div>
                </div>
                <div className="lp-hero-visual">
                    <div className="lp-hero-card"><div className="lp-card-icon">🏡</div><div className="lp-card-label">Caso Éxito</div><div className="lp-card-value">Buga House</div></div>
                    <div className="lp-hero-card lp-card-2"><div className="lp-card-icon">⚠️</div><div className="lp-card-label">Sismo Reciente</div><div className="lp-card-value">Evaluación</div></div>
                    <div className="lp-hero-card lp-card-3"><div className="lp-card-icon">📐</div><div className="lp-card-label">Ingeniería</div><div className="lp-card-value">NSR-10</div></div>
                </div>
            </div>
        </section>
    );
}

const SERVICES = [
    {
        icon: '⚠️',
        title: 'Estudio de Vulnerabilidad Sísmica y Peritaje Post-Sismo',
        desc: 'Inspección técnica para viviendas, fincas campestres y edificios afectados por los recientes movimientos telúricos en Cali, Buga, Tuluá, Jamundí y Cartago.',
        features: [
            'Inspección de fisuras, asentamientos y desplomes',
            'Diagnóstico bajo NSR-10 Título A.10',
            'Diseño de reforzamiento estructural en concreto o acero',
            'Concepto formal de habitabilidad y seguridad'
        ]
    },
    {
        icon: '🏡',
        title: 'Diseño y Construcción de Casas Campestres Bioclimáticas',
        desc: 'Viviendas de descanso de alto estándar con ventilación cruzada, efecto termosifón y fuentes interiores para confort térmico natural en el clima cálido del Valle.',
        features: [
            'Aleros amplios y protección solar pasiva',
            'Captación de aguas pluviales con bajantes de cadena',
            'Integración con la topografía y visuales del valle',
            'Materiales nobles de bajo mantenimiento'
        ]
    },
    {
        icon: '🖥️',
        title: 'Coordinación BIM 5D en Revit (Cero Colisiones)',
        desc: 'Modelación simultánea de arquitectura, redes MEP y estructura para eliminar sobrecostos y pases imprevistos en losas antes de fundir concreto.',
        features: [
            'Detección anticipada de choques interdisciplinarios',
            'Despiece milimétrico de carpintería y cocinas',
            'Renders fotorrealistas Twinmotion y paseos 3D',
            'Presupuesto y cantidades de obra 100% exactas'
        ]
    },
    {
        icon: '📐',
        title: 'Cálculo Estructural y Licencias de Construcción',
        desc: 'Memorias de cálculo avaladas por la Ing. Sandra del Pilar Paz (Esp. Estructural) para curadurías y secretarías de planeación del Valle del Cauca.',
        features: [
            'Estructuras sismorresistentes en concreto y metal',
            'Estudios geotécnicos y cimentación en ladera',
            'Viviendas híbridas en Guadua Angustifolia (NSR-10 Tit. E)',
            'Aprobación ágil en curadurías de Cali y municipios'
        ]
    }
];

function ServicesSection() {
    return (
        <section className="lp-services" id="servicios">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Servicios Especializados</span>
                    <h2 className="lp-section-title">Ingeniería y Arquitectura de Vanguardia en el Valle</h2>
                    <p className="lp-section-desc">Protegemos tu patrimonio con diagnóstico sísmico profesional y materializamos tus proyectos residenciales sin sobrecostos.</p>
                </div>
                <div className="lp-services-grid">
                    {SERVICES.map((s, i) => (
                        <div key={i} className="lp-service-card" style={i === 0 ? { border: '2px solid #d4a843', background: '#fffdfa' } : {}}>
                            <div className="lp-service-icon">{s.icon}</div>
                            {i === 0 && <span style={{ background: '#d4a843', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', display: 'inline-block', marginBottom: '10px', textTransform: 'uppercase' }}>Atención Sísmica Valle</span>}
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
                    <span className="lp-section-tag">Atención Inmediata</span>
                    <h2 className="lp-section-title">Diagnóstico Sísmico para Viviendas y Fincas en el Valle</h2>
                    <p className="lp-section-desc">El Valle del Cauca es una zona de amenaza sísmica intermedia y alta. Tras los eventos telúricos recientes, un diagnóstico profesional te brinda tranquilidad jurídica y estructural:</p>
                </div>
                <div className="lp-process-grid">
                    <div className="lp-process-step">
                        <div className="lp-step-number">01</div>
                        <h3>Levantamiento de Daños</h3>
                        <p>Mapeo fotográfico y técnico de grietas en muros, vigas y columnas para clasificar si son estéticas o estructurales.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">02</div>
                        <h3>Modelación Sísmica</h3>
                        <p>Simulación del comportamiento de la edificación ante aceleraciones sísmicas según los parámetros del sismo ocurrido.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">03</div>
                        <h3>Plan de Reforzamiento</h3>
                        <p>Planteamiento de soluciones costo-eficientes: adición de platinas, muros diafragma, fibra de carbono o encamisados.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">04</div>
                        <h3>Certificación Técnica</h3>
                        <p>Entrega del informe pericial firmado por ingeniero civil especialista para aseguradoras, copropiedades o curadurías.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ProcessSection() {
    return (
        <section className="lp-process" id="proceso">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Metodología KALARTI</span>
                    <h2 className="lp-section-title">De la Idea a la Realidad en 4 Etapas</h2>
                </div>
                <div className="lp-process-grid">
                    <div className="lp-process-step">
                        <div className="lp-step-number">01</div>
                        <h3>Diagnóstico & Lote</h3>
                        <p>Evaluación topográfica del terreno, orientación solar y vientos dominantes para diseño bioclimático.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">02</div>
                        <h3>BIM 3D & Twinmotion</h3>
                        <p>Visualización fotorrealista donde recorres tu casa y ajustas acabados antes de iniciar compras.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">03</div>
                        <h3>Ingeniería & Licencia</h3>
                        <p>Cálculo estructural NSR-10, redes hidrosanitarias y radicación en Curaduría Urbana.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">04</div>
                        <h3>Construcción Segura</h3>
                        <p>Ejecución de obra con control de calidad, despieces milimétricos y supervisión experta.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ContactSection() {
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', servicio: 'vulnerabilidad_valle', ciudad: 'Cali', mensaje: '' });
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
            fuente: 'Landing Cali & Valle (Campestres y Vulnerabilidad)'
        };

        try {
            await fetch('/api/marketing/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const msg = encodeURIComponent(`Hola, soy ${formData.nombre} en ${formData.ciudad}. Me interesa: ${formData.servicio}. Tel: ${formData.telefono}. ${formData.mensaje || ''}`);
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
                        <span className="lp-section-tag">Atención en el Valle del Cauca</span>
                        <h2 className="lp-section-title" style={{ textAlign: 'left' }}>Cotiza Tu Proyecto o Evaluación</h2>
                        <p>Cuéntanos si requieres una inspección post-sismo en tu inmueble o el diseño integral de tu casa campestre en Buga, Jamundí, Dapa o Cali.</p>
                        <div className="lp-contact-details">
                            <div className="lp-contact-item"><span>📍</span><div><strong>Cobertura Regional</strong><p>Cali, Buga, Jamundí, Tuluá, Rozo, Dapa y Palmira</p></div></div>
                            <div className="lp-contact-item"><span>📱</span><div><strong>Línea Directa WhatsApp</strong><p>+57 315 271 7932</p></div></div>
                            <div className="lp-contact-item"><span>✉️</span><div><strong>Correo</strong><p>consultoria@kalarti.com</p></div></div>
                        </div>
                    </div>
                    <div className="lp-form-wrapper">
                        {!submitted ? (
                            <form className="lp-lead-form" onSubmit={handleSubmit}>
                                <h3>Solicitar Asesoría Especializada</h3>
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
                                        <option value="vulnerabilidad_valle">Estudio de Vulnerabilidad Sísmica / Daños Post-Sismo</option>
                                        <option value="casa_campestre_bioclimatica">Diseño de Casa Campestre Bioclimática</option>
                                        <option value="coordinacion_bim_revit">Coordinación BIM 5D (Revit MEP & Estructura)</option>
                                        <option value="calculo_estructural_nsr10">Cálculo Estructural NSR-10 & Licencias</option>
                                        <option value="remodelacion_residencial">Remodelación / Reforzamiento de Vivienda</option>
                                    </select>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="ciudad">Municipio o Parcelación</label>
                                    <input type="text" id="ciudad" name="ciudad" placeholder="Buga, Jamundí, Cali, Dapa, Rozo..." value={formData.ciudad} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="mensaje">Descripción del Proyecto o Estado de la Edificación</label>
                                    <textarea id="mensaje" name="mensaje" rows="3" placeholder="Área aproximada, dudas estructurales o requerimientos..." value={formData.mensaje} onChange={handleChange} />
                                </div>
                                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-full" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Solicitar Asesoría ➔'}
                                </button>
                                <p className="lp-form-disclaimer">Respuesta garantizada en menos de 24 horas por nuestro equipo técnico.</p>
                            </form>
                        ) : (
                            <div className="lp-form-success">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3>¡Solicitud Enviada!</h3>
                                <p>Un especialista se comunicará contigo vía WhatsApp a la brevedad.</p>
                                <a href="https://wa.me/573152717932" className="lp-btn lp-btn-whatsapp" target="_blank" rel="noopener">
                                    Hablar Directamente por WhatsApp
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
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Cali, Buga y Valle del Cauca — Cobertura Regional</p>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Servicios Valle</h4>
                        <a href="#vulnerabilidad">Vulnerabilidad Sísmica</a>
                        <a href="#servicios">Casas Campestres Bioclimáticas</a>
                        <a href="#servicios">Coordinación BIM 5D</a>
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
                    <p>© 2026 KALARTI Constructores y Consultores S.A.S. Cobertura Cali & Valle del Cauca.</p>
                </div>
            </div>
        </footer>
    );
}

export default function LandingCaliValle() {
    return (
        <>
            <link rel="stylesheet" href="/landing-construccion.css" />
            <Navbar />
            <HeroSection />
            <ServicesSection />
            <VulnerabilitySection />
            <ProcessSection />
            <ContactSection />
            <Footer />
            <a href="https://wa.me/573152717932?text=Hola%2C%20solicito%20asesor%C3%ADa%20en%20Cali%20y%20Valle%20del%20Cauca"
               className="lp-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </>
    );
}
