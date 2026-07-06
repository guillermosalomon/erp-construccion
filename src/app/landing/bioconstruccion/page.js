'use client';

/**
 * Kalarti Bio-Construction Landing Page
 * Route: /landing/bioconstruccion
 * 
 * Self-contained React page styled after the Canva design:
 * - Warm organic cream background (#f6f3eb)
 * - Playfair Display (Serif) typography for elegant headers
 * - Collapsible 16-week timeline with two-column split: Teoría (green bg) and Práctica (yellow bg)
 * - Loaded with generated high-quality images for Guadua, Tapia, and Techos Verdes.
 */

import { useState, useEffect } from 'react';

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

// ===== WEEKS DATA SOURCE =====
const WEEKS_DATA = [
  {
    numero: 1,
    duracion: "1 Semana (24h Teoría, 16h Práctica)",
    titulo: "Análisis del Territorio y Fundamentos Bioclimáticos",
    fase: "Fase 1: Teórica",
    categoria: "fase1",
    descripcion: "Reconocimiento y lectura del lote en Yacuanquer, Nariño. Diagnóstico bioclimático y estrategias pasivas de diseño.",
    teoria: "Lectura del lugar, asoleamiento, rosa de los vientos, topografía. Criterios de diseño pasivo para Malocas y Glampings.",
    practica: "Pruebas de campo: reconocimiento de vegetación, orientación in situ, medición de vientos.",
  },
  {
    numero: 2,
    duracion: "1 Semana (24h Teoría, 16h Práctica)",
    titulo: "Diseño Estructural, Elementos Autoportantes y Modelado a Escala",
    fase: "Fase 1: Teórica",
    categoria: "fase1",
    descripcion: "Entendimiento de las fuerzas estructurales en guadua y madera. Elaboración de maquetas estructurales.",
    teoria: "Comportamiento estructural del bambú, esfuerzos de tracción, compresión y flexión. Diseño de módulo autoportante.",
    practica: "Taller de maquetas a escala (1:20 y 1:10) con micro-bambú. Pruebas de carga.",
  },
  {
    numero: 3,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Silvicultura, Corte y Preservación de la Guadua",
    fase: "Fase 2: Materiales",
    categoria: "fase2",
    descripcion: "Selección del bambú en el rodal, técnicas de corte y inmunización química por sales de boro.",
    teoria: "Silvicultura de la guadua, madurez, épocas de corte, inmunización por inmersión y llenado vertical con sales de boro.",
    practica: "Preparación de soluciones de boro y preservación de culmos de guadua en campo.",
  },
  {
    numero: 4,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Selección y Pruebas de Suelos",
    fase: "Fase 2: Materiales",
    categoria: "fase2",
    descripcion: "Reconocimiento y clasificación de la tierra local para construir. Ensayos de campo sin laboratorio.",
    teoria: "Tipos de suelos (arcilla, limo, arena) y pruebas físicas de plasticidad, granulometría y retracción.",
    practica: "Muestreo de tierra y dosificación de mezclas óptimas para tapia, adobe y bahareque.",
  },
  {
    numero: 5,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Cimentación y Anclajes",
    fase: "Fase 2: Materiales",
    categoria: "fase2",
    descripcion: "Replantear el lote a escuadra y construir las bases sólidas para las estructuras de guadua y tierra.",
    teoria: "Interpretación de planos de cimentación, tipos de cimientos y sistemas de anclaje de columnas en guadua.",
    practica: "Replanteo y trazo a escuadra, excavación y fundición de zapatas con platinas en U.",
  },
  {
    numero: 6,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Cortes y Ensambles en Guadua",
    fase: "Fase 3: Estructura",
    categoria: "fase3",
    descripcion: "Dominio de herramientas y técnicas de corte de precisión. Fabricación de uniones estructurales.",
    teoria: "Herramientas de carpintería de bambú y tipos de uniones (boca de pescado, pico de flauta, pasadores).",
    practica: "Corte y ensamble de uniones de prueba, pre-ensamble de marcos estructurales en tierra.",
  },
  {
    numero: 7,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Montaje y Levantamiento Estructural del Glamping",
    fase: "Fase 3: Estructura",
    categoria: "fase3",
    descripcion: "Izado e instalación de la estructura principal de guadua para los glampings.",
    teoria: "Diseño de pórticos sismorresistentes en guadua y sistemas de arriostramiento tridimensional.",
    practica: "Izado, plomado y montaje de la estructura portante del primer Glamping.",
  },
  {
    numero: 8,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Montaje y Levantamiento Estructural de la Maloca",
    fase: "Fase 3: Estructura",
    categoria: "fase3",
    descripcion: "Izado de la estructura central de la Maloca, diseño de grandes luces y cerchas espaciales en guadua.",
    teoria: "Estructuras de grandes luces, anillos de compresión de techos poligonales y seguridad en altura.",
    practica: "Izado de columnas principales y montaje del anillo central de la Maloca.",
  },
  {
    numero: 9,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Estructura de Entrepisos y Cubiertas",
    fase: "Fase 3: Estructura",
    categoria: "fase3",
    descripcion: "Construcción de los pisos elevados de los glampings y preparación del soporte de la cubierta.",
    teoria: "Diseño de viguetas para entrepiso, preparación de esterilla de guadua y correas de cubierta.",
    practica: "Clavado del piso de esterilla en glamping e instalación de correas en la Maloca.",
  },
  {
    numero: 10,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Construcción con Tapia Pisada",
    fase: "Fase 4: Envolventes",
    categoria: "fase4",
    descripcion: "Construcción de muros masivos de tierra compactada para aportar inercia térmica en Yacuanquer.",
    teoria: "Construcción con tapia pisada, formaletas desmontables y juntas de construcción sismorresistente.",
    practica: "Montaje de formaleta, llenado por capas de 10 cm y apisonado de muros de tapia.",
  },
  {
    numero: 11,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Muros de Bahareque Encementado y Tradicional",
    fase: "Fase 4: Envolventes",
    categoria: "fase4",
    descripcion: "Estructura interna flexible, colocación de esterilla de guadua y aplicación de pañetes de tierra.",
    teoria: "Marcos de bahareque tradicional y encementado, latas de guadua y morteros de revoque grueso.",
    practica: "Instalación de esterilla en los glampings y aplicación de pañete de tierra con paja.",
  },
  {
    numero: 12,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Elaboración e Instalación de Adobes",
    fase: "Fase 4: Envolventes",
    categoria: "fase4",
    descripcion: "Producción artesanal de bloques de adobe y colocación de muros con mortero de tierra.",
    teoria: "Diseño de adoberas múltiples, estabilización con fibras largas y secado a la sombra.",
    practica: "Moldeo de adobes y levantamiento de muros divisorios en el Glamping con mortero de arcilla.",
  },
  {
    numero: 13,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Pisos de Tierra y Acabados de Muros",
    fase: "Fase 4: Envolventes",
    categoria: "fase4",
    descripcion: "Elaboración de pisos terminados en tierra compactada/adobe y acabados estéticos protectores de muros.",
    teoria: "Pisos de tierra estabilizada, aceites secantes (linaza), ceras y pinturas naturales a base de cal.",
    practica: "Construcción de piso de tierra en el Glamping y aplicación de pañete fino en muros.",
  },
  {
    numero: 14,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Implementación de Techos Verdes",
    fase: "Fase 5: Experimental",
    categoria: "fase5",
    descripcion: "Implementación del techo verde sobre la estructura de guadua. Selección de capas y plantas andinas.",
    teoria: "Estructura de soporte para techos verdes, cálculo de pesos saturados y capas de geomembranas.",
    practica: "Colocación de impermeabilización, drenes, sustrato y siembra de suculentas en el techo del Glamping.",
  },
  {
    numero: 15,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Implementación de Fachadas de Pared con Vegetación",
    fase: "Fase 5: Experimental",
    categoria: "fase5",
    descripcion: "Construcción de una fachada verde experimental y sistemas de riego y monitoreo.",
    teoria: "Sistemas de fachadas vegetales (fieltros, bolsillos), selección de plantas andinas y riego por gravedad.",
    practica: "Instalación del sistema de bolsillos en fachada sur de la Maloca y siembra.",
  },
  {
    numero: 16,
    duracion: "1 Semana (8h Teoría, 32h Práctica)",
    titulo: "Detalles Finales, Evaluación y Cierre",
    fase: "Fase 5: Experimental",
    categoria: "fase5",
    descripcion: "Recolección de datos bioclimáticos iniciales, terminación de acabados, entrega de proyectos y graduación.",
    teoria: "Metodologías de monitoreo bioclimático (sensores) y evaluación de confort térmico in situ.",
    practica: "Instalación de sensores en muros testigo y experimental, detalles finales y clausura.",
  }
];

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
                    <span className="bio-logo-tagline">Diplomado Bio-Construcción</span>
                </div>
                <div className={`bio-nav-links ${mobileOpen ? 'bio-nav-links--open' : ''}`}>
                    <a href="#taller" onClick={() => setMobileOpen(false)}>El Diplomado</a>
                    <a href="#cronograma" onClick={() => setMobileOpen(false)}>Cronograma</a>
                    <a href="#galeria" onClick={() => setMobileOpen(false)}>Referencias</a>
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
            <div className="bio-hero-overlay" />
            <div className="bio-hero-container">
                <div className="bio-hero-content">
                    <h1 className="bio-hero-title">Diplomado en Bio-Construcción</h1>
                    <p className="bio-hero-subtitle">
                        Teórico-práctico: Maloca y Glampings con guadua, bahareque, tapia pisada, adobe y techos verdes.
                    </p>
                    <div className="bio-hero-badge-container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
                        <span className="bio-badge-pill">📅 4 Meses</span>
                        <span className="bio-badge-pill">📆 16 Semanas</span>
                        <span className="bio-badge-pill">⏱️ 640 Horas Totales</span>
                        <span className="bio-badge-pill">📖 160h Teoría (25%)</span>
                        <span className="bio-badge-pill">🔨 480h Práctica (75%)</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ProjectSpecsSection() {
    return (
        <section className="bio-questions">
            <div className="bio-container">
                <div className="bio-questions-card">
                    <h3>Ficha Técnica del Proyecto Autorizado</h3>
                    <p className="bio-questions-intro">Especificaciones técnicas finales y planeación de la obra en Yacuanquer, Nariño:</p>
                    <div className="bio-questions-grid">
                        <div className="bio-q-item">
                            <span className="bio-q-icon">👥</span>
                            <h4>Público Objetivo</h4>
                            <p>Dirigido a Estudiantes/Profesionales (Arquitectos/Ingenieros) y Constructores locales, creando un espacio de co-creación y capacitación real.</p>
                        </div>
                        <div className="bio-q-item">
                            <span className="bio-q-icon">📍</span>
                            <h4>Lugar de Desarrollo</h4>
                            <p>Desarrollado in situ en Yacuanquer, Nariño (altitud 2,600 msnm). Adaptación bioclimática contra heladas y protección de vientos.</p>
                        </div>
                        <div className="bio-q-item">
                            <span className="bio-q-icon">🏗️</span>
                            <h4>Escala de Obra (1:1)</h4>
                            <p>Construcción real a escala 1:1 de una Maloca comunal y Glampings habitacionales en estructura de Guadua y muros mixtos.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ScheduleSection() {
    const [activeFilter, setActiveFilter] = useState('all');
    const [expandedWeeks, setExpandedWeeks] = useState({});

    const toggleWeek = (weekNum) => {
        setExpandedWeeks(prev => ({
            ...prev,
            [weekNum]: !prev[weekNum]
        }));
    };

    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
    };

    const filteredWeeks = WEEKS_DATA.filter(week => {
        if (activeFilter === 'all') return true;
        return week.categoria === activeFilter;
    });

    return (
        <section className="bio-schedule" id="cronograma">
            <div className="bio-container">
                <div className="bio-section-header">
                    <h2 className="bio-section-title">Cronograma del Programa</h2>
                    <p className="bio-section-desc">4 meses dividido en 16 semanas organizadas en 5 fases progresivas — haz clic en cada semana para ver detalles.</p>
                </div>

                <div className="bio-filters">
                    <button className={`bio-filter-pill ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => handleFilterChange('all')}>Todas</button>
                    <button className={`bio-filter-pill ${activeFilter === 'fase1' ? 'active' : ''}`} onClick={() => handleFilterChange('fase1')}>Fase 1: Teoría</button>
                    <button className={`bio-filter-pill ${activeFilter === 'fase2' ? 'active' : ''}`} onClick={() => handleFilterChange('fase2')}>Fase 2: Materiales</button>
                    <button className={`bio-filter-pill ${activeFilter === 'fase3' ? 'active' : ''}`} onClick={() => handleFilterChange('fase3')}>Fase 3: Estructura</button>
                    <button className={`bio-filter-pill ${activeFilter === 'fase4' ? 'active' : ''}`} onClick={() => handleFilterChange('fase4')}>Fase 4: Envolventes</button>
                    <button className={`bio-filter-pill ${activeFilter === 'fase5' ? 'active' : ''}`} onClick={() => handleFilterChange('fase5')}>Fase 5: Experimental</button>
                </div>

                {/* Resumen General de Fases y Horas de Ejecución */}
                <div className="bio-phases-summary-grid" style={{ marginBottom: '2.5rem' }}>
                    <div className="bio-phase-summary-item">
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--bio-accent-green)', marginBottom: '0.3rem' }}>Fase 1: Diseño</div>
                        <div style={{ fontFamily: 'var(--bio-font-title)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--bio-text-title)', marginBottom: '0.3rem' }}>2 Semanas (~0.5 Mes)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--bio-text-secondary)', fontWeight: 600 }}>48h Teoría / 32h Práctica (80h)</div>
                    </div>
                    <div className="bio-phase-summary-item">
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--bio-accent-earth)', marginBottom: '0.3rem' }}>Fase 2: Materiales</div>
                        <div style={{ fontFamily: 'var(--bio-font-title)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--bio-text-title)', marginBottom: '0.3rem' }}>3 Semanas (~0.75 Mes)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--bio-text-secondary)', fontWeight: 600 }}>24h Teoría / 96h Práctica (120h)</div>
                    </div>
                    <div className="bio-phase-summary-item">
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--bio-accent-gold)', marginBottom: '0.3rem' }}>Fase 3: Estructuras</div>
                        <div style={{ fontFamily: 'var(--bio-font-title)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--bio-text-title)', marginBottom: '0.3rem' }}>4 Semanas (1.0 Mes)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--bio-text-secondary)', fontWeight: 600 }}>32h Teoría / 128h Práctica (160h)</div>
                    </div>
                    <div className="bio-phase-summary-item">
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--bio-accent-earth)', marginBottom: '0.3rem' }}>Fase 4: Envolventes</div>
                        <div style={{ fontFamily: 'var(--bio-font-title)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--bio-text-title)', marginBottom: '0.3rem' }}>4 Semanas (1.0 Mes)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--bio-text-secondary)', fontWeight: 600 }}>32h Teoría / 128h Práctica (160h)</div>
                    </div>
                    <div className="bio-phase-summary-item">
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--bio-accent-green)', marginBottom: '0.3rem' }}>Fase 5: Experimental</div>
                        <div style={{ fontFamily: 'var(--bio-font-title)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--bio-text-title)', marginBottom: '0.3rem' }}>3 Semanas (~0.75 Mes)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--bio-text-secondary)', fontWeight: 600 }}>24h Teoría / 96h Práctica (120h)</div>
                    </div>
                </div>

                <div className="bio-timeline">
                    {filteredWeeks.map((w) => {
                        const isExpanded = !!expandedWeeks[w.numero];
                        return (
                            <div key={w.numero} className={`bio-timeline-card ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleWeek(w.numero)}>
                                <div className="bio-card-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span className="bio-week-circle">S{w.numero}</span>
                                        <div>
                                            <h4>{w.titulo}</h4>
                                            <span className="bio-week-phase-label">{w.fase}</span>
                                        </div>
                                    </div>
                                    <span className="bio-arrow-icon">{isExpanded ? '▲' : '▼'}</span>
                                </div>

                                {isExpanded && (
                                    <div className="bio-card-details">
                                        <p style={{ color: 'var(--bio-text-secondary)', marginBottom: '1.2rem', fontSize: '0.9rem' }}>
                                            {w.descripcion}
                                        </p>
                                        <div className="bio-details-grid">
                                            <div className="bio-detail-box bio-detail-box--teoria">
                                                <h5>📖 Teoría</h5>
                                                <p>{w.teoria}</p>
                                            </div>
                                            <div className="bio-detail-box bio-detail-box--practica">
                                                <h5>🔨 Práctica</h5>
                                                <p>{w.practica}</p>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--bio-accent-gold)', fontWeight: 600 }}>
                                            Duración estimada: {w.duracion}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

const GALLERY_ITEMS = [
    { title: "Guadua Angustifolia", img: "/images/guadua_construccion.png" },
    { title: "Tapia Pisada y Adobe", img: "/images/tapia_pisada_muro.png" },
    { title: "Techos y Fachadas Verdes", img: "/images/techo_verde_glamping.png" }
];

const REFERENCES = [
    { title: "Referencia Estructura Tipo Maloca", img: "/images/maloca_referencia.png" },
    { title: "Referencia Glamping Eco-Turístico", img: "/images/glamping_referencia.png" }
];

function GallerySection() {
    return (
        <section className="bio-gallery" id="galeria">
            <div className="bio-container">
                <div className="bio-gallery-row">
                    {GALLERY_ITEMS.map((item, idx) => (
                        <div key={idx} className="bio-gallery-card">
                            <img src={item.img} alt={item.title} />
                            <div className="bio-gallery-card-label">{item.title}</div>
                        </div>
                    ))}
                </div>
                <div className="bio-references-row" style={{ marginTop: '2rem' }}>
                    {REFERENCES.map((item, idx) => (
                        <div key={idx} className="bio-reference-card">
                            <img src={item.img} alt={item.title} />
                            <div className="bio-reference-card-label">{item.title}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ContactSection() {
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', perfil: '', nivel: '', mensaje: '' });
    const [interests, setInterests] = useState({ guadua: false, tierra: false, vegetacion: false, bioclimatica: false });
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
        const customMessage = `
--- REGISTRO DIPLOMADO BIO-CONSTRUCCIÓN ---
Perfil: ${formData.perfil}
Nivel: ${formData.nivel}
Intereses: ${activeInterests.length > 0 ? activeInterests.join(', ') : 'Ninguno'}
Mensaje: ${formData.mensaje || 'Sin comentarios adicionales'}
        `.trim();

        const tracking = captureTrackingParams();
        const payload = {
            nombre: formData.nombre,
            telefono: formData.telefono,
            email: formData.email,
            servicio: 'otro',
            ciudad: 'Yacuanquer',
            mensaje: customMessage,
            ...tracking,
            landing_page: '/landing/bioconstruccion'
        };

        try {
            await fetch('/api/marketing/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            setSubmitted(true);
        } catch (err) {
            console.error('Lead post error:', err);
            setSubmitted(true);
        } finally {
            setLoading(false);
            const waMsg = encodeURIComponent(
                `Hola Kalarti! Me registré al Diplomado en Bio-Construcción.\n` +
                `Nombre: ${formData.nombre}\n` +
                `Perfil: ${formData.perfil}\n` +
                `Nivel: ${formData.nivel}`
            );
            window.open(`https://wa.me/573177725056?text=${waMsg}`, '_blank');
        }
    };

    return (
        <section className="bio-contact-section" id="registro">
            <div className="bio-container">
                <div className="bio-contact-grid-layout">
                    <div className="bio-form-wrapper-card">
                        {!submitted ? (
                            <form className="bio-registration-form-box" onSubmit={handleSubmit}>
                                <h3>Formulario de Inscripción</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--bio-text-secondary)', marginBottom: '1.5rem' }}>
                                    Completa la encuesta para reservar tu cupo y coordinar tu cuadrilla técnica de trabajo.
                                </p>
                                
                                <div className="bio-input-group">
                                    <label htmlFor="nombre">Nombre Completo *</label>
                                    <input type="text" id="nombre" name="nombre" required placeholder="Ingresa tu nombre completo" value={formData.nombre} onChange={handleChange} />
                                </div>

                                <div className="bio-input-row">
                                    <div className="bio-input-group">
                                        <label htmlFor="telefono">WhatsApp / Celular *</label>
                                        <input type="tel" id="telefono" name="telefono" required placeholder="+57 300 123 4567" value={formData.telefono} onChange={handleChange} />
                                    </div>
                                    <div className="bio-input-group">
                                        <label htmlFor="email">Email</label>
                                        <input type="email" id="email" name="email" placeholder="ejemplo@correo.com" value={formData.email} onChange={handleChange} />
                                    </div>
                                </div>

                                <div className="bio-input-row">
                                    <div className="bio-input-group">
                                        <label htmlFor="perfil">Perfil Profesional *</label>
                                        <select id="perfil" name="perfil" required value={formData.perfil} onChange={handleChange}>
                                            <option value="">Selecciona tu perfil</option>
                                            <option value="estudiante">Estudiante Universitario</option>
                                            <option value="profesional">Profesional del Sector</option>
                                            <option value="constructor">Constructor Local</option>
                                            <option value="artesano">Artesano o Carpintero</option>
                                            <option value="otro">Otro / Entusiasta</option>
                                        </select>
                                    </div>
                                    <div className="bio-input-group">
                                        <label htmlFor="nivel">Conocimiento Previo *</label>
                                        <select id="nivel" name="nivel" required value={formData.nivel} onChange={handleChange}>
                                            <option value="">Selecciona tu nivel</option>
                                            <option value="ninguno">Ninguno (Aprender desde cero)</option>
                                            <option value="basico">Básico (Conceptos teóricos)</option>
                                            <option value="intermedio">Intermedio (Sé hacer maquetas/muros)</option>
                                            <option value="experto">Avanzado (He construido estructuras)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bio-input-group">
                                    <label>Áreas de Mayor Interés</label>
                                    <div className="bio-form-checkbox-row">
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

                                <div className="bio-input-group">
                                    <label htmlFor="mensaje">Comentarios o Preguntas</label>
                                    <textarea id="mensaje" name="mensaje" rows="2" placeholder="Escribe tus inquietudes aquí..." value={formData.mensaje} onChange={handleChange} />
                                </div>

                                <button type="submit" className="bio-btn bio-btn-primary bio-btn-lg bio-btn-full" disabled={loading}>
                                    {loading ? 'Enviando Registro...' : 'Reservar Cupo y Enviar'}
                                </button>
                            </form>
                        ) : (
                            <div className="bio-form-success-box">
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌾</div>
                                <h3>¡Inscripción Recibida con Éxito!</h3>
                                <p>Tus datos han sido registrados en el CRM de Kalarti Constructores.</p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--bio-text-secondary)', marginTop: '8px' }}>
                                    Se ha abierto una conversación en WhatsApp para coordinar los detalles.
                                </p>
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
                        <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Cra 28a No 17-15 Ed. Antonella Of. 401 — Pasto, Nariño</p>
                    </div>
                    <div className="bio-footer-links">
                        <h4>Contacto</h4>
                        <a href="tel:+573177725056">+57 317 772 5056</a>
                        <a href="mailto:consultoria@kalarti.com">consultoria@kalarti.com</a>
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

export default function LandingBioconstruccion() {
    return (
        <div className="bio-landing-page">
            <link rel="stylesheet" href="/landing-bioconstruccion.css" />
            <Navbar />
            <HeroSection />
            <ProjectSpecsSection />
            <ScheduleSection />
            <GallerySection />
            <ContactSection />
            <Footer />
            <a href="https://wa.me/573177725056?text=Hola%20Kalarti!%20Me%20interesa%20el%20Diplomado%20en%20Bio-Construccion%20en%20Yacuanquer."
               className="bio-whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
        </div>
    );
}
