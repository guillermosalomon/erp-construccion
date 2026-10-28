'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function KalartiHub() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const audioRef = useRef(null);
  const userPausedRef = useRef(false);

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
      
      {/* Barra Inferior Ecosistema Kalarti (4 Puntos de Acceso) + Footer Legal */}
      <footer
        style={{
          background: 'linear-gradient(180deg, #070d19 0%, #030712 100%)',
          borderTop: '1px solid rgba(212, 175, 55, 0.22)',
          padding: '64px 24px 36px',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#d4af37',
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                padding: '5px 14px',
                borderRadius: 999,
                marginBottom: 10,
              }}
            >
              Únete al Ecosistema Kalarti
            </span>
            <h2 style={{ color: '#f8fafc', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, margin: '6px 0 8px' }}>
              Elige tu perfil en la red de construcción más completa
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 640, margin: '0 auto' }}>
              Conectamos talento verificado, proveedores de materiales, ferreterías con POS y constructoras BIM 5D en una sola plataforma.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 18,
              marginBottom: 40,
            }}
          >
            {/* 1. Trabaja con Nosotros */}
            <Link
              href="/unete"
              style={{
                textDecoration: 'none',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 14,
                padding: '22px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
                transition: 'transform 0.2s, border-color 0.2s',
              }}
            >
              <div>
                <div style={{ fontSize: 26, marginBottom: 8 }}>👷</div>
                <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                  Trabaja con Nosotros
                </div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  Red de Profesionales y Cuadrillas. Postúlate a licitaciones y obras, obtén tu sello Verificado y conecta con constructoras gratis.
                </p>
              </div>
              <span style={{ color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>
                Ir a Red de Talento ➔
              </span>
            </Link>

            {/* 2. Sé Proveedor Kalarti */}
            <Link
              href="/proveedores"
              style={{
                textDecoration: 'none',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 14,
                padding: '22px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 26, marginBottom: 8 }}>🏭</div>
                <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                  Sé Proveedor Kalarti / Afiliados
                </div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  Publica tus insumos en el Marketplace B2B/B2C y vincula tus precios directamente a los APUs de presupuestos en tu zona.
                </p>
              </div>
              <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 700 }}>
                Afiliarme como Proveedor ➔
              </span>
            </Link>

            {/* 3. Comercio Electrónico y POS */}
            <Link
              href="/comercio"
              style={{
                textDecoration: 'none',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 14,
                padding: '22px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 26, marginBottom: 8 }}>🏪</div>
                <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                  Comercio Electrónico y POS
                </div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  Para ferreterías y depósitos: control de inventarios, facturación POS, CRM, ventas online y conexión automática a obras cercanas.
                </p>
              </div>
              <span style={{ color: '#10b981', fontSize: 13, fontWeight: 700 }}>
                Activar Comercio y POS ➔
              </span>
            </Link>

            {/* 4. Constructoras y Contratistas */}
            <Link
              href="/planes"
              style={{
                textDecoration: 'none',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderRadius: 14,
                padding: '22px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 26, marginBottom: 8 }}>🏗️</div>
                <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                  Constructoras y Contratistas
                </div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  Planes de Cotizador NSR-10, ERP 5D, contratación directa en la Red de Talento y subcontratación de cuadrillas entre obras.
                </p>
              </div>
              <span style={{ color: '#d4af37', fontSize: 13, fontWeight: 700 }}>
                Ver Planes y Suscripciones ➔
              </span>
            </Link>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              paddingTop: 24,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 14,
              fontSize: 13,
            }}
          >
            <div>© 2026 Kalarti Ecosystem — Constructores y Consultores S.A.S. Todos los derechos reservados.</div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <Link href="/registro" style={{ color: '#d4af37', textDecoration: 'none', fontWeight: 700 }}>
                Crear Cuenta Unificada
              </Link>
              <Link href="/mi-portal" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                Portal del Profesional
              </Link>
              <Link href="/privacidad" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                Política de Privacidad y Habeas Data (Ley 1581)
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
