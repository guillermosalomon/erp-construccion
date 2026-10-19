import Link from 'next/link';

export const metadata = {
  metadataBase: new URL('https://www.kalarti.com'),
  title: 'Territorio, Ingeniería Digital & Bio-Arquitectura | Blog KALARTI',
  description: 'Perspectiva KALARTI: Artículos técnicos, modelación hidrológica de cuencas en 2D, coordinación BIM en Revit MEP y bio-construcción sostenible.',
  keywords: 'blog arquitectura, BIM Revit, bio-construcción, modelación de cuencas, POT Pasto, HEC-RAS 2D, Iber, cálculo estructural, KALARTI',
  alternates: {
    canonical: 'https://www.kalarti.com/blog',
  },
  openGraph: {
    title: 'Territorio, Ingeniería Digital & Bio-Arquitectura | Blog KALARTI',
    description: 'Investigación aplicada, modelación hidrológica 2D, coordinación BIM (Arquitectura, Estructura, MEP) y bio-construcción sostenible.',
    type: 'website',
    url: 'https://www.kalarti.com/blog',
    siteName: 'KALARTI Constructores y Consultores',
    locale: 'es_CO',
    images: [
      {
        url: 'https://www.kalarti.com/blog/images/og/pot-pasto-card.jpg',
        secureUrl: 'https://www.kalarti.com/blog/images/og/pot-pasto-card.jpg',
        width: 960,
        height: 504,
        alt: 'Territorio, Ingeniería Digital & Bio-Arquitectura — Blog KALARTI',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@kalarti',
    creator: '@kalarti',
    title: 'Territorio, Ingeniería Digital & Bio-Arquitectura | Blog KALARTI',
    description: 'Investigación aplicada, modelación hidrológica 2D, coordinación BIM y bio-construcción sostenible.',
    images: ['https://www.kalarti.com/blog/images/og/pot-pasto-card.jpg'],
  },
};

export default function BlogLayout({ children }) {
  return (
    <div className="blog-light-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg-white: #ffffff;
          --bg-light: #f8fafc;
          --bg-subtle: #f1f5f9;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --text-subtle: #94a3b8;
          --border-color: #e2e8f0;
          --border-subtle: #edf2f7;
          --primary-navy: #0f172a;
          --primary-gold: #f59e0b;
          --primary-gold-hover: #d97706;
          --primary-blue: #2563eb;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: var(--bg-white);
          color: var(--text-main);
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        .clean-blog-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color);
          padding: 16px 32px;
        }

        .clean-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .clean-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: var(--primary-navy);
          font-weight: 800;
          font-size: 20px;
          letter-spacing: -0.5px;
        }

        .clean-brand-logo {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          object-fit: contain;
        }

        .clean-brand-badge {
          background: var(--bg-subtle);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }

        .clean-nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .clean-nav-links a {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: color 0.15s ease;
        }

        .clean-nav-links a:hover {
          color: var(--primary-navy);
        }

        .clean-btn-cta {
          background: var(--primary-navy);
          color: #ffffff !important;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600 !important;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .clean-btn-cta:hover {
          background: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }

        .clean-content-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px 80px 24px;
        }

        /* Footer */
        .clean-footer {
          background: var(--bg-light);
          border-top: 1px solid var(--border-color);
          padding: 60px 32px 40px 32px;
          color: var(--text-muted);
        }

        .clean-footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 48px;
        }

        .clean-footer-col h4 {
          color: var(--primary-navy);
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 16px;
          letter-spacing: -0.2px;
        }

        .clean-footer-col ul {
          list-style: none;
        }

        .clean-footer-col li {
          margin-bottom: 10px;
        }

        .clean-footer-col a {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.15s;
        }

        .clean-footer-col a:hover {
          color: var(--primary-navy);
        }

        .clean-footer-bottom {
          max-width: 1200px;
          margin: 0 auto;
          padding-top: 24px;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: var(--text-subtle);
        }

        @media (max-width: 840px) {
          .clean-nav-links { display: none; }
          .clean-footer-inner { grid-template-columns: 1fr; gap: 32px; }
          .clean-footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}} />

      <header className="clean-blog-header">
        <div className="clean-header-inner">
          <Link href="/blog" className="clean-brand">
            <img src="/icon.png" alt="Kalarti Logo" className="clean-brand-logo" />
            <span>KALARTI</span>
            <span className="clean-brand-badge">Blog & Insights</span>
          </Link>
          <nav className="clean-nav-links">
            <Link href="/">Ecosistema</Link>
            <Link href="/blog">Todos los Artículos</Link>
            <Link href="/blog/categoria/arquitectonico">BIM & Arquitectura</Link>
            <Link href="/blog/categoria/bio-construccion">Bio-Construcción 🌿</Link>
            <Link href="/blog/categoria/estructural">Estructural</Link>
            <a 
              href="https://wa.me/573152717932?text=Hola,%20quisiera%20solicitar%20asesor%C3%ADa%20sobre%20un%20proyecto" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="clean-btn-cta"
            >
              Contactar Especialista
            </a>
          </nav>
        </div>
      </header>

      <main className="clean-content-container">
        {children}
      </main>

      <footer className="clean-footer">
        <div className="clean-footer-inner">
          <div className="clean-footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <img src="/icon.png" alt="Kalarti" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
              <strong style={{ color: 'var(--primary-navy)', fontSize: '18px' }}>KALARTI S.A.S.</strong>
            </div>
            <p style={{ fontSize: '14px', lineHeight: 1.6, maxWidth: '340px' }}>
              Firma consultora y constructora especializada en Coordinación BIM 5D, Diseño Arquitectónico, Estructuras en Guadua, Ingeniería Estructural e Hidrosanitaria.
            </p>
          </div>
          <div className="clean-footer-col">
            <h4>Disciplinas & Especialistas</h4>
            <ul>
              <li><Link href="/blog/categoria/arquitectonico">BIM Management (Arq. Guillermo Salomón)</Link></li>
              <li><Link href="/blog/categoria/bio-construccion">Bio-Construcción (Arq. Guillermo Salomón)</Link></li>
              <li><Link href="/blog/categoria/estructural">Cálculo Estructural (Ing. Sandra Paz)</Link></li>
              <li><Link href="/blog/categoria/hidrosanitario">Redes HDS & RCI (Ing. Ana Garcés)</Link></li>
            </ul>
          </div>
          <div className="clean-footer-col">
            <h4>Landings Geo-SEO</h4>
            <ul>
              <li><Link href="/landing/bio-construccion-guadua-eje-cafetero">Eje Cafetero — Bio-Construcción</Link></li>
              <li><Link href="/landing/calculo-estructural-bogota">Bogotá — Cálculo Estructural</Link></li>
              <li><Link href="/landing/diseno-arquitectonico-costa-rica">Costa Rica — Luxury Architecture</Link></li>
              <li><Link href="/landing/construccion">Servicios Generales</Link></li>
            </ul>
          </div>
          <div className="clean-footer-col">
            <h4>Contacto Directo</h4>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>💬 WhatsApp: +57 315 271 7932</p>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>📍 Cra 28a No 17 15 Ed. Antonella Of. 401</p>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>🌐 www.kalarti.com</p>
            <p style={{ fontSize: '13px', marginTop: '12px' }}>
              <Link href="/privacidad" style={{ color: 'var(--primary-navy)', fontWeight: 600, textDecoration: 'underline' }}>
                Política de Privacidad, Habeas Data y Cookies
              </Link>
            </p>
          </div>
        </div>
        <div className="clean-footer-bottom">
          <p>© 2026 KALARTI Constructores & Consultores S.A.S. Todos los derechos reservados.</p>
          <p>
            Publicaciones técnicas elaboradas por el equipo de arquitectura e ingeniería •{' '}
            <Link href="/privacidad" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
              Privacidad y Cookies (Ley 1581)
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
