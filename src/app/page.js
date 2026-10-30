'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function KalartiHub() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeAffiliation, setActiveAffiliation] = useState('talento');
  const [footerForm, setFooterForm] = useState({ nombre: '', contacto: '', mensaje: '' });
  const [footerSending, setFooterSending] = useState(false);
  const [footerSent, setFooterSent] = useState(false);
  const audioRef = useRef(null);
  const userPausedRef = useRef(false);

  const AFFILIATION_ITEMS = [
    {
      id: 'talento',
      title: 'Red de Talento',
      summary: 'Vinculación sin costo para profesionales, ingenieros, arquitectos, maestros y cuadrillas de obra. Postulación directa a licitaciones y contratación verificada por constructoras.',
      manualHref: '/unete',
      applyHref: '/registro?tipo=profesional',
    },
    {
      id: 'proveedores',
      title: 'Red de Proveedores',
      summary: 'Afiliación B2B para fabricantes, distribuidores y proveedores de insumos. Sincronización de precios de materiales con los análisis de precios unitarios (APU) de la región.',
      manualHref: '/proveedores',
      applyHref: '/registro?tipo=proveedor',
    },
    {
      id: 'comercio',
      title: 'Activar Comercio y POS',
      summary: 'Sistema integral de punto de venta (POS), control de inventario multi-bodega, facturación y catálogo en el Marketplace para ferreterías y depósitos de materiales.',
      manualHref: '/comercio',
      applyHref: '/registro?tipo=comercio',
    },
    {
      id: 'planes',
      title: 'Planes y Suscripciones ERP',
      summary: 'Licenciamiento para constructoras y contratistas: presupuestos NSR-10, control financiero y programación 4D/5D, compras, almacén y acceso directo a la Red de Talento.',
      manualHref: '/planes',
      applyHref: '/planes',
    },
    {
      id: 'inmueble',
      title: 'Publicar Inmueble',
      summary: 'Dos modalidades con aislamiento de privacidad (Ley 1581): Propietarios particulares con asesoría integral, promoción con nuestros corredores y seguimiento de leads (comisión 3% por venta); e Inmobiliarias con administración de cartera, CRM de prospectos y múltiples perfiles de corredores (comisión 0.3% por venta).',
      manualHref: '/publicar-inmueble',
      applyHref: '/publicar-inmueble',
    },
  ];

  const handleFooterLead = async (e) => {
    e.preventDefault();
    const nombre = footerForm.nombre.trim();
    const contacto = footerForm.contacto.trim();
    const mensaje = footerForm.mensaje.trim() || 'Consulta desde el footer corporativo';
    if (!nombre || !contacto) return;
    setFooterSending(true);

    // 1. Guardar copia del lead en la base de datos
    try {
      await fetch('/api/marketing/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email: contacto.includes('@') ? contacto : '',
          telefono: !contacto.includes('@') ? contacto : '',
          origen: 'footer_home_kalarti',
          notas: `Consulta enviada a WhatsApp (+57 317 772 5056): ${mensaje}`,
        }),
      });
    } catch {
      // tolerante a desconexión
    }

    // 2. Redirigir y enviar la solicitud a WhatsApp al teléfono de contacto (+57 317 772 5056)
    const waText = `Hola KALARTI, solicito consultoría:\n\n• Nombre: ${nombre}\n• Contacto: ${contacto}\n• Mensaje: ${mensaje}`;
    const waUrl = `https://wa.me/573177725056?text=${encodeURIComponent(waText)}`;
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    setFooterSent(true);
    setFooterForm({ nombre: '', contacto: '', mensaje: '' });
    setFooterSending(false);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      const sy = window.scrollY;
      setScrolled(sy > 50);
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(sy);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = false;
    audio.volume = 0.65;

    const detachFallback = () => {
      window.removeEventListener('pointerdown', handleUnlock, true);
      window.removeEventListener('touchstart', handleUnlock, true);
      window.removeEventListener('touchend', handleUnlock, true);
      window.removeEventListener('click', handleUnlock, true);
      window.removeEventListener('keydown', handleUnlock, true);
    };

    const tryPlayUnmuted = () => {
      if (!audio || userPausedRef.current) return;
      audio.muted = false;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          detachFallback();
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    };

    const handleUnlock = (e) => {
      if (userPausedRef.current) return;
      if (e && e.target && typeof e.target.closest === 'function' && e.target.closest('.audio-player-pill')) {
        return;
      }
      if (audio && (audio.paused || audio.muted)) {
        tryPlayUnmuted();
      }
    };

    // Reproducir apenas el primer fragmento de audio esté disponible (sin esperar a descargar todo el archivo)
    tryPlayUnmuted();
    audio.addEventListener('loadeddata', tryPlayUnmuted, { once: true });
    audio.addEventListener('canplay', tryPlayUnmuted, { once: true });

    // Fase de captura (true) para respuesta inmediata en el primer micro-evento si el navegador bloqueó el arranque en frío
    window.addEventListener('pointerdown', handleUnlock, true);
    window.addEventListener('touchstart', handleUnlock, true);
    window.addEventListener('touchend', handleUnlock, true);
    window.addEventListener('click', handleUnlock, true);
    window.addEventListener('keydown', handleUnlock, true);

    return () => {
      audio.removeEventListener('loadeddata', tryPlayUnmuted);
      audio.removeEventListener('canplay', tryPlayUnmuted);
      detachFallback();
    };
  }, []);

  const toggleMusic = (e) => {
    if (e) {
      e.stopPropagation();
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      userPausedRef.current = true;
      audio.pause();
      setIsPlaying(false);
    } else {
      userPausedRef.current = false;
      audio.muted = false;
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  };

  return (
    <div className="hub-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --navy-900: #0f172a;
          --navy-800: #1e293b;
          --navy-700: #334155;
          --gold-500: #f59e0b;
          --gold-400: #fbbf24;
          --gold-600: #d97706;
          --text-light: #f8fafc;
          --text-muted: #94a3b8;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: var(--navy-900);
          color: var(--text-light);
          overflow-x: hidden;
        }

        .hub-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 100;
          transition: all 0.3s ease;
          background: ${scrolled ? 'rgba(15, 23, 42, 0.95)' : 'transparent'};
          backdrop-filter: ${scrolled ? 'blur(10px)' : 'none'};
          border-bottom: ${scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none'};
        }

        .nav-brand {
          font-family: var(--font-oswald), 'Oswald', sans-serif;
          font-size: 26px;
          font-weight: 400;
          color: white;
          text-decoration: none;
          letter-spacing: 0.186em;
          display: flex;
          align-items: center;
          gap: 12px;
          text-transform: uppercase;
        }

        .nav-logo-k {
          background: var(--gold-500);
          color: var(--navy-900);
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px;
          font-weight: 900;
        }

        .nav-links {
          display: flex;
          gap: 32px;
          align-items: center;
        }

        .nav-links a {
          color: var(--text-light);
          text-decoration: none;
          font-weight: 500;
          font-size: 15px;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: var(--gold-400); }

        .btn-erp {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          padding: 8px 20px;
          border-radius: 20px;
          backdrop-filter: blur(5px);
        }
        .btn-erp:hover {
          background: rgba(255,255,255,0.2);
        }

        .hero-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 0 40px;
          position: relative;
          overflow: hidden;
          clip-path: inset(0);
          -webkit-clip-path: inset(0);
        }

        .hero-parallax-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          background-image: url('/Banner%20principal.jpg');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          pointer-events: none;
          z-index: 0;
          will-change: transform;
        }

        @media (max-width: 768px) {
          .hero-parallax-bg {
            background-image: url('/Banner%20principal%20responsivo.jpg');
            background-position: center center;
            will-change: transform;
          }
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 800px;
          margin-top: 80px;
          will-change: transform;
        }

        .hero-title {
          font-size: 64px;
          line-height: 1.1;
          font-weight: 800;
          margin-bottom: 24px;
          color: #ffffff;
        }

        .hero-title .text-white-part {
          text-shadow: 0 3px 16px rgba(0, 0, 0, 0.75), 0 1px 4px rgba(0, 0, 0, 0.9);
        }

        .hero-title .text-gold-part {
          color: #fbbf24;
          font-weight: 900;
          text-shadow: 0 3px 16px rgba(0, 0, 0, 0.85), 0 1px 4px rgba(0, 0, 0, 0.95);
        }

        .hero-desc {
          font-size: 20px;
          color: #f8fafc;
          line-height: 1.6;
          margin-bottom: 40px;
          max-width: 600px;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.85), 0 1px 3px rgba(0, 0, 0, 0.95);
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .btn-primary {
          background: rgba(245, 158, 11, 0.22);
          color: #fde047;
          padding: 16px 32px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 16px;
          border: 1.5px solid rgba(251, 191, 36, 0.65);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
          transition: all 0.25s ease;
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }
        .btn-primary:hover {
          background: rgba(245, 158, 11, 0.45);
          color: #ffffff;
          border-color: rgba(251, 191, 36, 0.95);
          transform: translateY(-2px);
          box-shadow: 0 10px 36px rgba(245, 158, 11, 0.35);
        }

        .btn-secondary {
          background: rgba(255,255,255,0.05);
          color: white;
          padding: 16px 32px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }

        /* Ecosystem Grid */
        .ecosystem-section {
          padding: 100px 40px;
          background: var(--navy-800);
          position: relative;
        }

        .section-header {
          text-align: center;
          margin-bottom: 60px;
        }
        .section-header h2 {
          font-size: 40px;
          margin-bottom: 16px;
        }
        .section-header p {
          color: var(--text-muted);
          font-size: 18px;
          max-width: 600px;
          margin: 0 auto;
        }

        .grid-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 40px 30px;
          transition: transform 0.3s, background 0.3s;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 4px;
          background: var(--gold-500);
          transform: scaleX(0);
          transition: transform 0.3s;
          transform-origin: left;
        }

        .card:hover {
          background: rgba(255,255,255,0.05);
          transform: translateY(-5px);
        }
        .card:hover::before {
          transform: scaleX(1);
        }

        .card-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .card-desc {
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .card-link {
          color: var(--gold-400);
          text-decoration: none;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Stats Strip */
        .stats-strip {
          background: var(--gold-500);
          padding: 60px 40px;
          color: var(--navy-900);
          display: flex;
          justify-content: center;
          gap: 80px;
          flex-wrap: wrap;
        }
        .stat-item { text-align: center; }
        .stat-num { font-size: 48px; font-weight: 900; line-height: 1; margin-bottom: 8px; }
        .stat-label { font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }

        .nav-burger {
          display: none;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          width: 44px; height: 44px;
          border-radius: 10px;
          font-size: 22px;
          cursor: pointer;
        }

        .btn-cotizador {
          background: rgba(16, 185, 129, 0.22);
          color: #6ee7b7;
          padding: 16px 32px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 16px;
          border: 1.5px solid rgba(52, 211, 153, 0.65);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
          display: inline-flex;
          align-items: center;
          gap: 12px;
          transition: all 0.25s ease;
        }
        .btn-cotizador:hover {
          background: rgba(16, 185, 129, 0.45);
          color: #ffffff;
          border-color: rgba(52, 211, 153, 0.95);
          transform: translateY(-2px);
          box-shadow: 0 10px 36px rgba(16, 185, 129, 0.35);
        }

        .card-highlight { border: 1px solid rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.06); }
        .card-highlight::before { background: #10b981; }

        /* Floating Music Player Pill */
        .audio-player-pill {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 99;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(245, 158, 11, 0.45);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 8px 16px;
          border-radius: 9999px;
          color: white;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.25s ease;
          user-select: none;
        }
        .audio-player-pill:hover {
          background: rgba(30, 41, 59, 0.98);
          border-color: #f59e0b;
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(245, 158, 11, 0.3);
        }
        .audio-eq-bars {
          display: inline-flex;
          align-items: flex-end;
          gap: 3px;
          height: 15px;
          width: 15px;
        }
        .audio-bar {
          width: 3px;
          background: #fbbf24;
          border-radius: 2px;
          height: 4px;
          transition: height 0.2s ease;
        }
        .audio-bar.playing:nth-child(1) {
          animation: audioBarAnim 0.7s ease-in-out infinite alternate;
        }
        .audio-bar.playing:nth-child(2) {
          animation: audioBarAnim 0.5s ease-in-out 0.15s infinite alternate;
        }
        .audio-bar.playing:nth-child(3) {
          animation: audioBarAnim 0.8s ease-in-out 0.3s infinite alternate;
        }
        @keyframes audioBarAnim {
          0% { height: 3px; }
          100% { height: 15px; }
        }
        .audio-text {
          font-size: 13px;
          font-weight: 600;
          color: #f8fafc;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .audio-track-name {
          color: #fbbf24;
          font-weight: 700;
        }
        .audio-status-tag {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        @media (max-width: 768px) {
          .audio-player-pill {
            bottom: 16px;
            left: 14px;
            padding: 7px 12px;
          }
          .audio-status-tag {
            display: none;
          }
          .hub-nav { padding: 14px 20px; background: rgba(15, 23, 42, 0.95); }
          .hero-section { padding: 0 20px; }
          .hero-title { font-size: 40px; }
          .hero-actions { flex-direction: column; }
          .hero-actions a { justify-content: center; text-align: center; }
          .nav-burger { display: flex; align-items: center; justify-content: center; }
          .nav-links {
            display: none;
            position: absolute;
            top: 100%; left: 0; right: 0;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            background: rgba(15, 23, 42, 0.98);
            border-bottom: 1px solid rgba(255,255,255,0.08);
            padding: 8px 20px 20px;
          }
          .nav-links.open { display: flex; }
          .nav-links a { padding: 14px 4px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 16px; }
          .nav-links .btn-erp { margin-top: 12px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.2); }
          .stats-strip { gap: 40px; }
          .ecosystem-section { padding: 70px 20px; }
        }
      `}} />

      <link rel="preload" href="/shefa-flow.mp3" as="audio" type="audio/mpeg" />

      {/* Audio de Fondo: Shefa Flow */}
      <audio
        ref={audioRef}
        src="/shefa-flow.mp3"
        autoPlay
        loop
        preload="auto"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Floating Ambient Music Control Pill */}
      <button
        type="button"
        onClick={toggleMusic}
        className="audio-player-pill"
        title={isPlaying ? 'Pausar música ambiental (Shefa Flow)' : 'Activar música ambiental (Shefa Flow)'}
        aria-label="Control de música ambiental Shefa Flow"
      >
        <div className="audio-eq-bars" aria-hidden="true">
          <span className={`audio-bar ${isPlaying ? 'playing' : ''}`} style={{ height: isPlaying ? undefined : '4px' }} />
          <span className={`audio-bar ${isPlaying ? 'playing' : ''}`} style={{ height: isPlaying ? undefined : '10px' }} />
          <span className={`audio-bar ${isPlaying ? 'playing' : ''}`} style={{ height: isPlaying ? undefined : '6px' }} />
        </div>
        <div className="audio-text">
          <span>{isPlaying ? '🔊' : '🔇'}</span>
          <span className="audio-track-name">Shefa Flow</span>
          <span className="audio-status-tag">{isPlaying ? 'En reproducción' : 'Pausa'}</span>
        </div>
      </button>

      <nav className="hub-nav">
        <Link href="/" className="nav-brand">
          <img src="/icon.png" alt="Kalarti Logo" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }} />
          KALARTI
        </Link>
        <div className={`nav-links ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}>
          <a href="#ecosistema">Ecosistema</a>
          <Link href="/blog">Blog Técnico</Link>
          <Link href="/landing/construccion">Servicios</Link>
          <Link href="/propiedades">Inmuebles</Link>
          <Link href="/marketplace">Marketplace B2B</Link>
          <Link href="/erp" className="btn-erp">Acceso ERP / Login</Link>
        </div>
        <button
          className="nav-burger"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      <main>
        {/* HERO */}
        <section className="hero-section">
          <div
            className="hero-parallax-bg"
            style={{
              transform: `translate3d(0, -${scrollY * 0.15}px, 0) scale(${1 + Math.min(scrollY * 0.00025, 0.1)})`
            }}
          />
          <div
            className="hero-content"
            style={{
              transform: `translate3d(0, -${scrollY * 0.22}px, 0)`
            }}
          >
            <h1 className="hero-title">
              <span className="text-white-part">Conectamos todo el ecosistema de </span>
              <span className="text-gold-part">Construcción y Bienes Raíces</span>
            </h1>
            <p className="hero-desc">
              Conectamos clientes, constructores, ferreterías y proveedores para presupuestar, construir y comercializar de manera eficiente.
            </p>
            <div className="hero-actions">
              <Link href="/cotizador" className="btn-cotizador">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="4" y="2" width="16" height="20" rx="3" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="16" y1="14" x2="16" y2="18" />
                  <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
                </svg>
                Cotiza tu obra gratis ➔
              </Link>
              <Link href="/erp" className="btn-primary">
                Ingresar al ERP / Marketplace ➔
              </Link>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="stats-strip">
          <div className="stat-item">
            <div className="stat-num">+150</div>
            <div className="stat-label">Proyectos</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">+5k</div>
            <div className="stat-label">Insumos en Market</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">BIM</div>
            <div className="stat-label">Metodología 5D</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">100%</div>
            <div className="stat-label">Integrado</div>
          </div>
        </section>

        {/* ECOSYSTEM CARDS */}
        <section className="ecosystem-section" id="ecosistema">
          <div className="section-header">
            <h2>Un Ecosistema Integral</h2>
            <p>Descubre cómo Kalarti conecta cada eslabón de la cadena de construcción.</p>
          </div>
          
          <div className="grid-cards">
            {/* Cotizador público */}
            <div className="card card-highlight">
              <h3 className="card-title">Cotizador de Obra Gratis</h3>
              <p className="card-desc">
                Arma el presupuesto de tu proyecto desde el celular con más de 400 APUs verificados, y mira el cronograma de obra con cuadrillas Kalarti asignadas automáticamente.
              </p>
              <Link href="/cotizador" className="card-link">
                Crear mi presupuesto ➔
              </Link>
            </div>

            {/* Blog Técnico & Bio-Construcción */}
            <div className="card">
              <h3 className="card-title">Blog Técnico & Bio-Construcción</h3>
              <p className="card-desc">
                Guías de cálculo sismo-resistente NSR-10, estructuras en Guadua Angustifolia, diseño de interiores, tendencias BIM y más....
              </p>
              <Link href="/blog" className="card-link">
                Leer Blog ➔
              </Link>
            </div>

            {/* Servicios */}
            <div className="card">
              <h3 className="card-title">Servicios y Construcción</h3>
              <p className="card-desc">
                Diseño arquitectónico, modelado BIM 5D, y construcción llave en mano para clientes finales e inversionistas.
              </p>
              <Link href="/landing/construccion" className="card-link">
                Cotizar Proyecto ➔
              </Link>
            </div>

            {/* Marketplace */}
            <div className="card">
              <h3 className="card-title">Marketplace B2B/B2C</h3>
              <p className="card-desc">
                Compra de materiales, alquiler de maquinaria y productos de ferreterías afiliadas directamente desde tus presupuestos.
              </p>
              <Link href="/marketplace" className="card-link">
                Explorar Productos ➔
              </Link>
            </div>

            {/* Proyectos e Inmuebles */}
            <div className="card">
              <h3 className="card-title">Inmuebles en Venta</h3>
              <p className="card-desc">
                Explora el portafolio de proyectos inmobiliarios, casas y apartamentos disponibles desarrollados por la red Kalarti.
              </p>
              <Link href="/propiedades" className="card-link">
                Ver Proyectos ➔
              </Link>
            </div>

            {/* ERP / Afiliados */}
            <div className="card">
              <h3 className="card-title">ERP para Afiliados</h3>
              <p className="card-desc">
                Proveedores, contratistas y ferreterías usan nuestra plataforma para control de obra, inventario y ventas omnicanal.
              </p>
              <Link href="/erp" className="card-link">
                Acceso Plataforma ➔
              </Link>
            </div>
          </div>
        </section>

      </main>
      
      {/* Footer Corporativo KALARTI — Retícula de 5 Columnas sin iconos (únicamente iconos lineales en redes sociales) */}
      <footer className="kalarti-clean-footer">
        <style>{`
          .kalarti-clean-footer {
            background: #070b14;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding: 64px 28px 32px;
            color: #94a3b8;
            font-family: var(--font-main);
          }
          .kalarti-footer-container {
            max-width: 1320px;
            margin: 0 auto;
          }
          .kalarti-footer-grid {
            display: grid;
            grid-template-columns: 1.35fr 1fr 1fr 1.2fr 1.15fr;
            gap: 32px;
            align-items: start;
            padding-bottom: 48px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .kalarti-footer-col-title {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #f8fafc;
            margin: 0 0 18px 0;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .kalarti-aff-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .kalarti-aff-btn {
            width: 100%;
            text-align: left;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            padding: 9px 12px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.18s ease;
          }
          .kalarti-aff-btn:hover,
          .kalarti-aff-btn.active {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(212, 175, 55, 0.55);
            color: #ffffff;
          }
          .kalarti-aff-drawer {
            margin: 4px 0 8px;
            padding: 12px 14px;
            background: rgba(15, 23, 42, 0.75);
            border-left: 2px solid #d4af37;
            font-size: 12px;
            line-height: 1.55;
            color: #cbd5e1;
          }
          .kalarti-aff-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.07);
          }
          .kalarti-aff-apply {
            color: #d4af37;
            font-weight: 700;
            font-size: 12px;
            text-decoration: none;
            letter-spacing: 0.02em;
          }
          .kalarti-aff-apply:hover {
            text-decoration: underline;
          }
          .kalarti-aff-manual {
            color: #94a3b8;
            font-size: 11px;
            text-decoration: underline;
          }
          .kalarti-footer-links {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .kalarti-footer-links a {
            color: #94a3b8;
            text-decoration: none;
            font-size: 13px;
            line-height: 1.45;
            transition: color 0.15s ease;
          }
          .kalarti-footer-links a:hover {
            color: #ffffff;
          }
          .kalarti-contact-text {
            font-size: 12.5px;
            line-height: 1.6;
            color: #94a3b8;
            margin: 0 0 12px 0;
          }
          .kalarti-contact-form {
            display: flex;
            flex-direction: column;
            gap: 7px;
            margin-bottom: 12px;
          }
          .kalarti-contact-input {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 4px;
            padding: 7px 10px;
            color: #f8fafc;
            font-size: 12px;
            font-family: inherit;
          }
          .kalarti-contact-input:focus {
            outline: none;
            border-color: #d4af37;
          }
          .kalarti-contact-submit {
            background: #f8fafc;
            color: #070b14;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            text-align: center;
          }
          .kalarti-contact-direct {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.07);
            font-size: 12px;
          }
          .kalarti-contact-direct a {
            color: #cbd5e1;
            text-decoration: none;
          }
          .kalarti-contact-direct a:hover {
            color: #d4af37;
          }
          .kalarti-social-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
          }
          .kalarti-social-icon {
            width: 34px;
            height: 34px;
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #cbd5e1;
            text-decoration: none;
            transition: border-color 0.18s ease, color 0.18s ease;
          }
          .kalarti-social-icon:hover {
            border-color: #d4af37;
            color: #ffffff;
          }
          .kalarti-brands-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .kalarti-brand-box {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 4px;
            padding: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 54px;
          }
          .kalarti-brand-box img {
            max-width: 100%;
            max-height: 40px;
            object-fit: contain;
            opacity: 0.88;
          }
          .kalarti-legal-bar {
            padding-top: 26px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #64748b;
          }
          .kalarti-legal-bar a {
            color: #cbd5e1;
            text-decoration: underline;
            text-underline-offset: 3px;
          }
          .kalarti-legal-bar a:hover {
            color: #ffffff;
          }
          @media (max-width: 1120px) {
            .kalarti-footer-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
          @media (max-width: 768px) {
            .kalarti-clean-footer {
              padding: 44px 18px 28px;
            }
            .kalarti-footer-grid {
              grid-template-columns: 1fr;
              gap: 28px;
            }
          }
        `}</style>

        <div className="kalarti-footer-container">
          <div className="kalarti-footer-grid">
            {/* COLUMNA 1: Afiliación & Red */}
            <div>
              <h3 className="kalarti-footer-col-title">Afiliación &amp; Red</h3>
              <div className="kalarti-aff-list">
                {AFFILIATION_ITEMS.map((item) => {
                  const isOpen = activeAffiliation === item.id;
                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        className={`kalarti-aff-btn ${isOpen ? 'active' : ''}`}
                        onClick={() => setActiveAffiliation(isOpen ? '' : item.id)}
                      >
                        <span>{item.title}</span>
                        <span style={{ fontSize: 11, color: isOpen ? '#d4af37' : '#64748b' }}>
                          {isOpen ? '−' : '+'}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="kalarti-aff-drawer">
                          <div>{item.summary}</div>
                          <div className="kalarti-aff-actions">
                            <Link href={item.manualHref} className="kalarti-aff-manual">
                              Ver manual y condiciones
                            </Link>
                            <Link href={item.applyHref} className="kalarti-aff-apply">
                              Aplicar ➔
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA 2: Plataforma & Ecosistema */}
            <div>
              <h3 className="kalarti-footer-col-title">Plataforma &amp; Ecosistema</h3>
              <ul className="kalarti-footer-links">
                <li>
                  <Link href="/cotizador">Cotizador de Obra Gratis</Link>
                </li>
                <li>
                  <Link href="/erp">Acceso al ERP</Link>
                </li>
                <li>
                  <Link href="/marketplace">Marketplace B2B/B2C</Link>
                </li>
                <li>
                  <Link href="/propiedades">Portafolio de Inmuebles</Link>
                </li>
                <li>
                  <Link href="/mi-portal">Portal Privado de Perfil</Link>
                </li>
              </ul>
            </div>

            {/* COLUMNA 3: Servicios */}
            <div>
              <h3 className="kalarti-footer-col-title">Servicios</h3>
              <ul className="kalarti-footer-links">
                <li>
                  <Link href="/landing/diseno-estructural-pasto-narino">
                    Diseño Arquitectónico y Modelado BIM 5D
                  </Link>
                </li>
                <li>
                  <Link href="/landing/construccion">Construcción Llave en Mano</Link>
                </li>
                <li>
                  <Link href="/blog">Blog Técnico</Link>
                </li>
              </ul>
            </div>

            {/* COLUMNA 4: Sección de Contacto */}
            <div>
              <h3 className="kalarti-footer-col-title">Contacto</h3>
              <p className="kalarti-contact-text">
                <strong>Sede Principal:</strong> Cra 28a No 17-15 Ed. Antonella Of. 401 - San Juan de Pasto, Nariño — Colombia.
              </p>

              {footerSent ? (
                <div style={{ padding: '10px 12px', border: '1px solid rgba(212,175,55,0.4)', color: '#f8fafc', fontSize: 12, marginBottom: 12 }}>
                  Solicitud enviada a WhatsApp y registrada en nuestro sistema de consultoría.
                </div>
              ) : (
                <form className="kalarti-contact-form" onSubmit={handleFooterLead}>
                  <input
                    type="text"
                    required
                    placeholder="Nombre o razón social"
                    className="kalarti-contact-input"
                    value={footerForm.nombre}
                    onChange={(e) => setFooterForm({ ...footerForm, nombre: e.target.value })}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Correo electrónico o WhatsApp"
                    className="kalarti-contact-input"
                    value={footerForm.contacto}
                    onChange={(e) => setFooterForm({ ...footerForm, contacto: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Asunto o consulta breve"
                    className="kalarti-contact-input"
                    value={footerForm.mensaje}
                    onChange={(e) => setFooterForm({ ...footerForm, mensaje: e.target.value })}
                  />
                  <button type="submit" className="kalarti-contact-submit" disabled={footerSending}>
                    {footerSending ? 'Enviando...' : 'Enviar Consulta a WhatsApp ➔'}
                  </button>
                </form>
              )}

              <div className="kalarti-contact-direct">
                <a href="tel:+573177725056">
                  Contacto: +57 317 772 5056
                </a>
                <a
                  href="https://wa.me/573152717932?text=Hola%20KALARTI%2C%20solicito%20informaci%C3%B3n%20de%20consultor%C3%ADa"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp: +57 315 2717932 ➔
                </a>
                <a href="mailto:gerencia@kalarti.com">
                  gerencia@kalarti.com
                </a>
              </div>
            </div>

            {/* COLUMNA 5: Redes Sociales & Marcas (public/Marcas) */}
            <div>
              <h3 className="kalarti-footer-col-title">Redes Sociales &amp; Marcas</h3>
              <div className="kalarti-social-row">
                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/company/kalarti-constructores-consultores-s-a-s/home/?viewAsMember=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn KALARTI"
                  title="LinkedIn"
                  className="kalarti-social-icon"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
                {/* Instagram */}
                <a
                  href="https://www.instagram.com/kalarti_cyc.sas?obrf=amJzMDYxdHRwcGlr"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram KALARTI"
                  title="Instagram"
                  className="kalarti-social-icon"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/share/18iiaqUgTt/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook KALARTI"
                  title="Facebook"
                  className="kalarti-social-icon"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                {/* X */}
                <a
                  href="https://x.com/KALARTI_SAS"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X KALARTI"
                  title="X"
                  className="kalarti-social-icon"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4l16 16M20 4L4 20" />
                  </svg>
                </a>
                {/* YouTube */}
                <a
                  href="https://www.youtube.com/@KALARTI_SAS"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube KALARTI"
                  title="YouTube"
                  className="kalarti-social-icon"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="4" ry="4" />
                    <polygon points="10 9 15 12 10 15 10 9" />
                  </svg>
                </a>
              </div>

              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Nuestras Marcas
              </div>
              <div className="kalarti-brands-grid">
                {[
                  '/Marcas/KALARTI Portfolio 2026 - Eng..png',
                  '/Marcas/KALARTI Portfolio 2026 - Eng. (1).png',
                  '/Marcas/KALARTI Portfolio 2026 - Eng. (2).png',
                  '/Marcas/KALARTI Portfolio 2026 - Eng. (3).png',
                ].map((src, idx) => (
                  <div key={src} className="kalarti-brand-box">
                    <img src={src} alt={`Marca Grupo Kalarti ${idx + 1}`} loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Franja Inferior (Legales & Copyright) Centrada */}
          <div className="kalarti-legal-bar">
            <div>© 2026 KALARTI S.A.S. Todos los derechos reservados</div>
            <div>
              Tratamiento de Datos Personales y Técnicos:{' '}
              <Link href="/privacidad">
                Política de Privacidad y Cookies conforme a la Ley 1581 de 2012 (Habeas Data)
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
