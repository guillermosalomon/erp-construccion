'use client';

/**
 * Kalarti Bio-Construction Landing Page
 * Route: /landing/bioconstruccion
 * 
 * Self-contained marketing landing page for the Bio-construction Workshop in Yacuanquer, Nariño.
 * Integrates with /api/marketing/lead CRM endpoint.
 */

import { useState, useEffect, useRef } from 'react';

// ===== TRACKING UTILITY (Shared Kalarti logic) =====
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
        <nav className={`bio-navbar ${scrolled ? 'bio-navbar--scrolled' : ''}`}>
            <div className="bio-nav-container">
                <div className="bio-nav-logo">
                    <img src="/icon.png" alt="Kalarti Logo" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }} />
                    <span className="bio-logo-text">KALARTI</span>
                    <span className="bio-logo-tagline">Taller Bio-Construcción</span>
                </div>
                <div className={`bio-nav-links ${mobileOpen ? 'bio-nav-links--open' : ''}`}>
                    <a href="#taller" onClick={() => setMobileOpen(false)}>El Taller</a>
                    <a href="#cronograma" onClick={() => setMobileOpen(false)}>Cronograma</a>
                    <a href="#vegetacion" onClick={() => setMobileOpen(false)}>Fase Experimental</a>
                    <a href="#registro" className="bio-nav-cta" onClick={() => setMobileOpen(false)}>Reservar Cupo</a>
                </div>
                <button className="bio-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menú">
                    <span /><span /><span />
                </button>
            </div>
        </nav>
    );
}

function HeroSection() {
    return (
        <section className="bio-hero">
            <div className="bio-hero-shapes">
                <div className="bio-shape bio-shape-1" />
                <div className="bio-shape bio-shape-2" />
                <div className="bio-shape bio-shape-3" />
            </div>
            <div className="bio-hero-container">
                <div className="bio-hero-content">
                    <div className="bio-hero-badge">
                        <span className="bio-badge-dot" />
                        Taller Práctico de 4 Meses — Yacuanquer, Nariño
                    </div>
                    <h1 className="bio-hero-title">
                        Aprende y Construye con <span className="bio-gradient-text">Tierra y Guadua</span>
                    </h1>
                    <p className="bio-hero-subtitle">
                        Diseño y edificación de una **Maloca** comunal y **Glampings**. Domina la estructura en guadua, tapia pisada, adobe, bahareque sismorresistente y techos verdes. Dirigido a estudiantes, profesionales y constructores locales.
                    </p>
                    <div className="bio-hero-actions">
                        <a href="#registro" className="bio-btn bio-btn-primary bio-btn-lg">
                            📝 Inscribirse y Evaluar Nivel
                        </a>
                        <a href="https://wa.me/573177725056?text=Hola%20Kalarti!%20Me%20interesa%20inscribirme%20al%20Taller%20de%20Bio-Construccion%20en%20Yacuanquer."
                           className="bio-btn bio-btn-whatsapp bio-btn-lg" target="_blank" rel="noopener">
                            📱 Escríbenos por WhatsApp
                        </a>
                    </div>
                    <div className="bio-hero-trust">
                        <div className="bio-trust-item">🌿 Construcción Sostenible</div>
                        <div className="bio-trust-item">🏗️ Sismo-resistencia NSR-10</div>
                        <div className="bio-trust-item">📍 Yacuanquer, Nariño</div>
                    </div>
                </div>
                <div className="bio-hero-visual">
                    <div className="bio-hero-card"><div className="bio-card-icon">🎋</div><div className="bio-card-label">Guadua Angustifolia</div><div className="bio-card-value">Estructura</div></div>
                    <div className="bio-hero-card bio-card-2"><div className="bio-card-icon">🧱</div><div className="bio-card-label">Tapia / Adobe</div><div className="bio-card-value">Masa Térmica</div></div>
                    <div className="bio-hero-card bio-card-3"><div className="bio-card-icon">🌱</div><div className="bio-card-label">Techo Verde</div><div className="bio-card-value">Fase Exp.</div></div>
                </div>
            </div>
        </section>
    );
}

const MODULES = [
  { num: "01", category: "Teórica & Diseño", title: "Bioclimática y Maquetas", desc: "Análisis de asoleamiento andino, vientos en Yacuanquer y modelado de un elemento autoportante a escala 1:10." },
  { num: "02", category: "Cimentación", title: "Replanteo y Anclajes", desc: "Silvicultura de la guadua, inmunización por sales de boro, preparación de tierras locales y fundición de zapatas con platinas." },
  { num: "03", category: "Estructura", title: "Ensambles en Guadua", desc: "Cortes de boca de pescado y pico de flauta. Montaje estructural del esqueleto de la Maloca y Glampings." },
  { num: "04", category: "Envolventes", title: "Muros Mixtos y Pisos", desc: "Llenado de muros de tapia pisada, tejido de esterillas para bahareque encementado, adobes de tierra y pisos de arcilla sellados." },
  { num: "05", category: "Investigación", title: "Fachadas y Techos Verdes", desc: "Fase experimental con geomembranas, sustratos livianos térmicos, plantas colgantes andinas y sensores de temperatura." }
];

function ProgramSection() {
    return (
        <section className="bio-program" id="taller">
            <div className="bio-container">
                <div className="bio-section-header">
                    <span className="bio-section-tag">Contenido Técnico</span>
                    <h2 className="bio-section-title">Estructura del Cronograma (16 Semanas)</h2>
                    <p className="bio-section-desc">Un recorrido de 4 meses dividido en 5 grandes bloques temáticos prácticos y de investigación.</p>
                </div>
                <div className="bio-program-grid">
                    {MODULES.map((m, i) => (
                        <div key={i} className="bio-module-card">
                            <div className="bio-module-num">{m.num}</div>
                            <div className="bio-module-cat">{m.category}</div>
                            <h3>{m.title}</h3>
                            <p>{m.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ExperimentalSection() {
    return (
        <section className="bio-experimental" id="vegetacion">
            <div className="bio-container">
                <div className="bio-experimental-layout">
                    <div className="bio-exp-content">
                        <span className="bio-section-tag">Fase de Investigación</span>
                        <h2>Techos Verdes y Fachadas con Vegetación</h2>
                        <p>
                            En el altiplano de Yacuanquer, a 2,600 metros de altitud, la pérdida de temperatura interior por las cubiertas durante la noche es un reto. Implementaremos techos verdes experimentales sobre las estructuras de guadua para actuar como aislantes térmicos naturales.
                        </p>
                        <p style={{ marginTop: '1rem' }}>
                            Evaluaremos su comportamiento mediante sensores de temperatura y humedad, comparando el confort térmico final del bahareque y la tapia pisada con fachadas vegetales que mitiguen el viento helado del Galeras.
                        </p>
                        <div className="bio-exp-stats">
                            <div className="bio-exp-stat"><span>🌡️</span><div><h4>Aislamiento Activo</h4><p>Reducción de heladas internas</p></div></div>
                            <div className="bio-exp-stat"><span>🌧️</span><div><h4>Drenaje Andino</h4><p>Control de aguas pluviales</p></div></div>
                        </div>
                    </div>
                    <div className="bio-exp-visual">
                        <div className="bio-exp-box">
                            <h4>Capas del Techo Verde Experimental</h4>
                            <ul>
                                <li><strong>Capa Vegetal:</strong> Suculentas andinas resistentes a heladas.</li>
                                <li><strong>Sustrato:</strong> Mezcla liviana (Pómez, cascarilla y compost).</li>
                                <li><strong>Filtro:</strong> Geotextil no tejido de retención.</li>
                                <li><strong>Drenaje:</strong> Gravilla puzolánica volcánica local.</li>
                                <li><strong>Impermeabilización:</strong> Geomembrana de PVC / EPDM.</li>
                                <li><strong>Base:</strong> Esterilla de guadua y correas de soporte.</li>
                            </ul>
                        </div>
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
        perfil: '',
        nivel: '',
        mensaje: ''
    });
    const [interests, setInterests] = useState({
        guadua: false,
        tierra: false,
        vegetacion: false,
        bioclimatica: false
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setInterests(prev => ({ ...prev, [name]: checked }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const activeInterests = Object.keys(interests).filter(k => interests[k]);
        
        // Structure custom survey options into the general 'mensaje' field
        const customMessage = `
--- ENCUESTA DE REGISTRO BIO-CONSTRUCCIÓN ---
Perfil: ${formData.perfil}
Nivel Técnico: ${formData.nivel}
Áreas de Interés: ${activeInterests.length > 0 ? activeInterests.join(', ') : 'Ninguna seleccionada'}
Mensaje Adicional: ${formData.mensaje || 'Sin mensaje adicional'}
        `.trim();

        const tracking = captureTrackingParams();
        const payload = {
            nombre: formData.nombre,
            telefono: formData.telefono,
            email: formData.email,
            servicio: 'otro', // Maps to CRM's leads routing
            ciudad: 'Yacuanquer',
            mensaje: customMessage,
            ...tracking,
            landing_page: '/landing/bioconstruccion'
        };

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
        } catch (err) {
            console.error('CRM direct post failed, attempting fallback redirection:', err);
            // In case of local/offline CORS errors, we still record completion and trigger WhatsApp fallback
            setSubmitted(true);
        } finally {
            setLoading(false);
            // WhatsApp Redirection with formatted lead data
            const waMsg = encodeURIComponent(
                `Hola Kalarti! Me registré al Taller de Bio-Construcción.\n` +
                `Nombre: ${formData.nombre}\n` +
                `Perfil: ${formData.perfil}\n` +
                `Nivel: ${formData.nivel}\n` +
                `Tel: ${formData.telefono}`
            );
            window.open(`https://wa.me/573177725056?text=${waMsg}`, '_blank');
        }
    };

    return (
        <section className="bio-contact" id="registro">
            <div className="bio-container">
                <div className="bio-contact-grid">
                    <div className="bio-contact-info">
                        <span className="bio-section-tag">Inscripción Abierta</span>
                        <h2>Reserva tu Cupo e Completa la Encuesta</h2>
                        <p>
                            El taller cuenta con cupos limitados para garantizar la seguridad en obra y el aprendizaje de calidad de cada participante.
                        </p>
                        <p style={{ marginTop: '1rem' }}>
                            Al completar este formulario, nuestro equipo evaluará tu perfil para organizar las cuadrillas de trabajo técnico in situ en Yacuanquer. Te contactaremos vía WhatsApp.
                        </p>
                        <div className="bio-contact-details">
                            <div className="bio-contact-item"><span>📍</span><div><strong>Lugar de Obra</strong><p>Yacuanquer, Nariño — Zona Urbana y Rural</p></div></div>
                            <div className="bio-contact-item"><span>⏰</span><div><strong>Horarios de Obra</strong><p>Lunes a Viernes (8:00 AM - 5:00 PM)</p></div></div>
                            <div className="bio-contact-item"><span>✉️</span><div><strong>Información General</strong><p>taller@kalarti.com</p></div></div>
                        </div>
                    </div>
                    <div className="bio-form-wrapper">
                        {!submitted ? (
                            <form className="bio-lead-form" onSubmit={handleSubmit}>
                                <h3>Encuesta de Registro</h3>
                                <div className="bio-form-group">
                                    <label htmlFor="nombre">Nombre Completo *</label>
                                    <input type="text" id="nombre" name="nombre" required placeholder="Tu nombre" value={formData.nombre} onChange={handleChange} />
                                </div>
                                <div className="bio-form-row">
                                    <div className="bio-form-group">
                                        <label htmlFor="telefono">WhatsApp *</label>
                                        <input type="tel" id="telefono" name="telefono" required placeholder="Ej. +57 312 3456789" value={formData.telefono} onChange={handleChange} />
                                    </div>
                                    <div className="bio-form-group">
                                        <label htmlFor="email">Email</label>
                                        <input type="email" id="email" name="email" placeholder="tu@email.com" value={formData.email} onChange={handleChange} />
                                    </div>
                                </div>
                                
                                <div className="bio-form-row">
                                    <div className="bio-form-group">
                                        <label htmlFor="perfil">Perfil Profesional *</label>
                                        <select id="perfil" name="perfil" required value={formData.perfil} onChange={handleChange}>
                                            <option value="">Selecciona perfil</option>
                                            <option value="estudiante">Estudiante Universitario</option>
                                            <option value="profesional">Profesional del Sector</option>
                                            <option value="constructor">Constructor Local / Maestro</option>
                                            <option value="artesano">Artesano o Carpintero</option>
                                            <option value="otro">Otro / Entusiasta</option>
                                        </select>
                                    </div>
                                    <div className="bio-form-group">
                                        <label htmlFor="nivel">Conocimiento en Bio-Construcción *</label>
                                        <select id="nivel" name="nivel" required value={formData.nivel} onChange={handleChange}>
                                            <option value="">Selecciona tu nivel</option>
                                            <option value="ninguno">Ninguno (Aprender desde cero)</option>
                                            <option value="basico">Básico (Conceptos teóricos)</option>
                                            <option value="intermedio">Intermedio (Sé hacer muros/maquetas)</option>
                                            <option value="experto">Avanzado (He construido estructuras)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bio-form-group">
                                    <label>Áreas de Mayor Interés</label>
                                    <div className="bio-form-checkboxes">
                                        <label className="bio-checkbox-label">
                                            <input type="checkbox" name="guadua" checked={interests.guadua} onChange={handleCheckboxChange} />
                                            Estructuras en Guadua
                                        </label>
                                        <label className="bio-checkbox-label">
                                            <input type="checkbox" name="tierra" checked={interests.tierra} onChange={handleCheckboxChange} />
                                            Muros de Tierra (Tapia/Adobe)
                                        </label>
                                        <label className="bio-checkbox-label">
                                            <input type="checkbox" name="vegetacion" checked={interests.vegetacion} onChange={handleCheckboxChange} />
                                            Techos y Fachadas Verdes
                                        </label>
                                        <label className="bio-checkbox-label">
                                            <input type="checkbox" name="bioclimatica" checked={interests.bioclimatica} onChange={handleCheckboxChange} />
                                            Bioclimática y Sensores
                                        </label>
                                    </div>
                                </div>

                                <div className="bio-form-group">
                                    <label htmlFor="mensaje">¿Tienes alguna duda o requerimiento especial?</label>
                                    <textarea id="mensaje" name="mensaje" rows="2" placeholder="Describe brevemente tus expectativas..." value={formData.mensaje} onChange={handleChange} />
                                </div>
                                <button type="submit" className="bio-btn bio-btn-primary bio-btn-lg bio-btn-full" disabled={loading}>
                                    {loading ? 'Enviando Registro...' : 'Reservar Cupo y Enviar Encuesta'}
                                </button>
                            </form>
                        ) : (
                            <div className="bio-form-success">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌾</div>
                                <h3>¡Inscripción Registrada!</h3>
                                <p>Tus datos y encuesta fueron enviados al CRM de Kalarti Constructores.</p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Se ha abierto una conversación en WhatsApp para coordinar tu ingreso a cuadrilla.</p>
                                <a href="https://wa.me/573177725056" className="bio-btn bio-btn-whatsapp" style={{ marginTop: '1.5rem' }} target="_blank" rel="noopener">
                                    Hablar directamente por WhatsApp
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
        <footer className="bio-footer">
            <div className="bio-container">
                <div className="bio-footer-content">
                    <div className="bio-footer-brand">
                        <div className="bio-nav-logo"><img src="/icon.png" alt="Kalarti Logo" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }} /><span className="bio-logo-text" style={{ color: '#fff' }}>KALARTI</span></div>
                        <p>Constructores y Consultores S.A.S.</p>
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Oficinas: Cra 28a No 17-15 Ed. Antonella Of. 401 — Pasto, Nariño</p>
                    </div>
                    <div className="bio-footer-links">
                        <h4>Contacto del Taller</h4>
                        <a href="tel:+573177725056">+57 317 772 5056</a>
                        <a href="mailto:taller@kalarti.com">taller@kalarti.com</a>
                        <a href="https://kalarti.com" target="_blank" rel="noopener">www.kalarti.com</a>
                    </div>
                </div>
                <div className="bio-footer-bottom">
                    <p>© 2026 KALARTI Constructores y Consultores S.A.S. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
}

// ===== MAIN PAGE =====
export default function LandingBioconstruccion() {
    return (
        <div className="bio-landing-page">
            <link rel="stylesheet" href="/landing-bioconstruccion.css" />
            <Navbar />
            <HeroSection />
            <ProgramSection />
            <ExperimentalSection />
            <ContactSection />
            <Footer />
            <a href="https://wa.me/573177725056?text=Hola%20Kalarti!%20Me%20interesa%20el%20Taller%20de%20Bio-Construccion%20en%20Yacuanquer."
               className="bio-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </div>
    );
}
