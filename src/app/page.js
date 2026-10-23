'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function KalartiHub() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

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
    audio.volume = 0.45;

    const playAudio = () => {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    };

    // Intentar reproducir automáticamente (según política de autoplay del navegador)
    playAudio();

    // En navegadores que bloquean autoplay sin interacción previa,
    // se inicia con el primer clic, toque de pantalla o interacción:
    const handleFirstInteraction = () => {
      if (audio.paused) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
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
          font-size: 24px;
          font-weight: 800;
          color: white;
          text-decoration: none;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 12px;
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
        }

        .hero-parallax-bg {
          position: absolute;
          top: -20%;
          left: 0;
          width: 100%;
          height: 140%;
          background-image: url('/Banner%20principal.jpg');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          will-change: transform;
          pointer-events: none;
          z-index: 0;
        }

        @media (max-width: 768px) {
          .hero-parallax-bg {
            background-image: url('/Banner%20principal%20responsivo.jpg');
            background-position: center center;
            top: -15%;
            height: 130%;
          }
        }

        .hero-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.88) 0%,
            rgba(15, 23, 42, 0.65) 50%,
            rgba(15, 23, 42, 0.92) 100%
          ),
          radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.16) 0%, transparent 50%);
          z-index: 1;
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 800px;
          margin-top: 80px;
        }

        .hero-badge {
          display: inline-block;
          padding: 6px 16px;
          background: rgba(245, 158, 11, 0.1);
          color: var(--gold-400);
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 24px;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .hero-title {
          font-size: 64px;
          line-height: 1.1;
          font-weight: 800;
          margin-bottom: 24px;
          background: linear-gradient(to right, #fff, #cbd5e1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-title span {
          background: linear-gradient(to right, var(--gold-400), var(--gold-600));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-desc {
          font-size: 20px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 40px;
          max-width: 600px;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .btn-primary {
          background: var(--gold-500);
          color: var(--navy-900);
          padding: 16px 32px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 700;
          font-size: 16px;
          transition: transform 0.2s, background 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .btn-primary:hover {
          background: var(--gold-400);
          transform: translateY(-2px);
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

        .card-icon {
          font-size: 48px;
          margin-bottom: 24px;
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
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 16px 32px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 700;
          font-size: 16px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: transform 0.2s;
        }
        .btn-cotizador:hover { transform: translateY(-2px); }

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

      {/* Audio de Fondo: Shefa Flow */}
      <audio
        ref={audioRef}
        src="/Shefa%20flow.mpeg"
        loop
        preload="auto"
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
              transform: `translate3d(0, ${scrollY * 0.35}px, 0)`
            }}
          />
          <div className="hero-overlay" />
          <div className="hero-content">
            <div className="hero-badge">🚀 El Hub de la Construcción</div>
            <h1 className="hero-title">
              Conectamos todo el ecosistema de <span>Construcción y Bienes Raíces</span>
            </h1>
            <p className="hero-desc">
              Kalarti no es solo un software. Es el ecosistema donde clientes, constructores, ferreterías y proveedores se unen para presupuestar, construir y comercializar de manera eficiente.
            </p>
            <div className="hero-actions">
              <Link href="/cotizador" className="btn-cotizador">
                🧮 Cotiza tu obra gratis ➔
              </Link>
              <Link href="/erp" className="btn-primary">
                Ingresar al ERP / Marketplace ➔
              </Link>
              <Link href="/blog" className="btn-secondary">
                Explorar Blog Técnico & Bio-Construcción
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
              <div className="card-icon">🧮</div>
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
              <div className="card-icon">📖</div>
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
              <div className="card-icon">🏗️</div>
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
              <div className="card-icon">🛒</div>
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
              <div className="card-icon">🏢</div>
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
              <div className="card-icon">💻</div>
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
      
      {/* Footer minimalista */}
      <footer style={{ background: 'var(--navy-900)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>© 2026 Kalarti Ecosystem. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
