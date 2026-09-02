'use client';

/**
 * Landing Internacional: Costa Rica — Luxury Architecture, Interior Design, Landscape & BIM Management
 * Route: /landing/diseno-arquitectonico-costa-rica
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
                    <span className="lp-logo-tagline">Costa Rica Architecture & BIM</span>
                </a>
                <div className={`lp-nav-links ${mobileOpen ? 'lp-nav-links--open' : ''}`}>
                    <a href="#servicios" onClick={() => setMobileOpen(false)}>Servicios</a>
                    <a href="#pilares" onClick={() => setMobileOpen(false)}>Interiores & Paisajismo</a>
                    <a href="#bim" onClick={() => setMobileOpen(false)}>BIM Management</a>
                    <a href="#contacto" className="lp-nav-cta" onClick={() => setMobileOpen(false)}>Consultar Proyecto</a>
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
                        Costa Rica — Guanacaste, Nosara, Papagayo & Santa Teresa
                    </div>
                    <h1 className="lp-hero-title">
                        Diseño Arquitectónico, <span className="lp-gradient-text">Interiores, Paisajismo</span> & BIM en Costa Rica
                    </h1>
                    <p className="lp-hero-subtitle">
                        Creamos villas de lujo y eco-resorts que fusionan arquitectura biofílica, interiorismo de autor, paisajismo tropical integrado y gestión <strong>BIM Management en Revit</strong>. Control milimétrico de costos y coordinación interdisciplinar remota para inversionistas y desarrolladores en Costa Rica.
                    </p>
                    <div className="lp-hero-actions">
                        <a href="#contacto" className="lp-btn lp-btn-primary lp-btn-lg">
                            🌿 Iniciar Consulta de Proyecto
                        </a>
                        <a href="https://wa.me/573152717932?text=Hello%2C%20I%20am%20interested%20in%20architectural%20design%2C%20interiors%20or%20BIM%20services%20for%20Costa%20Rica"
                           className="lp-btn lp-btn-whatsapp lp-btn-lg" target="_blank" rel="noopener">
                            📱 WhatsApp Consultor Internacional
                        </a>
                    </div>
                    <div className="lp-hero-trust">
                        <div className="lp-trust-item">✅ Coordinación BIM 5D Revit</div>
                        <div className="lp-trust-item">✅ Interiorismo & Mobiliario a Medida</div>
                        <div className="lp-trust-item">✅ Paisajismo Biofílico Tropical</div>
                    </div>
                </div>
                <div className="lp-hero-visual">
                    <div className="lp-hero-card"><div className="lp-card-icon">🌴</div><div className="lp-card-label">Filosofía</div><div className="lp-card-value">Biofílica</div></div>
                    <div className="lp-hero-card lp-card-2"><div className="lp-card-icon">🪑</div><div className="lp-card-label">Interiorismo</div><div className="lp-card-value">A Medida</div></div>
                    <div className="lp-hero-card lp-card-3"><div className="lp-card-icon">🖥️</div><div className="lp-card-label">Tecnología</div><div className="lp-card-value">BIM 5D</div></div>
                </div>
            </div>
        </section>
    );
}

const SERVICES = [
    {
        icon: '🏡',
        title: 'Diseño Arquitectónico de Lujo & Eco-Villas',
        desc: 'Concepción integral de villas costeras, residencias en ladera y resorts boutique. Diseños orientados a capturar brisas marinas, sombras protectoras y vistas panorámicas hacia el océano y la selva.',
        features: [
            'Arquitectura bioclimática pasiva adaptada al trópico húmedo y seco',
            'Grandes luces, aleros envolventes y ventilación cruzada',
            'Estructuras híbridas en madera, bambú/guadua, acero y concreto',
            'Renders fotorrealistas Twinmotion y paseos inmersivos 3D'
        ]
    },
    {
        icon: '🪑',
        title: 'Diseño de Interiores & Acabados de Autor',
        desc: 'Interiorismo sensorial que conecta la atmósfera natural exterior con el lujo interior. Especificación milimétrica de materiales, paletas cálidas y mobiliario a medida.',
        features: [
            'Despiece paramétrico en Revit para carpintería fija y cocinas gourmet',
            'Iluminación arquitectónica escenográfica y control domótico',
            'Materiales nobles: maderas certificadas, piedra volcánica y linos',
            'Libros de acabados y fichas de compras internacionales'
        ]
    },
    {
        icon: '🌿',
        title: 'Paisajismo Integrado & Arquitectura Biofílica',
        desc: 'Diseño paisajístico que convierte el lote en una extensión viva de la casa. Piscinas infinity, terrazas escalonadas, espejos de agua y senderos ecológicos.',
        features: [
            'Selección de especies nativas de bajo requerimiento hídrico',
            'Espejos de agua para enfriamiento evaporativo pasivo',
            'Integración de taludes naturales y rocas del sitio',
            'Transición fluida «Indoor-Outdoor» sin barreras visuales'
        ]
    },
    {
        icon: '🖥️',
        title: 'BIM Management & Coordinación Interdisciplinaria',
        desc: 'Liderado por el Arq. Guillermo Salomón (Esp. BIM Management). Modelado centralizado de arquitectura, estructura e ingeniería MEP para eliminar retrasos en obra.',
        features: [
            'Detección anticipada de colisiones (Clash Detection)',
            'Planos de coordinación para contratistas en Costa Rica',
            'Presupuesto 5D preciso y control de cubicaciones',
            'Supervisión digital remota para propietarios en el extranjero'
        ]
    }
];

function ServicesSection() {
    return (
        <section className="lp-services" id="servicios">
            <div className="lp-container">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Nuestros 4 Pilares en Costa Rica</span>
                    <h2 className="lp-section-title">Arquitectura Exclusiva con Estándar Internacional</h2>
                    <p className="lp-section-desc">Resolvemos cada dimensión de tu proyecto, desde la implantación paisajística hasta el último detalle de carpintería y coordinación técnica.</p>
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
                    <span className="lp-section-tag">Sinergia de Diseño</span>
                    <h2 className="lp-section-title">¿Por Qué Integrar Arquitectura, Interiores y Paisajismo?</h2>
                    <p className="lp-section-desc">En el mercado de lujo de Costa Rica, un proyecto exitoso requiere coherencia total entre la forma del edificio, sus espacios habitables y la naturaleza circundante:</p>
                </div>
                <div className="lp-process-grid">
                    <div className="lp-process-step">
                        <div className="lp-step-number">01</div>
                        <h3>Arquitectura Sensible</h3>
                        <p>Volúmenes que respetan la topografía, minimizan el movimiento de tierras y maximizan la ventilación natural.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">02</div>
                        <h3>Interiorismo Funcional</h3>
                        <p>Mobiliario integrado, cocinas abiertas a terrazas y texturas orgánicas diseñadas al milímetro en software 3D.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">03</div>
                        <h3>Paisajismo Vivo</h3>
                        <p>Jardines tropicales que protegen de la radiación directa, aportan privacidad y reducen la temperatura ambiente.</p>
                    </div>
                    <div className="lp-process-step">
                        <div className="lp-step-number">04</div>
                        <h3>BIM Management</h3>
                        <p>Garantía de que lo diseñado se construirá sin errores en sitio, con cubicaciones exactas y cero sobrecostos.</p>
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
                    <span className="lp-section-tag">Eficiencia & Control</span>
                    <h2 className="lp-section-title">BIM Management: Construye sin Sorpresas a Distancia</h2>
                    <p className="lp-section-desc">Si vives en Estados Unidos, Europa o Canadá e inviertes en Costa Rica, la metodología BIM es tu mayor garantía de transparencia:</p>
                </div>
                <div className="lp-services-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🔍</div>
                        <h3>Gemelo Digital 3D</h3>
                        <p>Visualiza cada tubería, viga y mueble antes de autorizar pagos o contratar cuadrillas de obra.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">💰</div>
                        <h3>Presupuesto 5D Confiable</h3>
                        <p>Cantidades automáticas vinculadas al modelo que eliminan los habituales cobros extras por imprevistos.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">⚙️</div>
                        <h3>Coordinación MEP</h3>
                        <p>Integración de redes de aire acondicionado, pluviales y bombeo de piscinas sin perforar vigas.</p>
                    </div>
                    <div className="lp-service-card">
                        <div className="lp-service-icon">🌐</div>
                        <h3>Gestión Remota</h3>
                        <p>Revisiones semanales en línea mediante modelos interactivos accesibles desde tu tablet o navegador.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ContactSection() {
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', servicio: 'villa_lujo_cr', ubicacion: 'Guanacaste / Nosara', mensaje: '' });
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
            fuente: 'Landing Internacional Costa Rica (Arquitectura, Interiores & BIM)'
        };

        try {
            await fetch('/api/marketing/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const msg = encodeURIComponent(`Hello / Hola, soy ${formData.nombre}. I am interested in: ${formData.servicio} in ${formData.ubicacion}. Tel: ${formData.telefono}. ${formData.mensaje || ''}`);
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
                        <span className="lp-section-tag">Costa Rica Projects</span>
                        <h2 className="lp-section-title" style={{ textAlign: 'left' }}>Hablemos de Tu Proyecto</h2>
                        <p>Cuéntanos tu visión, la ubicación de tu lote y tus expectativas. Nuestro director de arquitectura y BIM se pondrá en contacto contigo para agendar una videollamada exploratoria.</p>
                        <div className="lp-contact-details">
                            <div className="lp-contact-item"><span>📍</span><div><strong>Zonas de Cobertura</strong><p>Guanacaste, Nosara, Papagayo, Santa Teresa, Tamarindo y Valle Central</p></div></div>
                            <div className="lp-contact-item"><span>📱</span><div><strong>WhatsApp Internacional</strong><p>+57 315 271 7932</p></div></div>
                            <div className="lp-contact-item"><span>✉️</span><div><strong>Email</strong><p>consultoria@kalarti.com</p></div></div>
                        </div>
                    </div>
                    <div className="lp-form-wrapper">
                        {!submitted ? (
                            <form className="lp-lead-form" onSubmit={handleSubmit}>
                                <h3>Solicitar Asesoría de Diseño</h3>
                                <div className="lp-form-row">
                                    <div className="lp-form-group">
                                        <label htmlFor="nombre">Nombre Completo / Full Name *</label>
                                        <input type="text" id="nombre" name="nombre" required placeholder="Your name" value={formData.nombre} onChange={handleChange} />
                                    </div>
                                    <div className="lp-form-group">
                                        <label htmlFor="telefono">WhatsApp / Phone *</label>
                                        <input type="tel" id="telefono" name="telefono" required placeholder="+1 (000) 000-0000 / +506..." value={formData.telefono} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="email">Email *</label>
                                    <input type="email" id="email" name="email" required placeholder="your@email.com" value={formData.email} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="servicio">Servicio de Interés / Main Service *</label>
                                    <select id="servicio" name="servicio" required value={formData.servicio} onChange={handleChange}>
                                        <option value="villa_lujo_cr">Diseño Arquitectónico de Villa de Lujo / Beach House</option>
                                        <option value="interiorismo_paisajismo">Diseño de Interiores & Paisajismo Integral</option>
                                        <option value="eco_resort_glamping">Boutique Eco-Resort / Glamping de Lujo</option>
                                        <option value="bim_management_revit">Implementación BIM Management & Coordinación 5D</option>
                                        <option value="paquete_completo">Paquete Integral (Arquitectura + Interiores + Paisajismo + BIM)</option>
                                    </select>
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="ubicacion">Ubicación del Lote / Location</label>
                                    <input type="text" id="ubicacion" name="ubicacion" placeholder="Nosara, Las Catalinas, Santa Teresa, Papagayo..." value={formData.ubicacion} onChange={handleChange} />
                                </div>
                                <div className="lp-form-group">
                                    <label htmlFor="mensaje">Breve Descripción / Project Details</label>
                                    <textarea id="mensaje" name="mensaje" rows="3" placeholder="Área aproximada, topografía, cronograma estimado..." value={formData.mensaje} onChange={handleChange} />
                                </div>
                                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-full" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Solicitar Asesoría de Diseño ➔'}
                                </button>
                                <p className="lp-form-disclaimer">Confidencialidad garantizada. Respondemos en menos de 24 horas.</p>
                            </form>
                        ) : (
                            <div className="lp-form-success">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3>¡Gracias por tu mensaje!</h3>
                                <p>Un arquitecto especialista en proyectos para Costa Rica se comunicará contigo vía WhatsApp.</p>
                                <a href="https://wa.me/573152717932" className="lp-btn lp-btn-whatsapp" target="_blank" rel="noopener">
                                    Iniciar Conversación por WhatsApp
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
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Costa Rica • Luxury Architecture, Interiors, Landscape & BIM Management</p>
                    </div>
                    <div className="lp-footer-links">
                        <h4>Servicios</h4>
                        <a href="#servicios">Diseño Arquitectónico</a>
                        <a href="#servicios">Diseño de Interiores</a>
                        <a href="#servicios">Paisajismo Integrado</a>
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
                    <p>© 2026 KALARTI Constructores y Consultores S.A.S. Proyectos Costa Rica.</p>
                </div>
            </div>
        </footer>
    );
}

export default function LandingCostaRica() {
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
            <a href="https://wa.me/573152717932?text=Hello%2C%20I%20am%20interested%20in%20architecture%20and%20BIM%20services%20for%20Costa%20Rica"
               className="lp-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </>
    );
}
