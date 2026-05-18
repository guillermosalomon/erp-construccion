'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function KalartiHub() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

        .hero-bg {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.15) 0%, transparent 40%),
                      radial-gradient(circle at 20% 80%, rgba(51, 65, 85, 0.5) 0%, transparent 40%);
          z-index: 0;
        }

        .hero-content {
          position: relative;
          z-index: 1;
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

        @media (max-width: 768px) {
          .hero-title { font-size: 40px; }
          .hero-actions { flex-direction: column; }
          .nav-links { display: none; }
          .stats-strip { gap: 40px; }
        }
      `}} />

      <nav className="hub-nav">
        <Link href="/" className="nav-brand">
          <div className="nav-logo-k">K</div>
          KALARTI
        </Link>
        <div className="nav-links">
          <a href="#ecosistema">Ecosistema</a>
          <Link href="/landing/construccion">Servicios</Link>
          <Link href="/erp">Marketplace</Link>
          <Link href="/erp" className="btn-erp">Acceso ERP / Login</Link>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section className="hero-section">
          <div className="hero-bg"></div>
          <div className="hero-content">
            <div className="hero-badge">🚀 El Hub de la Construcción</div>
            <h1 className="hero-title">
              Conectamos todo el ecosistema de <span>Construcción y Bienes Raíces</span>
            </h1>
            <p className="hero-desc">
              Kalarti no es solo un software. Es el ecosistema donde clientes, constructores, ferreterías y proveedores se unen para presupuestar, construir y comercializar de manera eficiente.
            </p>
            <div className="hero-actions">
              <Link href="/erp" className="btn-primary">
                Ingresar al ERP / Marketplace ➔
              </Link>
              <Link href="/landing/construccion" className="btn-secondary">
                Ver Servicios de Construcción
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
              <Link href="/erp" className="card-link">
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
              <Link href="/erp" className="card-link">
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
