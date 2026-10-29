import Link from 'next/link';
import { PLANES_CONSTRUCTORAS, formatMoney } from '@/lib/planes';

export const metadata = {
  title: 'Manual de Planes y Suscripciones ERP 5D | Kalarti S.A.S.',
  description:
    'Documentación de planes de suscripción para constructoras, contratistas y estudios de arquitectura e ingeniería en Kalarti.',
};

export default function PlanesPage() {
  return (
    <div className="manual-page">
      <style>{`
        .manual-page {
          min-height: 100vh;
          background: #ffffff;
          color: #0f172a;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height: 1.65;
        }
        .manual-nav {
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
          position: sticky;
          top: 0;
          z-index: 40;
          padding: 16px 28px;
        }
        .manual-nav-inner {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
        }
        .manual-brand {
          font-weight: 800;
          font-size: 15px;
          letter-spacing: 0.08em;
          color: #0f172a;
          text-decoration: none;
        }
        .manual-nav-links {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 13px;
        }
        .manual-nav-links a {
          color: #475569;
          text-decoration: none;
          font-weight: 500;
        }
        .manual-btn-dark {
          background: #0f172a;
          color: #ffffff !important;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        }
        .manual-btn-outline {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #0f172a;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        }
        .manual-container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 48px 28px 80px;
        }
        .manual-doc-code {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #64748b;
          margin-bottom: 10px;
        }
        .manual-title {
          font-size: clamp(26px, 3.6vw, 40px);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin: 0 0 16px 0;
          line-height: 1.2;
        }
        .manual-lead {
          font-size: 16px;
          color: #334155;
          max-width: 820px;
          margin: 0 0 32px 0;
        }
        .manual-section {
          border-top: 1px solid #e2e8f0;
          padding: 38px 0;
        }
        .manual-section-header {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-bottom: 24px;
        }
        .manual-section-num {
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .manual-section-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .manual-plans-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }
        .manual-plan-card {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 22px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .manual-plan-card.featured {
          border: 2px solid #0f172a;
        }
        .manual-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }
        .manual-box {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 20px;
        }
        .manual-box h3 {
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 8px 0;
        }
        .manual-box p {
          font-size: 13.5px;
          color: #334155;
          margin: 0;
        }
        @media (max-width: 1024px) {
          .manual-plans-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .manual-grid-3 {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .manual-container {
            padding: 32px 18px 60px;
          }
          .manual-plans-grid {
            grid-template-columns: 1fr;
          }
          .manual-nav {
            padding: 14px 18px;
          }
        }
      `}</style>

      <header className="manual-nav">
        <div className="manual-nav-inner">
          <Link href="/" className="manual-brand">
            KALARTI — PLANES Y SUSCRIPCIONES ERP
          </Link>
          <nav className="manual-nav-links">
            <Link href="/cotizador">Cotizador NSR-10</Link>
            <Link href="/erp">Acceso ERP</Link>
            <Link href="/registro?tipo=constructor" className="manual-btn-dark">
              Registrar Constructora ➔
            </Link>
          </nav>
        </div>
      </header>

      <main className="manual-container">
        <div className="manual-doc-code">Manual de Licenciamiento SaaS — Constructoras, Contratistas e Ingenieros</div>
        <h1 className="manual-title">Planes de Suscripción: Cotizador NSR-10, ERP 5D y Red de Talento</h1>
        <p className="manual-lead">
          Cada empresa constructora o contratista dispone de su propio entorno organizacional aislado (Multi-Tenant RLS)
          para formular presupuestos con más de 400 APUs, controlar programación 4D/5D, compras, bodegas y contratar
          personal verificado en la Red de Talento.
        </p>

        {/* SECCIÓN 01: MATRIZ DE PLANES */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 01</span>
            <h2 className="manual-section-title">Tabla de Planes y Modalidades de Suscripción</h2>
          </div>

          <div className="manual-plans-grid">
            {PLANES_CONSTRUCTORAS.map((plan) => {
              const precioCop = typeof plan.precio === 'object' ? plan.precio?.COP : plan.precio;
              const itemsList = plan.beneficios || plan.incluye || [];
              const ctaLink = plan.ctaHref || `/registro?tipo=constructor&plan=${plan.id || plan.key}`;
              const ctaText = plan.ctaLabel || 'Comenzar Ahora';

              return (
                <div
                  key={plan.id || plan.key}
                  className={`manual-plan-card ${plan.destacado ? 'featured' : ''}`}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: 6 }}>
                      {plan.badge || 'Plan'}
                    </div>
                    <h3 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a' }}>
                      {plan.nombre}
                    </h3>
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 16px 0' }}>
                      {plan.subtitulo || `Acceso completo por ${plan.periodo || 'período'}`}
                    </p>
                    <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
                        {!precioCop ? 'Sin costo' : formatMoney(precioCop)}
                      </span>
                      {precioCop > 0 && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>COP {plan.periodo}</div>
                      )}
                    </div>
                    <ul style={{ paddingLeft: 16, margin: '0 0 22px 0', fontSize: 13, color: '#334155' }}>
                      {itemsList.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: 8 }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={ctaLink}
                    className={plan.destacado ? 'manual-btn-dark' : 'manual-btn-outline'}
                    style={{ textAlign: 'center' }}
                  >
                    {ctaText} ➔
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECCIÓN 02: ARQUITECTURA OPERATIVA */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 02</span>
            <h2 className="manual-section-title">Capacidades B2B para Constructoras Suscritas</h2>
          </div>

          <div className="manual-grid-3">
            <div className="manual-box">
              <h3>01. Aislamiento Multi-Tenant</h3>
              <p>
                Sus proyectos, presupuestos, órdenes de compra, kardex de bodega y nómina pertenecen exclusivamente a su
                organización bajo políticas de seguridad a nivel de fila (RLS).
              </p>
            </div>
            <div className="manual-box">
              <h3>02. Contratación en Red de Talento</h3>
              <p>
                Desde la pestaña de Equipo y Roles de cada obra, filtre profesionales y cuadrillas verificadas por
                municipio y especialidad y asígnelos en un clic.
              </p>
            </div>
            <div className="manual-box">
              <h3>03. Intercambio de Cuadrillas Ociosas</h3>
              <p>
                Publique cuadrillas con disponibilidad temporal entre fases constructivas o subcontrate equipos de otras
                firmas verificadas para optimizar costos fijos.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
